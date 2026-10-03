'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';

maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const BUS_GLYPH =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" aria-hidden="true"><rect x="4" y="3" width="16" height="15"/><path d="M4 11h16M7 21v-3M17 21v-3"/></svg>';

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
  label: HTMLElement;
  current: [number, number];
  frame: number | null;
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const emptyCollection: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const stopsToGeoJson = (stops: MapStop[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: stops.map((stop) => ({
    type: 'Feature' as const,
    properties: { code: stop.code, name: stop.name, highlight: stop.highlight === true },
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
  const duration = 1600;
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - progress) ** 3;
    entry.current = [from[0] + (target[0] - from[0]) * eased, from[1] + (target[1] - from[1]) * eased];
    entry.marker.setLngLat(entry.current);
    entry.frame = progress < 1 ? requestAnimationFrame(step) : null;
  };
  entry.frame = requestAnimationFrame(step);
};

export const LiveMap = ({ stops, route, buses, user, fit, fitKey, onStopClick, ariaLabel }: LiveMapProps) => {
  const container = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const busMarkers = useRef(new Map<string, BusEntry>());
  const userMarker = useRef<Marker | null>(null);
  const clickHandler = useRef(onStopClick);
  const fitPoints = useRef(fit);
  const [ready, setReady] = useState(false);

  clickHandler.current = onStopClick;
  fitPoints.current = fit;

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: [-70.6506, -33.4372],
      zoom: 13,
      attributionControl: { compact: true },
      cooperativeGestures: true,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
      },
    });
    mapRef.current = map;
    const entries = busMarkers.current;

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: emptyCollection });
      map.addSource('stops', { type: 'geojson', data: emptyCollection });
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': 10 },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 6 },
      });
      map.addLayer({
        id: 'stops-dots',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': ['case', ['get', 'highlight'], 10, 5],
          'circle-color': ['case', ['get', 'highlight'], '#FFC20E', '#F4F3EE'],
          'circle-stroke-color': '#121212',
          'circle-stroke-width': ['case', ['get', 'highlight'], 4, 2.5],
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

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      for (const entry of entries.values()) {
        if (entry.frame !== null) cancelAnimationFrame(entry.frame);
        entry.marker.remove();
      }
      entries.clear();
      userMarker.current?.remove();
      userMarker.current = null;
      map.remove();
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
        tween(existing, target);
        continue;
      }
      const element = document.createElement('div');
      element.className = 'dv-bus';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', `Bus ${bus.label}`);
      const label = document.createElement('span');
      label.className = 'dv-bus-label';
      label.textContent = bus.label;
      const icon = document.createElement('span');
      icon.className = 'dv-bus-icon';
      icon.innerHTML = BUS_GLYPH;
      element.append(label, icon);
      const marker = new maplibregl.Marker({ element }).setLngLat(target).addTo(map);
      entries.set(bus.id, { marker, label, current: target, frame: null });
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
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 15.5, duration: prefersReducedMotion() ? 0 : 600 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds();
    for (const point of points) bounds.extend([point.longitude, point.latitude]);
    map.fitBounds(bounds, {
      padding: { top: 84, bottom: 80, left: 56, right: 56 },
      maxZoom: 16,
      duration: prefersReducedMotion() ? 0 : 700,
    });
  }, [fitKey, ready]);

  return <div ref={container} role="region" aria-label={ariaLabel} className="h-full w-full bg-rule" />;
};
