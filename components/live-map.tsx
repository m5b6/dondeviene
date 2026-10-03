'use client';

import * as maplibregl from 'maplibre-gl';
import type {
  FillExtrusionLayerSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
  Marker,
  StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { busExtrusions, routeExtrusions, stopExtrusions, userExtrusions, zoomScale } from '@/lib/geometry3d';
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
  heading: number;
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
  from: [number, number];
  to: [number, number];
  startedAt: number | null;
  heading: number;
  color: string;
}

const MOVE_MS = 1800;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const collection = (features: unknown[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: features as GeoJSON.Feature[],
});

const extrusionPaint = (): NonNullable<FillExtrusionLayerSpecification['paint']> => ({
  'fill-extrusion-color': ['get', 'color'],
  'fill-extrusion-base': ['get', 'base'],
  'fill-extrusion-height': ['get', 'height'],
  'fill-extrusion-opacity': 1,
  'fill-extrusion-vertical-gradient': true,
});

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

const buildLabelElement = (bus: MapBus): { element: HTMLElement; label: HTMLElement } => {
  const element = document.createElement('div');
  element.className = 'dv-bus';
  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', `Bus ${bus.label}`);
  const label = document.createElement('span');
  label.className = 'dv-bus-label';
  label.textContent = bus.label;
  element.append(label);
  element.classList.toggle('dv-bus-arriving', bus.arriving === true);
  return { element, label };
};

export const LiveMap = ({ stops, route, buses, user, fit, fitKey, onStopClick, ariaLabel }: LiveMapProps) => {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const busEntries = useRef(new Map<string, BusEntry>());
  const busLoop = useRef<number | null>(null);
  const clickHandler = useRef(onStopClick);
  const fitPoints = useRef(fit);
  const [ready, setReady] = useState(false);
  const [tilted, setTilted] = useState(true);
  const tiltedRef = useRef(true);
  const [scale, setScale] = useState(() => zoomScale(14));
  const scaleRef = useRef(scale);

  clickHandler.current = onStopClick;
  fitPoints.current = fit;
  tiltedRef.current = tilted;
  scaleRef.current = scale;

  const refreshBuses = () => {
    const map = mapRef.current;
    const source = map?.getSource('buses3d') as GeoJSONSource | undefined;
    if (!source) return;
    const features = [...busEntries.current.values()].flatMap((entry) =>
      busExtrusions({ longitude: entry.current[0], latitude: entry.current[1], color: entry.color, heading: entry.heading }, scaleRef.current),
    );
    source.setData(collection(features));
  };

  const stepBuses = (now: number) => {
    let active = false;
    for (const entry of busEntries.current.values()) {
      if (entry.startedAt === null) continue;
      const progress = Math.min(1, (now - entry.startedAt) / MOVE_MS);
      const eased = 1 - (1 - progress) ** 3;
      entry.current = [entry.from[0] + (entry.to[0] - entry.from[0]) * eased, entry.from[1] + (entry.to[1] - entry.from[1]) * eased];
      entry.marker.setLngLat(entry.current);
      if (progress < 1) active = true;
      else entry.startedAt = null;
    }
    refreshBuses();
    busLoop.current = active ? requestAnimationFrame(stepBuses) : null;
  };

  const ensureBusLoop = () => {
    if (busLoop.current === null) busLoop.current = requestAnimationFrame(stepBuses);
  };

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const entries = busEntries.current;

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
        map.addSource('static3d', { type: 'geojson', data: emptyCollection });
        map.addSource('buses3d', { type: 'geojson', data: emptyCollection });
        map.addSource('userRing', { type: 'geojson', data: emptyCollection });
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
        map.addLayer({
          id: 'user-ring',
          type: 'circle',
          source: 'userRing',
          paint: {
            'circle-radius': 12,
            'circle-color': '#0057B8',
            'circle-opacity': 0,
            'circle-stroke-color': '#0057B8',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.8,
            'circle-pitch-alignment': 'map',
          },
        });
        map.addLayer({ id: 'static3d', type: 'fill-extrusion', source: 'static3d', paint: extrusionPaint() });
        map.addLayer({ id: 'buses3d', type: 'fill-extrusion', source: 'buses3d', paint: extrusionPaint() });
        for (const layer of ['stops-dots', 'static3d']) {
          map.on('click', layer, (event: MapLayerMouseEvent) => {
            const code = event.features?.[0]?.properties?.code;
            if (typeof code === 'string') clickHandler.current?.(code);
          });
          map.on('mouseenter', layer, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = '';
          });
        }
        const syncScale = () => setScale(Math.round(zoomScale(map.getZoom()) * 4) / 4);
        map.on('zoomend', syncScale);
        syncScale();
        setReady(true);
      });

      observer = new ResizeObserver(() => map.resize());
      observer.observe(host);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (busLoop.current !== null) cancelAnimationFrame(busLoop.current);
      busLoop.current = null;
      for (const entry of entries.values()) entry.marker.remove();
      entries.clear();
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
  }, [stops, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const features: unknown[] = [];
    if (route && route.path.length > 1) features.push(...routeExtrusions(route.path, route.color, scale));
    for (const stop of stops) features.push(...stopExtrusions(stop, scale));
    if (user) features.push(...userExtrusions(user, scale));
    (map.getSource('static3d') as GeoJSONSource | undefined)?.setData(collection(features));
  }, [route, stops, user, scale, ready]);

  useEffect(() => {
    if (ready) refreshBuses();
  }, [scale, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const ring = map.getSource('userRing') as GeoJSONSource | undefined;
    if (!user) {
      ring?.setData(emptyCollection);
      return;
    }
    ring?.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [user.longitude, user.latitude] } }],
    });
    if (prefersReducedMotion()) return;
    let frame = 0;
    const pulse = (now: number) => {
      const t = (now % 1800) / 1800;
      if (map.getLayer('user-ring')) {
        map.setPaintProperty('user-ring', 'circle-radius', 12 + 30 * t);
        map.setPaintProperty('user-ring', 'circle-stroke-opacity', 0.8 * (1 - t));
      }
      frame = requestAnimationFrame(pulse);
    };
    frame = requestAnimationFrame(pulse);
    return () => cancelAnimationFrame(frame);
  }, [user, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const entries = busEntries.current;
    const seen = new Set<string>();
    const reduced = prefersReducedMotion();
    for (const bus of buses) {
      seen.add(bus.id);
      const target: [number, number] = [bus.longitude, bus.latitude];
      const existing = entries.get(bus.id);
      if (existing) {
        existing.label.textContent = bus.label;
        existing.element.setAttribute('aria-label', `Bus ${bus.label}`);
        existing.element.classList.toggle('dv-bus-arriving', bus.arriving === true);
        existing.heading = bus.heading;
        existing.color = bus.color;
        existing.from = existing.current;
        existing.to = target;
        existing.startedAt = reduced ? null : performance.now();
        if (reduced) {
          existing.current = target;
          existing.marker.setLngLat(target);
        }
        continue;
      }
      const { element, label } = buildLabelElement(bus);
      const marker = new maplibregl.Marker({ element, anchor: 'bottom', offset: [0, -34] }).setLngLat(target).addTo(map);
      entries.set(bus.id, {
        marker,
        element,
        label,
        current: target,
        from: target,
        to: target,
        startedAt: null,
        heading: bus.heading,
        color: bus.color,
      });
    }
    for (const [id, entry] of entries) {
      if (seen.has(id)) continue;
      entry.marker.remove();
      entries.delete(id);
    }
    refreshBuses();
    if ([...entries.values()].some((entry) => entry.startedAt !== null)) ensureBusLoop();
  }, [buses, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const points = fitPoints.current;
    if (points.length === 0) return;
    const camera = tiltedRef.current ? { pitch: MAP_PITCH, bearing: MAP_BEARING } : { pitch: 0, bearing: 0 };
    const duration = prefersReducedMotion() ? 0 : 800;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 16.5, duration, ...camera });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const point of points) bounds.extend([point.longitude, point.latitude]);
    const flat = map.cameraForBounds(bounds, {
      padding: { top: 100, bottom: 90, left: 60, right: 60 },
      maxZoom: 17,
      bearing: camera.bearing,
    });
    if (!flat) return;
    const tiltSlack = tiltedRef.current ? 0.3 : 0;
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
