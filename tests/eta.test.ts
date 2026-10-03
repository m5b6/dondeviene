import { describe, expect, it } from 'vitest';
import { etaSortMinutes, parseEta } from '../server/red/eta';

describe('parseEta', () => {
  it('reads every template red.cl was seen sending', () => {
    expect(parseEta('Llegando')).toMatchObject({ kind: 'arriving', minMinutes: 0, maxMinutes: 0 });
    expect(parseEta('En menos de 3 min')).toMatchObject({ kind: 'under', minMinutes: 0, maxMinutes: 3 });
    expect(parseEta('Entre 7 Y 11 min')).toMatchObject({ kind: 'between', minMinutes: 7, maxMinutes: 11 });
    expect(parseEta('Mas de 32 min')).toMatchObject({ kind: 'over', minMinutes: 32, maxMinutes: null });
  });

  it('treats blank and missing text as no prediction', () => {
    expect(parseEta('').kind).toBe('none');
    expect(parseEta(null).kind).toBe('none');
    expect(parseEta('   ').kind).toBe('none');
  });

  it('never invents numbers for text it does not recognise', () => {
    const eta = parseEta('Frecuencia estimada es 10 min');
    expect(eta).toEqual({ raw: 'Frecuencia estimada es 10 min', kind: 'unknown', minMinutes: null, maxMinutes: null });
  });

  it('puts range bounds in ascending order', () => {
    expect(parseEta('Entre 11 Y 7 min')).toMatchObject({ minMinutes: 7, maxMinutes: 11 });
  });

  it('orders buses by how soon they are expected', () => {
    const ordered = ['Mas de 32 min', 'Entre 7 Y 11 min', 'En menos de 3 min', 'Llegando']
      .map(parseEta)
      .sort((a, b) => etaSortMinutes(a) - etaSortMinutes(b))
      .map((eta) => eta.kind);
    expect(ordered).toEqual(['arriving', 'under', 'between', 'over']);
  });

  it('sorts unknown and empty after real predictions', () => {
    expect(etaSortMinutes(parseEta('???'))).toBe(Number.POSITIVE_INFINITY);
    expect(etaSortMinutes(parseEta(''))).toBe(Number.POSITIVE_INFINITY);
  });
});
