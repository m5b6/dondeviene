import { describe, expect, it } from 'vitest';
import {
  busExtrusions,
  circleRing,
  headingBetween,
  rectangleRing,
  ribbonRings,
  routeExtrusions,
  stopExtrusions,
  userExtrusions,
  zoomScale,
} from '../lib/geometry3d';
import { haversineMeters } from '../server/red/geo';

const center = { latitude: -33.4372, longitude: -70.6506 };
const near = (value: number, expected: number, tolerance: number) => expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);
const distance = (a: [number, number], b: [number, number]) => haversineMeters(a[1], a[0], b[1], b[0]);

describe('circleRing', () => {
  it('is closed and every vertex sits at the radius', () => {
    const ring = circleRing(center, 12, 16);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring).toHaveLength(17);
    for (const vertex of ring) near(distance([center.longitude, center.latitude], vertex), 12, 0.2);
  });
});

describe('rectangleRing', () => {
  it('has the requested length and width, pointing along the heading', () => {
    const ring = rectangleRing(center, 90, 40, 16);
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    near(distance(ring[0], ring[3]), 40, 0.5);
    near(distance(ring[0], ring[1]), 16, 0.5);
    const eastEdge = Math.abs(ring[0][0] - ring[3][0]);
    const northEdge = Math.abs(ring[0][1] - ring[3][1]);
    expect(eastEdge).toBeGreaterThan(northEdge * 50);
  });

  it('turns with the heading', () => {
    const north = rectangleRing(center, 0, 40, 10);
    const eastEdge = Math.abs(north[0][0] - north[3][0]);
    const northEdge = Math.abs(north[0][1] - north[3][1]);
    expect(northEdge).toBeGreaterThan(eastEdge * 50);
  });

  it('can shift forward along its heading', () => {
    const base = rectangleRing(center, 0, 20, 10);
    const shifted = rectangleRing(center, 0, 20, 10, 10);
    near((shifted[0][1] - base[0][1]) * 111_320, 10, 0.5);
  });
});

describe('ribbonRings', () => {
  const east = (meters: number): [number, number] => [center.latitude, center.longitude + meters / (111_320 * Math.cos((33.4372 * Math.PI) / 180))];

  it('wraps a straight path at the requested width', () => {
    const rings = ribbonRings([east(0), east(100), east(200)], 16);
    expect(rings).toHaveLength(1);
    const ring = rings[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    near(distance(ring[0], ring[ring.length - 2]), 16, 0.5);
  });

  it('needs two distinct points', () => {
    expect(ribbonRings([east(0)], 10)).toEqual([]);
    expect(ribbonRings([east(0), east(0)], 10)).toEqual([]);
  });

  it('splits very long paths into several pieces that together cover the path', () => {
    const path = Array.from({ length: 400 }, (_, index) => east(index * 20));
    const rings = ribbonRings(path, 10);
    expect(rings.length).toBeGreaterThan(2);
    for (const ring of rings) expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('keeps corners from spiking out', () => {
    const cornerPoint = east(100);
    const bend: Array<[number, number]> = [east(0), cornerPoint, [center.latitude + 100 / 111_320, cornerPoint[1]]];
    const ring = ribbonRings(bend, 16)[0];
    const leftCorner = ring[1];
    const rightCorner = ring[ring.length - 3];
    const corner: [number, number] = [cornerPoint[1], cornerPoint[0]];
    expect(distance(leftCorner, corner)).toBeLessThanOrEqual(16 + 0.5);
    expect(distance(rightCorner, corner)).toBeLessThanOrEqual(16 + 0.5);
    expect(distance(leftCorner, rightCorner)).toBeGreaterThan(8);
  });
});

describe('headingBetween', () => {
  it('measures compass degrees clockwise from north', () => {
    near(headingBetween(center, { ...center, latitude: center.latitude + 0.001 }), 0, 0.1);
    near(headingBetween(center, { ...center, longitude: center.longitude + 0.001 }), 90, 0.1);
    near(headingBetween(center, { ...center, latitude: center.latitude - 0.001 }), 180, 0.1);
    near(headingBetween(center, { ...center, longitude: center.longitude - 0.001 }), 270, 0.1);
  });

  it('is zero for the same point', () => {
    expect(headingBetween(center, center)).toBe(0);
  });
});

describe('extrusion builders', () => {
  it('raises the route as a white ribbon under a coloured one', () => {
    const features = routeExtrusions([[center.latitude, center.longitude], [center.latitude, center.longitude + 0.002]], '#F26B0F');
    const colors = features.map((feature) => feature.properties.color);
    expect(colors).toContain('#FFFFFF');
    expect(colors).toContain('#F26B0F');
    const route = features.find((feature) => feature.properties.color === '#F26B0F');
    const casing = features.find((feature) => feature.properties.color === '#FFFFFF');
    expect((route?.properties.height ?? 0) > (casing?.properties.height ?? 0)).toBe(true);
  });

  it('builds a yellow pillar for the highlighted stop and a small post for the others', () => {
    const pillar = stopExtrusions({ ...center, code: 'PC187', highlight: true });
    const post = stopExtrusions({ ...center, code: 'PC402' });
    expect(Math.max(...pillar.map((feature) => feature.properties.height))).toBeGreaterThan(Math.max(...post.map((feature) => feature.properties.height)) * 2);
    expect(pillar.some((feature) => feature.properties.color === '#FFC20E')).toBe(true);
    expect(pillar.every((feature) => feature.properties.code === 'PC187')).toBe(true);
  });

  it('stacks a bus from chassis to roof in its line colour', () => {
    const bus = busExtrusions({ ...center, color: '#00A19A', heading: 45 });
    const heights = bus.map((feature) => feature.properties.height);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(bus.filter((feature) => feature.properties.color === '#00A19A').length).toBe(2);
    expect(bus.some((feature) => feature.properties.color === '#E8F6FF')).toBe(true);
    for (const feature of bus) expect(feature.properties.base).toBeLessThan(feature.properties.height);
  });

  it('builds a blue beacon for the user', () => {
    const beacon = userExtrusions(center);
    expect(beacon.some((feature) => feature.properties.color === '#0057B8')).toBe(true);
  });

  it('grows every object together when scaled', () => {
    const small = busExtrusions({ ...center, color: '#00A19A', heading: 0 }, 1);
    const big = busExtrusions({ ...center, color: '#00A19A', heading: 0 }, 3);
    expect(Math.max(...big.map((feature) => feature.properties.height))).toBeCloseTo(Math.max(...small.map((feature) => feature.properties.height)) * 3, 5);
    near(distance(big[1].geometry.coordinates[0][0], big[1].geometry.coordinates[0][3]), 36 * 3, 1);
    const wideRoute = routeExtrusions([[center.latitude, center.longitude], [center.latitude, center.longitude + 0.002]], '#F26B0F', 2);
    expect(Math.max(...wideRoute.map((feature) => feature.properties.height))).toBe(14);
  });
});

describe('zoomScale', () => {
  it('is real size when close in and bigger the further out you are, capped', () => {
    expect(zoomScale(17.5)).toBe(1);
    expect(zoomScale(16.6)).toBe(1);
    expect(zoomScale(15.6)).toBeCloseTo(2, 5);
    expect(zoomScale(10)).toBe(4);
  });
});
