'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ServiceView } from '@/components/service-view';
import {
  ArrivalRow,
  ArrowLeft,
  BookmarkGlyph,
  Freshness,
  Notice,
  PrimaryButton,
  SecondaryButton,
  StopPlate,
} from '@/components/sign';
import { friendlyError } from '@/lib/api';
import { displayStopName, titleCase } from '@/lib/format';
import { useArrivals, useIsDesktop, useSavedStops } from '@/lib/hooks';

const STOP_PATTERN = /^[A-Z]{2}\d+$/;

export default function StopPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code).toUpperCase();
  const valid = STOP_PATTERN.test(code);
  const state = useArrivals(valid ? code : null);
  const { data, error, loading } = state;
  const { isSaved, toggle } = useSavedStops();
  const desktop = useIsDesktop();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => setSelected(null), [code]);

  const services = data?.services ?? [];
  const running = services.filter((service) => service.status === 'ok' && service.buses.length > 0);
  const selectedService = selected ?? running[0]?.service ?? services[0]?.service ?? null;
  const selectedArrival = services.find((service) => service.service === selectedService) ?? null;
  const name = data ? displayStopName(data.catalogStop?.name, data.stop.name) : null;
  const where = data?.catalogStop ? [data.catalogStop.street, data.catalogStop.commune ? titleCase(data.catalogStop.commune) : null].filter(Boolean).join(' · ') : null;
  const saved = isSaved(code);
  const saveLabel = saved ? 'Quitar de mis paraderos' : 'Guardar paradero';

  if (!valid) {
    return (
      <Notice title="Ese código no parece un paradero" body="Los paraderos tienen dos letras y números, por ejemplo PC187.">
        <SecondaryButton href="/buscar">Buscar un paradero</SecondaryButton>
      </Notice>
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top bg-ink px-5 pb-5 pt-5 text-paper lg:px-12">
          <div className="mx-auto flex max-w-4xl flex-col gap-3.5">
            <Link href="/" className="inline-flex h-11 items-center gap-2 self-start text-label uppercase">
              <ArrowLeft />
              Cerca de ti
            </Link>
            <div className="flex items-start gap-3.5">
              <StopPlate code={code} size="lg" invert />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h1 className="text-stop lg:text-sign">{name ?? (loading ? 'Cargando…' : `Paradero ${code}`)}</h1>
                {where ? <span className="text-[15px] font-bold leading-5">{where}</span> : null}
              </div>
              {desktop ? (
                <button
                  type="button"
                  onClick={() => toggle({ code, name: name ?? code })}
                  aria-pressed={saved}
                  className="flex h-12 items-center gap-2 rounded border-2 border-paper px-4 text-[15px] font-extrabold"
                >
                  <BookmarkGlyph filled={saved} size={20} />
                  {saved ? 'Guardado' : 'Guardar'}
                </button>
              ) : null}
            </div>
            <Freshness state={state} dark />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 lg:px-12">
          {error && !data ? (
            <Notice title={friendlyError(error)} body="Vuelve a intentar en unos segundos.">
              <SecondaryButton href={`/paradero/${code}`}>Reintentar</SecondaryButton>
            </Notice>
          ) : null}
          {data && services.length === 0 ? (
            <Notice
              title="Sin servicios con información"
              body="Red Movilidad no informa buses para este paradero en este momento."
            />
          ) : null}
          <ul>
            {services.map((service) => (
              <li key={`${service.service}-${service.direction ?? ''}`}>
                {desktop ? (
                  <ArrivalRow
                    arrival={service}
                    onSelect={() => setSelected(service.service)}
                    selected={service.service === selectedService}
                  />
                ) : (
                  <ArrivalRow arrival={service} href={`/servicio/${encodeURIComponent(service.service)}?stop=${code}`} />
                )}
              </li>
            ))}
          </ul>
        </main>

        {desktop ? null : (
          <div className="safe-bottom sticky bottom-0 border-t-2 border-ink bg-paper px-5 pb-3.5 pt-3.5">
            {saved ? (
              <SecondaryButton onClick={() => toggle({ code, name: name ?? code })}>
                <span>{saveLabel}</span>
                <BookmarkGlyph filled />
              </SecondaryButton>
            ) : (
              <PrimaryButton onClick={() => toggle({ code, name: name ?? code })}>
                <span>{saveLabel}</span>
                <BookmarkGlyph />
              </PrimaryButton>
            )}
          </div>
        )}
      </div>

      {desktop ? (
        <aside
          data-scroller
          className="sticky top-0 flex h-dvh w-[400px] flex-none flex-col self-start overflow-y-auto border-l-2 border-ink"
          aria-label="Recorrido del servicio seleccionado"
        >
          {selectedService ? (
            <ServiceView service={selectedService} stopCode={code} arrival={selectedArrival} embedded />
          ) : (
            <Notice title="Elige un servicio" body="Aquí verás su recorrido." />
          )}
        </aside>
      ) : null}
    </div>
  );
}
