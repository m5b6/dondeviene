export interface Line {
  name: string;
  hex: string;
  text: '#FFFFFF' | '#121212';
}

export const LINES: Line[] = [
  { name: 'Tomate', hex: '#D5281B', text: '#FFFFFF' },
  { name: 'Mandarina', hex: '#F26B0F', text: '#121212' },
  { name: 'Girasol', hex: '#FFC20E', text: '#121212' },
  { name: 'Pistacho', hex: '#8DC63F', text: '#121212' },
  { name: 'Pino', hex: '#00843D', text: '#FFFFFF' },
  { name: 'Laguna', hex: '#00A19A', text: '#121212' },
  { name: 'Cielo', hex: '#4FB0E5', text: '#121212' },
  { name: 'Océano', hex: '#0057B8', text: '#FFFFFF' },
  { name: 'Uva', hex: '#6A2C91', text: '#FFFFFF' },
  { name: 'Frambuesa', hex: '#C2185B', text: '#FFFFFF' },
  { name: 'Tierra', hex: '#7A4B2A', text: '#FFFFFF' },
  { name: 'Grafito', hex: '#2B2B2B', text: '#FFFFFF' },
];

type Lab = [number, number, number];

const linearize = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const labCurve = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);

export const hexToLab = (hex: string): Lab | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  const r = linearize((value >> 16) & 255);
  const g = linearize((value >> 8) & 255);
  const b = linearize(value & 255);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const [fx, fy, fz] = [labCurve(x), labCurve(y), labCurve(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

const distance = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const PALETTE_LAB = LINES.map((line) => ({ line, lab: hexToLab(line.hex) as Lab }));

const byName = (name: string): Line => LINES.find((line) => line.name === name) as Line;

const KNOWN_BUS_COLORS: Record<string, Line> = {
  '#cf152d': byName('Tomate'),
  '#ed1c24': byName('Tomate'),
  '#f7941d': byName('Mandarina'),
  '#ffd400': byName('Girasol'),
  '#00a77e': byName('Pino'),
  '#0093b3': byName('Laguna'),
  '#00a1e4': byName('Cielo'),
  '#0077bb': byName('Océano'),
};

export const snapToLine = (hex: string): Line | null => {
  const known = KNOWN_BUS_COLORS[hex.trim().toLowerCase()];
  if (known) return known;
  const lab = hexToLab(hex);
  if (!lab) return null;
  let best = PALETTE_LAB[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of PALETTE_LAB) {
    const d = distance(lab, entry.lab);
    if (d < bestDistance) {
      best = entry;
      bestDistance = d;
    }
  }
  return best.line;
};

const hashCode = (text: string) => {
  let hash = 5381;
  for (let index = 0; index < text.length; index++) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  return hash;
};

export const lineForService = (service: string, apiColor: string | null | undefined): Line => {
  if (apiColor) {
    const snapped = snapToLine(apiColor);
    if (snapped) return snapped;
  }
  return LINES[hashCode(service.toUpperCase()) % LINES.length];
};

export const isPlate = (service: string) => service.length > 3;
