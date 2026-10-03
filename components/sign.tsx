'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ServiceArrivals } from '@/server/red/types';
import type { ArrivalsState } from '@/lib/hooks';
import { formatAge, formatDistance, formatEta, formatEtaShort, spokenArrival } from '@/lib/format';
import { isPlate, lineForService } from '@/lib/palette';

export const ArrowRight = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden="true">
    <path d="M3 12h17M13 5l7 7-7 7" />
  </svg>
);

export const ArrowLeft = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden="true">
    <path d="M21 12H4M11 5l-7 7 7 7" />
  </svg>
);

export const BusGlyph = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
    <rect x="4" y="3" width="16" height="15" />
    <path d="M4 11h16M7 21v-3M17 21v-3" />
  </svg>
);

export const BookmarkGlyph = ({ filled = false, size = 24 }: { filled?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
    <path d="M6 3h12v18l-6-5-6 5z" />
  </svg>
);

interface LinePlateProps {
  service: string;
  color?: string | null;
  size?: 24 | 32 | 40 | 48 | 52 | 76;
  muted?: boolean;
}

export const LinePlate = ({ service, color, size = 48, muted = false }: LinePlateProps) => {
  const line = lineForService(service, color);
  const plate = isPlate(service);
  const fontSize = Math.round(size * (plate ? 0.34 : 0.36));
  const style = muted
    ? { height: size, minWidth: plate ? Math.round(size * 1.3) : size, width: plate ? undefined : size, border: '2px solid #6B6A65', color: '#6B6A65', fontSize }
    : { height: size, minWidth: plate ? Math.round(size * 1.3) : size, width: plate ? undefined : size, background: line.hex, color: line.text, fontSize };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-extrabold leading-none ${plate ? 'rounded-plate' : 'rounded-full'}`}
      style={{ ...style, padding: plate ? `0 ${Math.round(size * 0.2)}px` : 0, boxSizing: 'border-box' }}
    >
      {service}
    </span>
  );
};

interface StopPlateProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  invert?: boolean;
}

const stopPlateSizes = {
  sm: 'h-11 min-w-[64px] px-2 text-base',
  md: 'h-14 min-w-[72px] px-2 text-lg',
  lg: 'h-[68px] min-w-[104px] px-3 text-[28px]',
};

export const StopPlate = ({ code, size = 'md', invert = false }: StopPlateProps) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center font-extrabold leading-none tracking-tight ${stopPlateSizes[size]} ${invert ? 'bg-paper text-ink' : 'bg-ink text-white'}`}
  >
    {code}
  </span>
);

export const Chip = ({ children, tone = 'signal' }: { children: ReactNode; tone?: 'signal' | 'ink' }) => (
  <span
    className={`inline-block rounded px-3 py-2 text-[13px] font-extrabold uppercase leading-4 tracking-[0.08em] ${tone === 'signal' ? 'bg-signal text-ink' : 'bg-ink text-paper'}`}
  >
    {children}
  </span>
);

export const EtaDisplay = ({ arrival, compact = false }: { arrival: ServiceArrivals; compact?: boolean }) => {
  const first = arrival.buses[0];
  if (arrival.status !== 'ok' || !first) {
    return <span className={`${compact ? 'text-3xl' : 'text-minutes'} font-extrabold text-mute`}>—</span>;
  }
  const view = formatEta(first.eta);
  if (view.kind === 'chip') return <Chip>{view.value}</Chip>;
  if (view.kind === 'text') return <span className="max-w-[120px] text-right text-sm font-bold">{view.value}</span>;
  const long = view.value.length > 3;
  const size = compact ? 'text-[32px] leading-8' : long ? 'text-[38px] leading-[44px]' : 'text-minutes';
  return (
    <span className="flex shrink-0 items-baseline gap-1">
      <span key={view.value} className={`flip font-extrabold tracking-[-0.03em] ${size}`}>
        {view.value}
      </span>
      <span className={`font-extrabold ${compact ? 'text-[13px]' : 'text-[17px]'}`}>{view.unit}</span>
    </span>
  );
};

const arrivalSubline = (arrival: ServiceArrivals): string => {
  if (arrival.status !== 'ok' || arrival.buses.length === 0) {
    return arrival.message || 'Sin información por ahora';
  }
  const parts: string[] = [];
  const meters = arrival.buses[0].distanceMeters;
  const distance = meters && meters > 0 ? formatDistance(meters) : null;
  if (distance) parts.push(distance);
  const second = arrival.buses[1];
  if (second) {
    const short = formatEtaShort(second.eta);
    if (short === 'llegando') parts.push('otro bus llegando');
    else if (short) parts.push(`luego ${short}`);
  }
  return parts.join(' · ');
};

interface ArrivalRowProps {
  arrival: ServiceArrivals;
  href?: string;
  onSelect?: () => void;
  selected?: boolean;
}

export const ArrivalRow = ({ arrival, href, onSelect, selected = false }: ArrivalRowProps) => {
  const inactive = arrival.status !== 'ok' || arrival.buses.length === 0;
  const content = (
    <>
      <LinePlate service={arrival.service} color={arrival.color} size={52} muted={inactive} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`line-clamp-2 text-xl font-bold leading-6 ${inactive ? 'text-mute' : ''}`}>
          {arrival.destination ?? 'Destino no informado'}
        </span>
        <span className="text-[13px] font-medium leading-4 text-mute">{arrivalSubline(arrival)}</span>
      </span>
      <EtaDisplay arrival={arrival} />
    </>
  );
  const className = `flex min-h-[88px] w-full items-center gap-4 border-b border-rule py-4 text-left ${selected ? 'bg-white' : ''}`;
  const label = spokenArrival(arrival.service, arrival.buses[0]?.eta);
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={className} aria-label={label} aria-pressed={selected}>
        {content}
      </button>
    );
  }
  return (
    <Link href={href ?? '#'} className={className} aria-label={label}>
      {content}
    </Link>
  );
};

export const Freshness = ({ state, dark = false }: { state: ArrivalsState; dark?: boolean }) => {
  const { data, failing, loading, ageSeconds } = state;
  const track = dark ? 'bg-body' : 'bg-rule';
  const fill = dark ? 'bg-paper' : 'bg-ink';
  const stale = failing || data?.stale === true;
  if (!data) {
    return (
      <div className="flex flex-col gap-2" role="status">
        <div className={`h-1 ${track}`} />
        <span className="text-[13px] font-bold leading-4">{failing ? 'Sin conexión' : loading ? 'Cargando…' : ''}</span>
      </div>
    );
  }
  const remaining = stale ? 0 : Math.max(0, 1 - ageSeconds / 15);
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      {stale ? (
        <div className={`h-0 border-t-4 border-dashed ${dark ? 'border-mute' : 'border-mute'}`} />
      ) : (
        <div className={`h-1 ${track}`}>
          <div className={`h-1 origin-left ${fill} transition-[width] duration-1000 ease-linear`} style={{ width: `${remaining * 100}%` }} />
        </div>
      )}
      <span className="text-[13px] font-bold leading-4">
        {stale ? `Sin conexión · último dato ${formatAge(ageSeconds)}` : `Actualizado ${formatAge(ageSeconds)}`}
      </span>
    </div>
  );
};

export const PrimaryButton = ({
  children,
  onClick,
  href,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) => {
  const className =
    'flex h-target w-full items-center justify-between rounded bg-ink px-5 text-[17px] font-extrabold text-paper disabled:opacity-50';
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
};

export const SecondaryButton = ({
  children,
  onClick,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) => {
  const className = 'flex h-target w-full items-center justify-between rounded border-2 border-ink px-5 text-[17px] font-extrabold';
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
};

export const ScreenHeader = ({
  label,
  title,
  children,
  big = false,
}: {
  label: string;
  title: string;
  children?: ReactNode;
  big?: boolean;
}) => (
  <header className="safe-top bg-ink px-5 pb-5 pt-7 text-paper lg:px-12">
    <div className="mx-auto flex max-w-4xl flex-col gap-1.5">
      <span className="text-label uppercase">{label}</span>
      <h1 className={big ? 'text-[44px] font-extrabold leading-[46px] tracking-[-0.03em] lg:text-sign' : 'text-stop'}>{title}</h1>
      {children}
    </div>
  </header>
);

export const Notice = ({ title, body, children }: { title: string; body?: string; children?: ReactNode }) => (
  <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 py-10 lg:px-12" role="status">
    <h2 className="text-[26px] font-extrabold leading-[30px] tracking-[-0.02em]">{title}</h2>
    {body ? <p className="text-[17px] leading-6 text-body">{body}</p> : null}
    {children}
  </div>
);
