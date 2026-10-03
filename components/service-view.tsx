'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiError, api, friendlyError } from '@/lib/api';
import { lineForService } from '@/lib/palette';
import { type DirectionKey, pickDirection } from '@/lib/route-direction';
import type { RouteFile, ServiceArrivals } from '@/server/red/types';
import { ServiceStrip } from './service-strip';
import { Notice } from './sign';

interface ServiceViewProps {
  service: string;
  stopCode?: string | null;
  arrival?: ServiceArrivals | null;
  embedded?: boolean;
  mapSlot?: ReactNode;
}

export const useRoute = (service: string) => {
  const [route, setRoute] = useState<RouteFile | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    let cancelled = false;
    setRoute(null);
    setError(null);
    if (!service) return;
    api
      .route(service)
      .then((loaded) => {
        if (!cancelled) setRoute(loaded);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught);
      });
    return () => {
      cancelled = true;
    };
  }, [service]);
  return { route, error };
};

export const ServiceView = ({ service, stopCode, arrival, embedded = false, mapSlot }: ServiceViewProps) => {
  const { route, error } = useRoute(service);
  const [choice, setChoice] = useState<DirectionKey | null>(null);

  useEffect(() => setChoice(null), [service]);

  const picked = useMemo(() => (route ? pickDirection(route, stopCode, arrival, choice) : null), [route, stopCode, arrival, choice]);
  const line = lineForService(service, arrival?.color ?? route?.operator?.color ?? null);

  if (error) {
    return <Notice title={friendlyError(error)} body={error instanceof ApiError && error.code === 'UNKNOWN_SERVICE' ? undefined : 'Intenta de nuevo en un momento.'} />;
  }
  if (!route || !picked) {
    return <Notice title="Cargando recorrido…" />;
  }

  const both = route.outbound !== null && route.inbound !== null;
  const directionArrival = arrival && (!arrival.destination || arrival.destination === picked.direction.destination) ? arrival : null;

  return (
    <div className="flex flex-1 flex-col">
      {embedded ? null : (
        <div className="px-5 py-5 lg:px-12" style={{ background: line.hex, color: line.text }}>
          <div className="mx-auto flex max-w-4xl items-center gap-4">
            <span
              className="flex h-[76px] min-w-[76px] flex-none items-center justify-center rounded-full bg-white px-2 text-[28px] font-extrabold tracking-[-0.02em]"
              style={{ color: line.hex === '#FFC20E' || line.hex === '#8DC63F' || line.hex === '#4FB0E5' ? '#121212' : line.hex }}
            >
              {service}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-label uppercase">Recorrido</span>
              <span className="text-[26px] font-extrabold leading-[30px] tracking-[-0.02em]">Hacia {picked.direction.destination}</span>
            </div>
          </div>
        </div>
      )}
      {mapSlot}
      {!embedded && stopCode ? (
        <a
          href="#tu-paradero"
          className="flex h-12 items-center justify-between border-y-2 border-ink px-5 text-[15px] font-extrabold lg:px-12"
        >
          <span>Ir a tu paradero</span>
          <span aria-hidden="true">↓</span>
        </a>
      ) : null}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 lg:px-12">
        {embedded ? (
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper py-4">
            <span
              className="inline-flex h-10 min-w-10 items-center justify-center px-2 text-[15px] font-extrabold"
              style={{ background: line.hex, color: line.text, borderRadius: service.length > 3 ? 8 : 999 }}
            >
              {service}
            </span>
            <span className="text-[17px] font-extrabold leading-5">Hacia {picked.direction.destination}</span>
          </div>
        ) : null}
        {both ? (
          <div className="flex gap-2 py-4" role="group" aria-label="Sentido">
            {(['outbound', 'inbound'] as const).map((key) => {
              const direction = route[key];
              if (!direction) return null;
              const active = picked.key === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setChoice(key)}
                  className={`h-12 min-w-0 flex-1 truncate rounded-full px-4 text-[15px] font-extrabold ${active ? 'bg-ink text-paper' : 'border-2 border-ink'}`}
                >
                  Hacia {direction.destination}
                </button>
              );
            })}
          </div>
        ) : null}
        <ServiceStrip stops={picked.direction.stops} lineHex={line.hex} stopCode={stopCode} arrival={directionArrival} compact={embedded} />
      </div>
    </div>
  );
};
