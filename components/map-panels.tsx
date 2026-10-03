'use client';

import { useMemo } from 'react';
import { formatEtaShort } from '@/lib/format';
import { useGeolocation } from '@/lib/hooks';
import { lineForService } from '@/lib/palette';
import { estimateBusPosition, pathLengthsFromStart } from '@/lib/position';
import { pickDirection } from '@/lib/route-direction';
import { haversineMeters } from '@/server/red/geo';
import type { NearbyStop, ServiceArrivals } from '@/server/red/types';
import type { MapBus, MapPoint, MapStop } from './live-map';
import { LiveMap } from './live-map-lazy';
import { useRoute } from './service-view';

const NEAR_USER_METERS = 1500;
const FIT_BUS_METERS = 2500;

const Caption = ({ children }: { children: string }) => (
  <p className="px-5 py-2 text-[13px] font-medium leading-4 text-mute lg:px-12">{children}</p>
);

interface RouteMapProps {
  service: string | null;
  stopCode?: string | null;
  fallbackStop?: { code: string; name: string; latitude: number; longitude: number } | null;
  arrival?: ServiceArrivals | null;
  heightClass?: string;
  onStopClick?: (code: string) => void;
}

export const RouteMap = ({ service, stopCode, fallbackStop, arrival, heightClass = 'h-[300px]', onStopClick }: RouteMapProps) => {
  const { route } = useRoute(service ?? '');
  const geo = useGeolocation();
  const picked = useMemo(() => (service && route ? pickDirection(route, stopCode, arrival, null) : null), [service, route, stopCode, arrival]);
  const line = lineForService(service ?? '', arrival?.color ?? route?.operator?.color ?? null);

  const stopOnRoute = picked && stopCode ? (picked.direction.stops.find((stop) => stop.code === stopCode) ?? null) : null;
  const stopPoint: MapPoint | null = stopOnRoute ?? fallbackStop ?? null;

  const { buses, unplaced } = useMemo(() => {
    const placed: MapBus[] = [];
    let missing = false;
    if (!picked || !stopOnRoute || !arrival || arrival.status !== 'ok') return { buses: placed, unplaced: false };
    const cumulative = pathLengthsFromStart(picked.direction.path);
    arrival.buses.forEach((bus, index) => {
      if (bus.distanceMeters === null) return;
      const estimate = estimateBusPosition(picked.direction.path, stopOnRoute, bus.distanceMeters, cumulative);
      if (!estimate) {
        missing = true;
        return;
      }
      placed.push({
        id: `${arrival.service}-${bus.plate ?? index}`,
        latitude: estimate.position.latitude,
        longitude: estimate.position.longitude,
        label: formatEtaShort(bus.eta) || '—',
        color: line.hex,
        arriving: bus.eta.kind === 'arriving',
      });
    });
    return { buses: placed, unplaced: missing };
  }, [picked, stopOnRoute, arrival, line.hex]);

  const stops: MapStop[] = useMemo(() => {
    if (picked) {
      return picked.direction.stops.map((stop) => ({
        code: stop.code,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        highlight: stop.code === stopCode,
      }));
    }
    return fallbackStop ? [{ ...fallbackStop, highlight: true }] : [];
  }, [picked, stopCode, fallbackStop]);

  const user = geo.position;
  const fit: MapPoint[] = useMemo(() => {
    const points: MapPoint[] = [];
    if (stopPoint) points.push(stopPoint);
    const close = stopPoint
      ? buses.filter((bus) => haversineMeters(bus.latitude, bus.longitude, stopPoint.latitude, stopPoint.longitude) <= FIT_BUS_METERS)
      : buses;
    if (close.length > 0) points.push(...close);
    else if (buses.length > 0 && stopPoint) {
      const nearest = [...buses].sort(
        (a, b) =>
          haversineMeters(a.latitude, a.longitude, stopPoint.latitude, stopPoint.longitude) -
          haversineMeters(b.latitude, b.longitude, stopPoint.latitude, stopPoint.longitude),
      )[0];
      points.push(nearest);
    }
    if (user && stopPoint && haversineMeters(user.latitude, user.longitude, stopPoint.latitude, stopPoint.longitude) < NEAR_USER_METERS) {
      points.push(user);
    }
    if (!stopPoint && picked) {
      const first = picked.direction.stops[0];
      const last = picked.direction.stops[picked.direction.stops.length - 1];
      if (first) points.push(first);
      if (last) points.push(last);
    }
    return points;
  }, [stopPoint, buses, user, picked]);

  const fitKey = `${service ?? ''}|${picked?.key ?? ''}|${stopCode ?? ''}|${buses.length > 0 ? 'b' : 'n'}|${stopPoint ? 's' : 'x'}`;

  let caption = '';
  if (buses.length > 0) caption = 'Posición estimada con la distancia que informa Red Movilidad. No es GPS.';
  else if (unplaced) caption = 'No pudimos ubicar los buses sobre el recorrido.';
  else if (service && arrival && arrival.status !== 'ok') caption = 'Red Movilidad no informa buses de este servicio ahora.';

  return (
    <section aria-label={service ? `Mapa del servicio ${service}` : 'Mapa del paradero'}>
      <div className={heightClass}>
        <LiveMap
          stops={stops}
          route={picked ? { path: picked.direction.path, color: line.hex } : null}
          buses={buses}
          user={user}
          fit={fit}
          fitKey={fitKey}
          onStopClick={onStopClick}
          ariaLabel={service ? `Mapa con el recorrido del ${service}` : 'Mapa con la ubicación del paradero'}
        />
      </div>
      {caption ? <Caption>{caption}</Caption> : null}
    </section>
  );
};

interface NearbyMapProps {
  stops: NearbyStop[];
  origin: MapPoint;
  heightClass?: string;
  onStopClick: (code: string) => void;
}

export const NearbyMap = ({ stops, origin, heightClass = 'h-[260px]', onStopClick }: NearbyMapProps) => {
  const markers: MapStop[] = useMemo(
    () =>
      stops.map((stop, index) => ({
        code: stop.code,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        highlight: index === 0,
      })),
    [stops],
  );
  const fit = useMemo(() => [origin, ...stops], [origin, stops]);
  const fitKey = `${origin.latitude},${origin.longitude}|${stops.map((stop) => stop.code).join(',')}`;
  return (
    <section aria-label="Mapa de paraderos cercanos" className={heightClass}>
      <LiveMap
        stops={markers}
        buses={[]}
        user={origin}
        fit={fit}
        fitKey={fitKey}
        onStopClick={onStopClick}
        ariaLabel="Mapa con los paraderos cercanos"
      />
    </section>
  );
};
