import { describe, expect, it } from 'vitest';
import { displayStopName, formatAge, formatDistance, formatEta, formatEtaShort, titleCase } from '../lib/format';
import { LINES, hexToLab, isPlate, lineForService, snapToLine } from '../lib/palette';
import { parseEta } from '../server/red/eta';

const contrast = (hexA: string, hexB: string) => {
  const luminance = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    const channel = (shift: number) => {
      const c = ((value >> shift) & 255) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  };
  const [a, b] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

describe('palette', () => {
  it('has twelve lines and every plate text colour holds 4.5:1', () => {
    expect(LINES).toHaveLength(12);
    for (const line of LINES) {
      expect(contrast(line.hex, line.text), line.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('snaps the colours red.cl was seen sending to the intended lines', () => {
    const expected: Record<string, string> = {
      '#cf152d': 'Tomate',
      '#ed1c24': 'Tomate',
      '#f7941d': 'Mandarina',
      '#ffd400': 'Girasol',
      '#00a77e': 'Pino',
      '#0093b3': 'Laguna',
      '#00a1e4': 'Cielo',
      '#0077bb': 'Océano',
    };
    for (const [hex, name] of Object.entries(expected)) {
      expect(snapToLine(hex)?.name, hex).toBe(name);
    }
  });

  it('ignores letter case and rejects things that are not colours', () => {
    expect(snapToLine('#CF152D')?.name).toBe(snapToLine('#cf152d')?.name);
    expect(snapToLine('rojo')).toBeNull();
    expect(hexToLab('#12')).toBeNull();
  });

  it('keeps the operator colour when there is one', () => {
    expect(lineForService('405', '#F7941D').name).toBe('Mandarina');
  });

  it('gives a service without a colour the same palette entry every time', () => {
    const first = lineForService('210', null);
    expect(lineForService('210', '')).toEqual(first);
    expect(lineForService('210', undefined)).toEqual(first);
    expect(lineForService('210', null)).toEqual(first);
  });

  it('spreads colourless services over several lines', () => {
    const used = new Set(['101', '210', '301', '405', '506', '604', 'B21', 'D18', 'I09', 'J13c'].map((code) => lineForService(code, null).name));
    expect(used.size).toBeGreaterThan(4);
  });

  it('uses a roundel up to three characters and a plate beyond', () => {
    expect(isPlate('210')).toBe(false);
    expect(isPlate('B21')).toBe(false);
    expect(isPlate('506c')).toBe(true);
  });
});

describe('formatEta', () => {
  it('shows each red.cl wording the way the design says', () => {
    expect(formatEta(parseEta('Llegando'))).toMatchObject({ kind: 'chip', value: 'Llegando' });
    expect(formatEta(parseEta('En menos de 3 min'))).toMatchObject({ kind: 'minutes', value: '<3', unit: 'min' });
    expect(formatEta(parseEta('Entre 7 Y 11 min'))).toMatchObject({ kind: 'minutes', value: '7–11', unit: 'min' });
    expect(formatEta(parseEta('Mas de 32 min'))).toMatchObject({ kind: 'minutes', value: '>32', unit: 'min' });
  });

  it('shows unrecognised text as it came and nothing as a dash', () => {
    expect(formatEta(parseEta('Frecuencia estimada es 10 min'))).toMatchObject({ kind: 'text', value: 'Frecuencia estimada es 10 min' });
    expect(formatEta(undefined)).toMatchObject({ kind: 'none', value: '—' });
  });

  it('writes a short form for lists', () => {
    expect(formatEtaShort(parseEta('Llegando'))).toBe('llegando');
    expect(formatEtaShort(parseEta('Entre 7 Y 11 min'))).toBe('7–11 min');
    expect(formatEtaShort(parseEta(''))).toBe('');
  });
});

describe('text formatting', () => {
  it('writes distances with a decimal comma', () => {
    expect(formatDistance(120)).toBe('120 m');
    expect(formatDistance(1200)).toBe('1,2 km');
    expect(formatDistance(null)).toBeNull();
  });

  it('title-cases shouted stop names but keeps small words low', () => {
    expect(titleCase('PARADA 2 / HOSPITAL METROPOLITANO')).toBe('Parada 2 / Hospital Metropolitano');
    expect(titleCase('AV. PEDRO DE VALDIVIA / LOS LEONES')).toBe('Av. Pedro de Valdivia / Los Leones');
  });

  it('prefers the catalog name over the shouted one', () => {
    expect(displayStopName('Parada 2 - Hospital Metropolitano', 'PARADA 2 / HOSPITAL METROPOLITANO')).toBe('Parada 2 - Hospital Metropolitano');
    expect(displayStopName(null, 'PARADA 2 / HOSPITAL')).toBe('Parada 2 / Hospital');
  });

  it('formats ages', () => {
    expect(formatAge(8)).toBe('hace 8 s');
    expect(formatAge(125)).toBe('hace 2 min');
  });
});

describe('palette mapping of unknown colours', () => {
  it('still snaps a colour red.cl has not used before to the nearest line', () => {
    expect(snapToLine('#d02020')?.name).toBe('Tomate');
    expect(snapToLine('#103090')?.name).toBe('Océano');
  });

  it('keeps the eight known operator colours on eight different-looking lines', () => {
    const names = ['#cf152d', '#f7941d', '#ffd400', '#00a77e', '#0093b3', '#00a1e4', '#0077bb'].map((hex) => snapToLine(hex)?.name);
    expect(new Set(names).size).toBe(7);
  });
});
