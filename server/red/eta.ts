import type { Eta } from './types';

const ARRIVING = /^Llegando\.?$/i;
const UNDER = /^En menos de (\d+) min\.?$/i;
const BETWEEN = /^Entre (\d+) Y (\d+) min\.?$/i;
const OVER = /^M[aá]s de (\d+) min\.?$/i;

export const parseEta = (raw: string | null | undefined): Eta => {
  const text = (raw ?? '').trim();
  if (text === '') return { raw: '', kind: 'none', minMinutes: null, maxMinutes: null };
  if (ARRIVING.test(text)) return { raw: text, kind: 'arriving', minMinutes: 0, maxMinutes: 0 };

  const under = UNDER.exec(text);
  if (under) return { raw: text, kind: 'under', minMinutes: 0, maxMinutes: Number(under[1]) };

  const between = BETWEEN.exec(text);
  if (between) {
    const [low, high] = [Number(between[1]), Number(between[2])].sort((a, b) => a - b);
    return { raw: text, kind: 'between', minMinutes: low, maxMinutes: high };
  }

  const over = OVER.exec(text);
  if (over) return { raw: text, kind: 'over', minMinutes: Number(over[1]), maxMinutes: null };

  return { raw: text, kind: 'unknown', minMinutes: null, maxMinutes: null };
};

export const etaSortMinutes = (eta: Eta): number => {
  switch (eta.kind) {
    case 'arriving':
      return 0;
    case 'under':
      return (eta.maxMinutes ?? 0) / 2;
    case 'between':
      return ((eta.minMinutes ?? 0) + (eta.maxMinutes ?? 0)) / 2;
    case 'over':
      return (eta.minMinutes ?? 0) + 1;
    case 'none':
    case 'unknown':
      return Number.POSITIVE_INFINITY;
  }
};
