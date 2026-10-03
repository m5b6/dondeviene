'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Notice, ScreenHeader, StopPlate } from '@/components/sign';
import { api, friendlyError } from '@/lib/api';
import { titleCase } from '@/lib/format';
import type { SearchResult } from '@/server/red/service';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [searching, setSearching] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setResult(null);
      setError(null);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .search(trimmed, controller.signal)
        .then((found) => {
          setResult(found);
          setError(null);
          setSearching(false);
        })
        .catch((caught) => {
          if ((caught as { name?: string }).name === 'AbortError') return;
          setError(caught);
          setSearching(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const nothing = result && result.stops.length === 0 && result.places.length === 0;

  return (
    <>
      <ScreenHeader label="Buscar" title="Paradero o dirección" big />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 lg:px-12">
        <div className="py-5">
          <label htmlFor="q" className="sr-only">
            Paradero, calle o lugar
          </label>
          <input
            id="q"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="PC187, Providencia con Los Leones…"
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="search"
            className="h-target w-full rounded border-2 border-ink bg-white px-4 text-[17px] font-medium placeholder:text-mute"
          />
        </div>
        {trimmed.length < 2 ? (
          <p className="pb-6 text-[15px] leading-5 text-mute">Escribe el código del paradero (PC187), una calle o un lugar.</p>
        ) : null}
        {searching && !result ? <Notice title="Buscando…" /> : null}
        {error ? <Notice title={friendlyError(error)} /> : null}
        {nothing ? <Notice title="Sin resultados" body="Prueba con otra palabra o con el código del paradero." /> : null}
        {result && result.stops.length > 0 ? (
          <section aria-label="Paraderos">
            <h2 className="border-b-2 border-ink pb-2 text-label uppercase">Paraderos</h2>
            <ul>
              {result.stops.map((stop) => (
                <li key={stop.code}>
                  <Link href={`/paradero/${stop.code}`} className="flex min-h-[72px] items-center gap-3.5 border-b border-rule py-3">
                    <StopPlate code={stop.code} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[17px] font-bold leading-5">{stop.name}</span>
                      <span className="text-[13px] font-medium leading-4 text-mute">
                        {[stop.street, stop.commune ? titleCase(stop.commune) : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {result && result.places.length > 0 ? (
          <section aria-label="Lugares" className="mt-6">
            <h2 className="border-b-2 border-ink pb-2 text-label uppercase">Lugares</h2>
            <ul>
              {result.places.map((place, index) => (
                <li key={`${place.latitude}-${place.longitude}-${index}`}>
                  <Link
                    href={`/?lat=${place.latitude}&lng=${place.longitude}&label=${encodeURIComponent(place.name)}`}
                    className="flex min-h-[72px] flex-col justify-center gap-0.5 border-b border-rule py-3"
                  >
                    <span className="text-[17px] font-bold leading-5">
                      {place.name}
                      {place.transportMode === 'metro' ? <span className="ml-2 align-middle text-label uppercase text-mute">Metro</span> : null}
                    </span>
                    <span className="text-[13px] font-medium leading-4 text-mute">
                      {[place.street, place.district].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {result && !result.placesAvailable ? (
          <p className="py-4 text-[13px] leading-4 text-mute">La búsqueda de direcciones no responde ahora. Los paraderos sí.</p>
        ) : null}
      </main>
    </>
  );
}
