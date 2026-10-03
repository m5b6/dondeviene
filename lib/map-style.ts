export const PLAYFUL = {
  land: '#FFF1D6',
  residential: '#FFE8C4',
  park: '#B6E59C',
  wood: '#98D984',
  pitch: '#A5E0AE',
  sand: '#FFE29A',
  water: '#7FCDF5',
  hospital: '#FFD0D8',
  school: '#FFE3A0',
  building: '#FFCFBE',
  label: '#3B2A5A',
  halo: '#FFF8E8',
  rail: '#C9B8FF',
  sky: '#BFE7FF',
} as const;

const ROADS: Array<{ match: RegExp; fill: string; casing: string; boost: number }> = [
  { match: /motorway/, fill: '#FF9E80', casing: '#E8745A', boost: 1.25 },
  { match: /trunk_primary/, fill: '#FFC857', casing: '#E5A431', boost: 1.2 },
  { match: /secondary_tertiary|^(road|bridge|tunnel)_link/, fill: '#FFE48A', casing: '#EBC25A', boost: 1.15 },
  { match: /street|minor|service_track|path_pedestrian/, fill: '#FFFFFF', casing: '#F1D3A0', boost: 1.1 },
];

const REMOVED_SYMBOLS = /^(poi|highway-shield|road_shield|airport|road_one_way|label_country|label_state)/;

type Json = Record<string, unknown>;

interface StyleLayer extends Json {
  id: string;
  type: string;
  paint?: Json;
  layout?: Json;
  minzoom?: number;
  maxzoom?: number;
}

export interface StyleLike extends Json {
  layers: StyleLayer[];
}

const withPaint = (layer: StyleLayer, paint: Json): StyleLayer => ({ ...layer, paint: { ...layer.paint, ...paint } });
const withLayout = (layer: StyleLayer, layout: Json): StyleLayer => ({ ...layer, layout: { ...layer.layout, ...layout } });

const scaleWidth = (width: unknown, factor: number): unknown => {
  if (typeof width === 'number') return width * factor;
  if (Array.isArray(width) && width[0] === 'interpolate') {
    return width.map((part, index) => (index >= 4 && index % 2 === 0 && typeof part === 'number' ? part * factor : part));
  }
  return width;
};

const roadRule = (id: string) => ROADS.find((rule) => rule.match.test(id));

const recolorLine = (layer: StyleLayer): StyleLayer => {
  const id = layer.id;
  if (/^boundary/.test(id)) return withLayout(layer, { visibility: 'none' });
  if (/waterway/.test(id)) return withPaint(layer, { 'line-color': PLAYFUL.water });
  if (/park_outline/.test(id)) return withPaint(layer, { 'line-color': PLAYFUL.wood });
  if (/rail/.test(id)) return withPaint(layer, { 'line-color': PLAYFUL.rail });
  if (/^aeroway/.test(id)) return withPaint(layer, { 'line-color': '#FFFFFF' });
  const rule = roadRule(id);
  if (!rule) return layer;
  const casing = /casing$/.test(id);
  const tunnel = /^tunnel/.test(id);
  const rounded = withLayout(layer, { 'line-cap': 'round', 'line-join': 'round' });
  return withPaint(rounded, {
    'line-color': casing ? rule.casing : rule.fill,
    'line-width': scaleWidth(layer.paint?.['line-width'], rule.boost),
    'line-opacity': tunnel ? 0.55 : 1,
  });
};

const FILL_COLORS: Array<[RegExp, string]> = [
  [/^park$/, PLAYFUL.park],
  [/landcover_wood/, PLAYFUL.wood],
  [/landcover_grass|landcover_wetland/, PLAYFUL.park],
  [/landuse_pitch|landuse_track|landuse_cemetery/, PLAYFUL.pitch],
  [/landuse_residential/, PLAYFUL.residential],
  [/landuse_hospital/, PLAYFUL.hospital],
  [/landuse_school/, PLAYFUL.school],
  [/landcover_sand/, PLAYFUL.sand],
  [/^water$/, PLAYFUL.water],
  [/landcover_ice/, '#FFFFFF'],
  [/aeroway/, '#F5E6C8'],
  [/road_area_pattern/, '#FFFFFF'],
];

const recolorFill = (layer: StyleLayer): StyleLayer => {
  if (layer.id === 'building') return { ...withPaint(layer, { 'fill-color': PLAYFUL.building, 'fill-outline-color': '#F2B7A3' }), minzoom: 12, maxzoom: 13 };
  const match = FILL_COLORS.find(([pattern]) => pattern.test(layer.id));
  return match ? withPaint(layer, { 'fill-color': match[1], 'fill-opacity': 1 }) : layer;
};

const recolorBuildings3d = (layer: StyleLayer): StyleLayer => ({
  ...withPaint(layer, {
    'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'render_height'], 0, '#FFC8B4', 18, '#FFB3C7', 45, '#E2B6F4', 110, '#B7C6FF'],
    'fill-extrusion-opacity': 1,
    'fill-extrusion-vertical-gradient': true,
  }),
  minzoom: 12,
});

const recolorSymbol = (layer: StyleLayer): StyleLayer | null => {
  if (REMOVED_SYMBOLS.test(layer.id)) return null;
  return withPaint(layer, {
    'text-color': PLAYFUL.label,
    'text-halo-color': PLAYFUL.halo,
    'text-halo-width': 2,
    'text-halo-blur': 0.5,
  });
};

export const playfulStyle = <T extends StyleLike>(style: T): T => {
  const layers: StyleLayer[] = [];
  for (const layer of style.layers) {
    switch (layer.type) {
      case 'background':
        layers.push(withPaint(layer, { 'background-color': PLAYFUL.land }));
        break;
      case 'raster':
        break;
      case 'fill':
        layers.push(recolorFill(layer));
        break;
      case 'fill-extrusion':
        layers.push(recolorBuildings3d(layer));
        break;
      case 'line':
        layers.push(recolorLine(layer));
        break;
      case 'symbol': {
        const symbol = recolorSymbol(layer);
        if (symbol) layers.push(symbol);
        break;
      }
      default:
        layers.push(layer);
    }
  }
  return {
    ...style,
    layers,
    light: { anchor: 'map', position: [1.4, 200, 45], intensity: 0.55, color: '#FFFFFF' },
  };
};

export const SKY = {
  'sky-color': PLAYFUL.sky,
  'horizon-color': PLAYFUL.land,
  'fog-color': PLAYFUL.land,
  'sky-horizon-blend': 0.6,
  'horizon-fog-blend': 0.8,
  'fog-ground-blend': 0.9,
};

export const MAP_PITCH = 58;
export const MAP_BEARING = -17;
