'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ArrivalRow, Freshness, LinePlate, Notice, PrimaryButton, ScreenHeader, SecondaryButton, StopPlate } from '@/components/sign';
import { api, friendlyError } from '@/lib/api';
import { formatEtaShort, titleCase } from '@/lib/format';
import { type ArrivalsState, useArrivals, useGeolocation } from '@/lib/hooks';
import type { NearbyStop } from '@/server/red/types';

const RADIUS_METERS = 900;

const ExpandedStop = ({ stop, state }: { stop: NearbyStop; state: ArrivalsState }) => {
  const rows = (state.data?.services ?? []).filter((service) => service.status === 'ok').slice(0, 3);
  return (
    <section className="border-b-2 border-ink py-5" aria-label={`Paradero más cercano ${stop.name}`}>
      <Link href={`/paradero/${stop.code}`} className="flex items-center gap-3.5">
        <StopPlate code={stop.code} size="md" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xl font-bold leading-6">{stop.name}</span>
          <span className="text-[13px] font-medium leading-4 text-mute">
            {stop.distanceMeters} m{stop.street ? ` · ${stop.street}` : ''}
          </span>
        </span>
      </Link>
      <ul className="mt-2">
        {rows.map((service) => (
          <li key={`${service.service}-${service.direction ?? ''}`}>
            <ArrivalRow arrival={service} href={`/servicio/${encodeURIComponent(service.service)}?stop=${stop.code}`} />
          </li>
        ))}
      </ul>
      {state.data && rows.length === 0 ? (
        <p className="py-4 text-[15px] text-mute">Sin buses informados por ahora.</p>
      ) : null}
      <Link href={`/paradero/${stop.code}`} className="mt-1 inline-flex h-11 items-center text-[15px] font-extrabold underline underline-offset-4">
        Ver todos los servicios
      </Link>
    </section>
  );
};

const CompactStop = ({ stop }: { stop: NearbyStop }) => {
  const { data } = useArrivals(stop.code, undefined, 30_000);
  const next = (data?.services ?? []).filter((service) => service.status === 'ok' && service.buses.length > 0).slice(0, 3);
  return (
    <Link href={`/paradero/${stop.code}`} className="flex flex-col gap-3 border-b border-rule py-4" aria-label={`Paradero ${stop.code}, ${stop.name}`}>
      <span className="flex items-center gap-3.5">
        <StopPlate code={stop.code} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold leading-5">{stop.name}</span>
          <span className="text-[13px] font-medium leading-4 text-mute">
            {stop.distanceMeters} m{stop.street ? ` · ${stop.street}` : ''}
          </span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {next.length > 0
          ? next.map((service) => (
              <span key={service.service} className="flex items-center gap-2">
                <LinePlate service={service.service} color={service.color} size={32} />
                <span className="text-[17px] font-extrabold">{formatEtaShort(service.buses[0].eta)}</span>
              </span>
            ))
          : stop.services.slice(0, 4).map((service) => <LinePlate key={service} service={service} size={32} muted />)}
      </span>
    </Link>
  );
};

function Home() {
  const search = useSearchParams();
  const rawLat = search.get('lat');
  const rawLng = search.get('lng');
  const manualLat = rawLat === null ? Number.NaN : Number(rawLat);
  const manualLng = rawLng === null ? Number.NaN : Number(rawLng);
  const manual = Number.isFinite(manualLat) && Number.isFinite(manualLng);
  const label = search.get('label');
  const geo = useGeolocation();
  const latitude = manual ? manualLat : (geo.position?.latitude ?? null);
  const longitude = manual ? manualLng : (geo.position?.longitude ?? null);
  const [stops, setStops] = useState<NearbyStop[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (latitude === null || longitude === null) {
      setStops(null);
      return;
    }
    const controller = new AbortController();
    setStops(null);
    setError(null);
    api
      .nearby(latitude, longitude, controller.signal)
      .then((result) => setStops(result.stops))
      .catch((caught) => {
        if ((caught as { name?: string }).name !== 'AbortError') setError(caught);
      });
    return () => controller.abort();
  }, [latitude, longitude, attempt]);

  const first = stops?.[0] ?? null;
  const firstState = useArrivals(first?.code ?? null);
  const place = label ?? (first?.commune ? titleCase(first.commune) : 'Paraderos');
  const hasPoint = latitude !== null && longitude !== null;

  return (
    <>
      <ScreenHeader label={manual ? 'Cerca de' : 'Cerca de ti'} title={hasPoint ? place : 'Dónde viene'} big>
        {first ? <div className="mt-2"><Freshness state={firstState} dark /></div> : null}
      </ScreenHeader>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 lg:px-12">
        {!hasPoint && geo.status !== 'denied' && geo.status !== 'unavailable' ? (
          <Notice title="¿Dónde estás?" body="Te mostramos los paraderos a pie y cuándo llega cada micro.">
            <PrimaryButton onClick={geo.request} disabled={geo.status === 'asking'}>
              <span>{geo.status === 'asking' ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</span>
            </PrimaryButton>
            <SecondaryButton href="/buscar">Buscar un paradero o dirección</SecondaryButton>
          </Notice>
        ) : null}
        {!hasPoint && (geo.status === 'denied' || geo.status === 'unavailable') ? (
          <Notice
            title="No pudimos ver tu ubicación"
            body={
              geo.status === 'denied'
                ? 'Puedes activarla en los ajustes del navegador, o buscar un paradero o una dirección.'
                : 'Tu dispositivo no entregó la ubicación. Busca un paradero o una dirección.'
            }
          >
            <PrimaryButton href="/buscar">
              <span>Buscar un paradero o dirección</span>
            </PrimaryButton>
            <SecondaryButton onClick={geo.request}>Intentar de nuevo</SecondaryButton>
          </Notice>
        ) : null}
        {hasPoint && !stops && !error ? <Notice title="Buscando paraderos…" /> : null}
        {error ? (
          <Notice title={friendlyError(error)}>
            <SecondaryButton onClick={() => setAttempt((value) => value + 1)}>Reintentar</SecondaryButton>
          </Notice>
        ) : null}
        {stops && stops.length === 0 ? (
          <Notice title={`No hay paraderos a menos de ${RADIUS_METERS} m`} body="Prueba con otra dirección o con el código del paradero.">
            <SecondaryButton href="/buscar">Buscar</SecondaryButton>
          </Notice>
        ) : null}
        {first && stops ? (
          <>
            <ExpandedStop stop={first} state={firstState} />
            {stops.slice(1).map((stop) => (
              <CompactStop key={stop.code} stop={stop} />
            ))}
          </>
        ) : null}
      </main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
