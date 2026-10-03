'use client';

import Link from 'next/link';
import { LinePlate, Notice, ScreenHeader, SecondaryButton, StopPlate } from '@/components/sign';
import { formatEtaShort } from '@/lib/format';
import { type SavedStop, useArrivals, useSavedStops } from '@/lib/hooks';

const SavedRow = ({ stop }: { stop: SavedStop }) => {
  const { data } = useArrivals(stop.code, undefined, 30_000);
  const next = (data?.services ?? []).filter((service) => service.status === 'ok' && service.buses.length > 0).slice(0, 3);
  return (
    <Link href={`/paradero/${stop.code}`} className="flex flex-col gap-3 border-b border-rule py-4" aria-label={`Paradero ${stop.code}, ${stop.name}`}>
      <span className="flex items-center gap-3.5">
        <StopPlate code={stop.code} size="sm" />
        <span className="text-[17px] font-bold leading-5">{stop.name}</span>
      </span>
      {next.length > 0 ? (
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {next.map((service) => (
            <span key={service.service} className="flex items-center gap-2">
              <LinePlate service={service.service} color={service.color} size={32} />
              <span className="text-[17px] font-extrabold">{formatEtaShort(service.buses[0].eta)}</span>
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  );
};

export default function SavedPage() {
  const { saved, ready } = useSavedStops();
  return (
    <>
      <ScreenHeader label="Guardados" title="Mis paraderos" big />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 lg:px-12">
        {ready && saved.length === 0 ? (
          <Notice title="Aún no guardas paraderos" body="Abre un paradero y toca “Guardar paradero” para verlo aquí. Se guardan solo en este dispositivo.">
            <SecondaryButton href="/buscar">Buscar un paradero</SecondaryButton>
          </Notice>
        ) : null}
        {saved.map((stop) => (
          <SavedRow key={stop.code} stop={stop} />
        ))}
      </main>
    </>
  );
}
