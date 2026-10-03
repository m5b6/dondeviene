import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAYFUL, type StyleLike, playfulStyle } from '../lib/map-style';

const liberty = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/openfreemap-liberty.json'), 'utf8')) as StyleLike;
const styled = playfulStyle(liberty);
const layer = (id: string) => styled.layers.find((item) => item.id === id);

describe('playfulStyle on OpenFreeMap liberty', () => {
  it('does not change the original style object', () => {
    const background = liberty.layers.find((item) => item.id === 'background');
    expect(background?.paint?.['background-color']).not.toBe(PLAYFUL.land);
  });

  it('paints the land, water and parks in the playful palette', () => {
    expect(layer('background')?.paint?.['background-color']).toBe(PLAYFUL.land);
    expect(layer('water')?.paint?.['fill-color']).toBe(PLAYFUL.water);
    expect(layer('park')?.paint?.['fill-color']).toBe(PLAYFUL.park);
    expect(layer('landcover_wood')?.paint?.['fill-color']).toBe(PLAYFUL.wood);
  });

  it('makes the 3D buildings solid, coloured by height, from a lower zoom', () => {
    const buildings = layer('building-3d');
    expect(buildings?.paint?.['fill-extrusion-opacity']).toBe(1);
    expect(JSON.stringify(buildings?.paint?.['fill-extrusion-color'])).toContain('render_height');
    expect(buildings?.paint?.['fill-extrusion-vertical-gradient']).toBe(true);
    expect(buildings?.minzoom).toBe(12);
    expect(buildings?.paint?.['fill-extrusion-height']).toEqual(['get', 'render_height']);
  });

  it('gives roads friendly solid colours and round ends, widest roads boldest', () => {
    expect(layer('road_minor')?.paint?.['line-color']).toBe('#FFFFFF');
    expect(layer('road_motorway')?.paint?.['line-color']).toBe('#FF9E80');
    expect(layer('road_trunk_primary')?.paint?.['line-color']).toBe('#FFC857');
    expect(layer('road_minor')?.layout?.['line-cap']).toBe('round');
    expect(layer('road_motorway_casing')?.paint?.['line-color']).toBe('#E8745A');
  });

  it('keeps tunnels visible but fainter than surface roads', () => {
    expect(layer('tunnel_motorway')?.paint?.['line-opacity']).toBe(0.55);
    expect(layer('road_motorway')?.paint?.['line-opacity']).toBe(1);
  });

  it('drops the clutter and the natural-earth raster', () => {
    const ids = styled.layers.map((item) => item.id);
    expect(ids.some((id) => /shield|^poi/.test(id))).toBe(false);
    expect(styled.layers.some((item) => item.type === 'raster')).toBe(false);
    expect(layer('boundary_2')?.layout?.visibility).toBe('none');
  });

  it('keeps street and place names, readable on the cream land', () => {
    expect(layer('highway-name-major')?.paint?.['text-color']).toBe(PLAYFUL.label);
    expect(layer('label_city')?.paint?.['text-halo-color']).toBe(PLAYFUL.halo);
  });

  it('adds soft daylight for the extrusions', () => {
    expect(styled.light).toMatchObject({ anchor: 'map', intensity: 0.55 });
  });

  it('leaves no layer pointing at a source that does not exist', () => {
    const sources = Object.keys(liberty.sources as Record<string, unknown>);
    for (const item of styled.layers) {
      if (typeof item.source === 'string') expect(sources).toContain(item.source);
    }
  });
});
