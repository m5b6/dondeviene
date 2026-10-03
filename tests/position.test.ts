import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../server/red/geo';
import {
  type PathPoint,
  estimateBusPosition,
  pathLengthsFromStart,
  pointAtDistance,
  projectOntoPath,
} from '../lib/position';

const METERS_PER_DEGREE = 111_320;
const eastWest = (index: number): PathPoint => [-33.4, -70.6 + (index * 100) / (METERS_PER_DEGREE * Math.cos((33.4 * Math.PI) / 180))];
const straightPath: PathPoint[] = [0, 1, 2, 3, 4, 5].map(eastWest);
const near = (value: number, expected: number, tolerance: number) => expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);

describe('pathLengthsFromStart', () => {
  it('accumulates segment lengths', () => {
    const cumulative = pathLengthsFromStart(straightPath);
    expect(cumulative[0]).toBe(0);
    near(cumulative[5], 500, 2);
  });
});

describe('projectOntoPath', () => {
  it('places a point on the path and measures how far off it is', () => {
    const stop = { latitude: straightPath[3][0] + 20 / METERS_PER_DEGREE, longitude: straightPath[3][1] };
    const projection = projectOntoPath(straightPath, stop);
    near(projection?.distanceFromStartMeters ?? 0, 300, 2);
    near(projection?.offsetMeters ?? 0, 20, 1);
  });

  it('needs at least two points', () => {
    expect(projectOntoPath([[-33.4, -70.6]], { latitude: -33.4, longitude: -70.6 })).toBeNull();
  });
});

describe('pointAtDistance', () => {
  it('interpolates along the path', () => {
    const point = pointAtDistance(straightPath, 250);
    near(haversineMeters(straightPath[0][0], straightPath[0][1], point?.latitude ?? 0, point?.longitude ?? 0), 250, 2);
  });

  it('clamps before the start and after the end', () => {
    expect(pointAtDistance(straightPath, -10)).toEqual({ latitude: straightPath[0][0], longitude: straightPath[0][1] });
    expect(pointAtDistance(straightPath, 99_999)).toEqual({ latitude: straightPath[5][0], longitude: straightPath[5][1] });
  });
});

describe('estimateBusPosition', () => {
  const stop = { latitude: straightPath[4][0], longitude: straightPath[4][1] };

  it('puts a bus the reported distance behind the stop, along the route', () => {
    const estimate = estimateBusPosition(straightPath, stop, 250);
    expect(estimate?.clamped).toBe(false);
    near(haversineMeters(stop.latitude, stop.longitude, estimate?.position.latitude ?? 0, estimate?.position.longitude ?? 0), 250, 3);
    expect(estimate?.position.longitude).toBeLessThan(stop.longitude);
  });

  it('points the bus along the direction of travel', () => {
    const estimate = estimateBusPosition(straightPath, stop, 250);
    near(estimate?.headingDegrees ?? 0, 90, 1);
  });

  it('puts an arriving bus at the stop', () => {
    const estimate = estimateBusPosition(straightPath, stop, 0);
    near(haversineMeters(stop.latitude, stop.longitude, estimate?.position.latitude ?? 0, estimate?.position.longitude ?? 0), 0, 2);
  });

  it('clamps to the start of the route when the bus is further back than the path goes', () => {
    const estimate = estimateBusPosition(straightPath, stop, 5000);
    expect(estimate?.clamped).toBe(true);
    expect(estimate?.position).toEqual({ latitude: straightPath[0][0], longitude: straightPath[0][1] });
  });

  it('refuses to guess when the stop is not near the path', () => {
    const farStop = { latitude: stop.latitude + 0.01, longitude: stop.longitude };
    expect(estimateBusPosition(straightPath, farStop, 200)).toBeNull();
  });

  it('refuses nonsense distances', () => {
    expect(estimateBusPosition(straightPath, stop, Number.NaN)).toBeNull();
    expect(estimateBusPosition(straightPath, stop, -5)).toBeNull();
  });

  it('follows a bend instead of cutting the corner', () => {
    const bend: PathPoint[] = [
      [-33.4, -70.6],
      [-33.4, -70.599],
      [-33.399, -70.599],
    ];
    const end = { latitude: bend[2][0], longitude: bend[2][1] };
    const around = estimateBusPosition(bend, end, 150);
    expect(around).not.toBeNull();
    const corner = bend[1];
    const distanceToCorner = haversineMeters(corner[0], corner[1], around?.position.latitude ?? 0, around?.position.longitude ?? 0);
    const distanceToEnd = haversineMeters(end.latitude, end.longitude, around?.position.latitude ?? 0, around?.position.longitude ?? 0);
    expect(distanceToEnd).toBeLessThan(150 + 3);
    expect(distanceToEnd).toBeGreaterThan(100);
    expect(distanceToCorner).toBeLessThan(60);
  });
});
