import type { Eta } from '@/server/red/types';

export interface EtaView {
  kind: 'chip' | 'minutes' | 'text' | 'none';
  value: string;
  unit: string;
  label: string;
}

export const formatEta = (eta: Eta | undefined): EtaView => {
  if (!eta || eta.kind === 'none') return { kind: 'none', value: '—', unit: '', label: 'Sin información' };
  switch (eta.kind) {
    case 'arriving':
      return { kind: 'chip', value: 'Llegando', unit: '', label: 'Llegando' };
    case 'under':
      return { kind: 'minutes', value: `<${eta.maxMinutes}`, unit: 'min', label: `en menos de ${eta.maxMinutes} minutos` };
    case 'between':
      return {
        kind: 'minutes',
        value: `${eta.minMinutes}–${eta.maxMinutes}`,
        unit: 'min',
        label: `entre ${eta.minMinutes} y ${eta.maxMinutes} minutos`,
      };
    case 'over':
      return { kind: 'minutes', value: `>${eta.minMinutes}`, unit: 'min', label: `en más de ${eta.minMinutes} minutos` };
    case 'unknown':
      return { kind: 'text', value: eta.raw, unit: '', label: eta.raw };
  }
};

export const formatEtaShort = (eta: Eta | undefined): string => {
  const view = formatEta(eta);
  if (view.kind === 'chip') return 'llegando';
  if (view.kind === 'none') return '';
  return view.unit ? `${view.value} ${view.unit}` : view.value;
};

export const formatDistance = (meters: number | null | undefined): string | null => {
  if (meters === null || meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
};

const SMALL_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'con', 'a', 'en', 'al']);

export const titleCase = (text: string): string => {
  let startOfSegment = true;
  return text
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (part === '') return part;
      if (/^\s+$/.test(part)) return part;
      if (part === '/' || part === '-') {
        startOfSegment = true;
        return part;
      }
      const keepLow = !startOfSegment && SMALL_WORDS.has(part);
      startOfSegment = false;
      return keepLow ? part : part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

export const displayStopName = (catalogName: string | null | undefined, apiName: string): string =>
  catalogName ?? titleCase(apiName);

export const formatAge = (seconds: number): string => {
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `hace ${minutes} min`;
};

export const spokenArrival = (service: string, eta: Eta | undefined): string => {
  const view = formatEta(eta);
  return view.kind === 'none' ? `Servicio ${service}, sin información` : `Servicio ${service}, ${view.label}`;
};
