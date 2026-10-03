'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, Marker, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { MAP_BEARING, MAP_PITCH, SKY, type StyleLike, playfulStyle } from '@/lib/map-style';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

let stylePromise: Promise<StyleSpecification | string> | null = null;
const loadStyle = (): Promise<StyleSpecification | string> => {
  stylePromise ??= fetch(STYLE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`style ${response.status}`);
      return response.json() as Promise<StyleLike>;
    })
    .then((style) => playfulStyle(style) as unknown as StyleSpecification)
    .catch((): string => {
      stylePromise = null;
      return STYLE_URL;
    });
  return stylePromise;
};

export interface MapPoint {
  latitude: number;
  longitude: number;
}

export interface MapStop extends MapPoint {
  code: string;
  name: string;
  highlight?: boolean;
}

export interface MapBus extends MapPoint {
  id: string;
  label: string;
  color: string;
  arriving?: boolean;
}

export interface MapRoute {
  path: Array<[number, number]>;
  color: string;
}

export interface LiveMapProps {
  stops: MapStop[];
  route?: MapRoute | null;
  buses: MapBus[];
  user?: MapPoint | null;
  fit: MapPoint[];
  fitKey: string;
  onStopClick?: (code: string) => void;
  ariaLabel: string;
}

interface BusEntry {
  marker: Marker;
  element: HTMLElement;
  label: HTMLElement;
  current: [number, number];
  frame: number | null;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const darken = (hex: string, amount: number): string => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '#2B2B2B';
  const value = Number.parseInt(match[1], 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
};

const stopsToGeoJson = (stops: MapStop[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: stops
    .filter((stop) => !stop.highlight)
    .map((stop) => ({
      type: 'Feature' as const,
      properties: { code: stop.code, name: stop.name },
      geometry: { type: 'Point' as const, coordinates: [stop.longitude, stop.latitude] },
    })),
});

const routeToGeoJson = (route: MapRoute | null | undefined): GeoJSON.FeatureCollection =>
  route && route.path.length > 1
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { color: route.color },
            geometry: { type: 'LineString' as const, coordinates: route.path.map(([lat, lng]) => [lng, lat]) },
          },
        ],
      }
    : emptyCollection;

const tween = (entry: BusEntry, target: [number, number]) => {
  if (entry.frame !== null) cancelAnimationFrame(entry.frame);
  if (prefersReducedMotion()) {
    entry.current = target;
    entry.marker.setLngLat(target);
    return;
  }
  const from = entry.current;
  const startedAt = performance.now();
  const duration = 1800;
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    entry.current = [from[0] + (target[0] - from[0]) * eased, from[1] + (target[1] - from[1]) * eased];
    entry.marker.setLngLat(entry.current);
    entry.frame = progress < 1 ? requestAnimationFrame(step) : null;
  };
  entry.frame = requestAnimationFrame(step);
};

const styleBus = (element: HTMLElement, bus: MapBus) => {
  element.style.setProperty('--bus', bus.color);
  element.style.setProperty('--bus-dark', darken(bus.color, 0.3));
  element.classList.toggle('dv-bus-arriving', bus.arriving === true);
};

const buildBusElement = (bus: MapBus): { element: HTMLElement; label: HTMLElement } => {
  const element = document.createElement('div');
  element.className = 'dv-bus';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', `Bus ${bus.label}`);
  const inner = document.createElement('span');
  inner.className = 'dv-bus-inner';
  const label = document.createElement('span');
  label.className = 'dv-bus-label';
  label.textContent = bus.label;
  const body = document.createElement('span');
  body.className = 'dv-bus-body';
  body.innerHTML = '<span class="dv-bus-windows"><i></i><i></i><i></i></span><span class="dv-bus-lights"></span>';
  const wheels = document.createElement('span');
  wheels.className = 'dv-bus-wheels';
  wheels.innerHTML = '<i></i><i></i>';
  const shadow = document.createElement('span');
  shadow.className = 'dv-bus-shadow';
  inner.append(label, body, wheels, shadow);
  element.append(inner);
  styleBus(element, bus);
  return { element, label };
};

export const LiveMap = ({ stops, route, buses, user, fit, fitKey, onStopClick, ariaLabel }: LiveMapProps) => {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const busMarkers = useRef(new Map<string, BusEntry>());
  const pinMarkers = useRef(new Map<string, Marker>());
  const userMarker = useRef<Marker | null>(null);
  const clickHandler = useRef(onStopClick);
  const fitPoints = useRef(fit);
  const [ready, setReady] = useState(false);
  const [tilted, setTilted] = useState(true);
  const tiltedRef = useRef(true);

  clickHandler.current = onStopClick;
  fitPoints.current = fit;
  tiltedRef.current = tilted;

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const busEntries = busMarkers.current;
    const pins = pinMarkers.current;

    loadStyle().then((style) => {
      if (cancelled) return;
      const map = new maplibregl.Map({
        container: host,
        style,
        center: [-70.6506, -33.4372],
        zoom: 14,
        pitch: MAP_PITCH,
        bearing: MAP_BEARING,
        maxPitch: 70,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para acercar el mapa',
          'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para acercar el mapa',
          'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
        },
      });
      mapRef.current = map;

      map.on('load', () => {
        try {
          map.setSky(SKY);
        } catch {
          /* sky is decoration: keep going without it */
        }
        map.addSource('route', { type: 'geojson', data: emptyCollection });
        map.addSource('stops', { type: 'geojson', data: emptyCollection });
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FFFFFF', 'line-width': 13 },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': 8 },
        });
        map.addLayer({
          id: 'stops-dots',
          type: 'circle',
          source: 'stops',
          paint: {
            'circle-radius': 6,
            'circle-color': '#FFFFFF',
            'circle-stroke-color': '#121212',
            'circle-stroke-width': 3,
            'circle-pitch-alignment': 'map',
          },
        });
        map.on('click', 'stops-dots', (event: MapLayerMouseEvent) => {
          const code = event.features?.[0]?.properties?.code;
          if (typeof code === 'string') clickHandler.current?.(code);
        });
        map.on('mouseenter', 'stops-dots', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'stops-dots', () => {
          map.getCanvas().style.cursor = '';
        });
        setReady(true);
      });

      observer = new ResizeObserver(() => map.resize());
      observer.observe(host);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      for (const entry of busEntries.values()) {
        if (entry.frame !== null) cancelAnimationFrame(entry.frame);
        entry.marker.remove();
      }
      busEntries.clear();
      for (const pin of pins.values()) pin.remove();
      pins.clear();
      userMarker.current?.remove();
      userMarker.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('route') as GeoJSONSource | undefined)?.setData(routeToGeoJson(route));
  }, [route, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('stops') as GeoJSONSource | undefined)?.setData(stopsToGeoJson(stops));
    const pins = pinMarkers.current;
    const wanted = new Set<string>();
    for (const stop of stops) {
      if (!stop.highlight) continue;
      wanted.add(stop.code);
      const existing = pins.get(stop.code);
      if (existing) {
        existing.setLngLat([stop.longitude, stop.latitude]);
        continue;
      }
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'dv-pin';
      element.setAttribute('aria-label', `Paradero ${stop.code}, ${stop.name}`);
      element.innerHTML = '<span class="dv-pin-inner"><span class="dv-pin-head"><i></i></span><span class="dv-pin-stem"></span><span class="dv-pin-shadow"></span></span>';
      element.addEventListener('click', () => clickHandler.current?.(stop.code));
      pins.set(stop.code, new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([stop.longitude, stop.latitude]).addTo(map));
    }
    for (const [code, pin] of pins) {
      if (wanted.has(code)) continue;
      pin.remove();
      pins.delete(code);
    }
  }, [stops, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (!user) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const element = document.createElement('div');
      element.className = 'dv-user';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', 'Tu ubicación');
      userMarker.current = new maplibregl.Marker({ element }).setLngLat([user.longitude, user.latitude]).addTo(map);
    } else {
      userMarker.current.setLngLat([user.longitude, user.latitude]);
    }
  }, [user, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const entries = busMarkers.current;
    const seen = new Set<string>();
    for (const bus of buses) {
      seen.add(bus.id);
      const target: [number, number] = [bus.longitude, bus.latitude];
      const existing = entries.get(bus.id);
      if (existing) {
        existing.label.textContent = bus.label;
        existing.element.setAttribute('aria-label', `Bus ${bus.label}`);
        styleBus(existing.element, bus);
        tween(existing, target);
        continue;
      }
      const { element, label } = buildBusElement(bus);
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat(target).addTo(map);
      entries.set(bus.id, { marker, element, label, current: target, frame: null });
    }
    for (const [id, entry] of entries) {
      if (seen.has(id)) continue;
      if (entry.frame !== null) cancelAnimationFrame(entry.frame);
      entry.marker.remove();
      entries.delete(id);
    }
  }, [buses, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const points = fitPoints.current;
    if (points.length === 0) return;
    const camera = tiltedRef.current ? { pitch: MAP_PITCH, bearing: MAP_BEARING } : { pitch: 0, bearing: 0 };
    const duration = prefersReducedMotion() ? 0 : 800;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 16, duration, ...camera });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const point of points) bounds.extend([point.longitude, point.latitude]);
    const flat = map.cameraForBounds(bounds, {
      padding: { top: 100, bottom: 90, left: 60, right: 60 },
      maxZoom: 16.2,
      bearing: camera.bearing,
    });
    if (!flat) return;
    const tiltSlack = tiltedRef.current ? 0.7 : 0;
    map.easeTo({ center: flat.center, zoom: (flat.zoom ?? 15) - tiltSlack, duration, ...camera });
  }, [fitKey, ready]);

  const toggleTilt = () => {
    const map = mapRef.current;
    const next = !tilted;
    setTilted(next);
    map?.easeTo({
      pitch: next ? MAP_PITCH : 0,
      bearing: next ? MAP_BEARING : 0,
      duration: prefersReducedMotion() ? 0 : 700,
    });
  };

  return (
    <div className="relative h-full w-full bg-rule">
      <div ref={container} role="region" aria-label={ariaLabel} className="h-full w-full" />
      <button
        type="button"
        onClick={toggleTilt}
        aria-pressed={tilted}
        aria-label={tilted ? 'Mapa en 3D, tocar para ver plano' : 'Mapa plano, tocar para ver en 3D'}
        className="absolute left-3 top-3 z-[1] flex h-10 min-w-[56px] items-center justify-center rounded-full border-2 border-ink bg-white px-3 text-[13px] font-extrabold tracking-[0.04em] text-ink"
      >
        {tilted ? '3D' : '2D'}
      </button>
    </div>
  );
};
