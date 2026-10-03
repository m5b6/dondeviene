'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { formatDistance, formatEta } from '@/lib/format';
import type { RouteStop, ServiceArrivals } from '@/server/red/types';
import { BusGlyph } from './sign';

const Spine = ({ hex, first, last, children }: { hex: string; first: boolean; last: boolean; children: ReactNode }) => (
  <div className="relative flex w-14 flex-none items-center justify-center">
    <div className="absolute left-6 w-2" style={{ background: hex, top: first ? '50%' : 0, bottom: last ? '50%' : 0 }} />
    <div className="relative flex items-center justify-center">{children}</div>
  </div>
);

interface ServiceStripProps {
  stops: RouteStop[];
  lineHex: string;
  stopCode?: string | null;
  arrival?: ServiceArrivals | null;
  compact?: boolean;
}

export const ServiceStrip = ({ stops, lineHex, stopCode, arrival, compact = false }: ServiceStripProps) => {
  const youRef = useRef<HTMLLIElement | null>(null);
  const youIndex = stopCode ? stops.findIndex((stop) => stop.code === stopCode) : -1;

  useEffect(() => {
    const element = youRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const scroller = element.closest<HTMLElement>('[data-scroller]');
    if (scroller) {
      const box = scroller.getBoundingClientRect();
      scroller.scrollTop += rect.top - box.top - box.height / 2 + rect.height / 2;
    } else {
      window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight / 3 });
    }
  }, [stopCode, stops]);

  return (
    <ol className="flex flex-col" aria-label="Paradas del recorrido">
      {stops.map((stop, index) => {
        const first = index === 0;
        const last = index === stops.length - 1;
        const you = index === youIndex;
        const rowHeight = you ? (arrival?.buses.length ? 96 + arrival.buses.length * 28 : 96) : 64;

        if (you) {
          return (
            <li key={`${stop.code}-${index}`} ref={youRef} className="flex" style={{ minHeight: rowHeight }}>
              <Spine hex={lineHex} first={first} last={last}>
                <span className="block h-9 w-9 border-4 border-ink bg-signal" aria-hidden="true" />
              </Spine>
              <div className="flex flex-1 flex-col justify-center gap-1 py-3">
                <span className="self-start bg-ink px-2 py-[3px] text-[11px] font-extrabold uppercase leading-[14px] tracking-[0.08em] text-paper">
                  Tú estás aquí
                </span>
                <span className="text-[22px] font-extrabold leading-[26px] tracking-[-0.01em]">{stop.name}</span>
                {arrival && arrival.buses.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {arrival.buses.map((bus, busIndex) => {
                      const view = formatEta(bus.eta);
                      const distance = formatDistance(bus.distanceMeters);
                      return (
                        <li key={`${bus.plate ?? 'bus'}-${busIndex}`} className="flex items-center gap-2 text-[17px] font-extrabold leading-6">
                          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-ink text-paper">
                            <BusGlyph size={16} />
                          </span>
                          <span>{view.unit ? `${view.value} ${view.unit}` : view.value}</span>
                          {distance ? <span className="text-[13px] font-bold text-mute">{distance}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        }

        const terminal = first || last;
        return (
          <li key={`${stop.code}-${index}`} className="flex" style={{ height: compact ? 56 : 64 }}>
            <Spine hex={lineHex} first={first} last={last}>
              {terminal ? (
                <span className="block h-7 w-7 bg-ink" aria-hidden="true" />
              ) : (
                <span className="block h-6 w-6 rounded-full border-4 border-ink bg-paper" aria-hidden="true" />
              )}
            </Spine>
            <Link
              href={`/paradero/${stop.code}`}
              className="flex flex-1 flex-col justify-center gap-0.5 pr-2"
              aria-label={`Paradero ${stop.code}, ${stop.name}`}
            >
              {terminal ? (
                <span className="text-label uppercase text-mute">{first ? 'Origen' : 'Terminal'}</span>
              ) : null}
              <span className={`leading-5 ${terminal ? 'text-xl font-extrabold leading-6' : 'text-[17px] font-semibold text-body'}`}>
                {stop.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
};
