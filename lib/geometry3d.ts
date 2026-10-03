export interface LngLat {
  longitude: number;
  latitude: number;
}

export type Ring = Array<[number, number]>;

const METERS_PER_DEGREE = 111_320;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const offsetBy = (origin: LngLat, eastMeters: number, northMeters: number): [number, number] => [
  origin.longitude + eastMeters / (METERS_PER_DEGREE * Math.cos(toRadians(origin.latitude))),
  origin.latitude + northMeters / METERS_PER_DEGREE,
];

export const circleRing = (center: LngLat, radiusMeters: number, steps = 20): Ring => {
  const ring: Ring = [];
  for (let step = 0; step < steps; step++) {
    const angle = (step / steps) * Math.PI * 2;
    ring.push(offsetBy(center, Math.cos(angle) * radiusMeters, Math.sin(angle) * radiusMeters));
  }
  ring.push(ring[0]);
  return ring;
};

export const rectangleRing = (
  center: LngLat,
  headingDegrees: number,
  lengthMeters: number,
  widthMeters: number,
  forwardShiftMeters = 0,
): Ring => {
  const heading = toRadians(headingDegrees);
  const forward: [number, number] = [Math.sin(heading), Math.cos(heading)];
  const right: [number, number] = [Math.cos(heading), -Math.sin(heading)];
  const corner = (along: number, across: number): [number, number] =>
    offsetBy(
      center,
      forward[0] * (along + forwardShiftMeters) + right[0] * across,
      forward[1] * (along + forwardShiftMeters) + right[1] * across,
    );
  const halfLength = lengthMeters / 2;
  const halfWidth = widthMeters / 2;
  const ring: Ring = [corner(halfLength, -halfWidth), corner(halfLength, halfWidth), corner(-halfLength, halfWidth), corner(-halfLength, -halfWidth)];
  ring.push(ring[0]);
  return ring;
};

const MITER_LIMIT = 2;
const CHUNK_VERTICES = 120;

export const ribbonRings = (path: Array<[number, number]>, widthMeters: number): Ring[] => {
  const unique = path.filter((point, index) => index === 0 || point[0] !== path[index - 1][0] || point[1] !== path[index - 1][1]);
  if (unique.length < 2) return [];
  const origin: LngLat = { latitude: unique[0][0], longitude: unique[0][1] };
  const scaleEast = METERS_PER_DEGREE * Math.cos(toRadians(origin.latitude));
  const local = unique.map(([latitude, longitude]) => [(longitude - origin.longitude) * scaleEast, (latitude - origin.latitude) * METERS_PER_DEGREE] as [number, number]);
  const half = widthMeters / 2;

  const segmentNormal = (from: [number, number], to: [number, number]): [number, number] => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    return [-dy / length, dx / length];
  };

  const sides = local.map((point, index) => {
    const before = index > 0 ? segmentNormal(local[index - 1], point) : null;
    const after = index < local.length - 1 ? segmentNormal(point, local[index + 1]) : null;
    const normals = [before, after].filter((normal): normal is [number, number] => normal !== null);
    const sum: [number, number] = [normals.reduce((total, normal) => total + normal[0], 0), normals.reduce((total, normal) => total + normal[1], 0)];
    const length = Math.hypot(sum[0], sum[1]) || 1;
    const unit: [number, number] = [sum[0] / length, sum[1] / length];
    const first = normals[0];
    const alignment = Math.max(1 / MITER_LIMIT, unit[0] * first[0] + unit[1] * first[1]);
    const reach = half / alignment;
    return {
      left: offsetBy(origin, point[0] + unit[0] * reach, point[1] + unit[1] * reach),
      right: offsetBy(origin, point[0] - unit[0] * reach, point[1] - unit[1] * reach),
    };
  });

  const rings: Ring[] = [];
  for (let start = 0; start < sides.length - 1; start += CHUNK_VERTICES - 1) {
    const slice = sides.slice(start, Math.min(sides.length, start + CHUNK_VERTICES));
    if (slice.length < 2) break;
    const ring: Ring = [...slice.map((side) => side.left), ...slice.map((side) => side.right).reverse()];
    ring.push(ring[0]);
    rings.push(ring);
  }
  return rings;
};

export const headingBetween = (from: LngLat, to: LngLat): number => {
  const east = (to.longitude - from.longitude) * Math.cos(toRadians((from.latitude + to.latitude) / 2));
  const north = to.latitude - from.latitude;
  if (east === 0 && north === 0) return 0;
  return (((Math.atan2(east, north) * 180) / Math.PI) % 360 + 360) % 360;
};

export interface Extrusion {
  type: 'Feature';
  properties: { color: string; base: number; height: number; code?: string };
  geometry: { type: 'Polygon'; coordinates: Ring[] };
}

const extrusion = (ring: Ring, color: string, base: number, height: number, code?: string): Extrusion => ({
  type: 'Feature',
  properties: code === undefined ? { color, base, height } : { color, base, height, code },
  geometry: { type: 'Polygon', coordinates: [ring] },
});

export const routeExtrusions = (path: Array<[number, number]>, color: string, scale = 1): Extrusion[] => [
  ...ribbonRings(path, 26 * scale).map((ring) => extrusion(ring, '#FFFFFF', 0, 3 * scale)),
  ...ribbonRings(path, 16 * scale).map((ring) => extrusion(ring, color, 0, 7 * scale)),
];

export const stopExtrusions = (stop: LngLat & { code: string; highlight?: boolean }, scale = 1): Extrusion[] => {
  const center: LngLat = { longitude: stop.longitude, latitude: stop.latitude };
  const k = scale;
  if (stop.highlight) {
    return [
      extrusion(circleRing(center, 17 * k), '#121212', 0, 4 * k, stop.code),
      extrusion(circleRing(center, 12 * k), '#FFC20E', 4 * k, 46 * k, stop.code),
      extrusion(circleRing(center, 15 * k), '#121212', 46 * k, 51 * k, stop.code),
      extrusion(circleRing(center, 6 * k), '#FFFFFF', 51 * k, 54 * k, stop.code),
    ];
  }
  return [
    extrusion(circleRing(center, 13 * k), '#121212', 0, 3 * k, stop.code),
    extrusion(circleRing(center, 8 * k), '#FFFFFF', 3 * k, 17 * k, stop.code),
    extrusion(circleRing(center, 10 * k), '#121212', 17 * k, 20 * k, stop.code),
  ];
};

export const userExtrusions = (user: LngLat, scale = 1): Extrusion[] => [
  extrusion(circleRing(user, 15 * scale), '#FFFFFF', 0, 3 * scale),
  extrusion(circleRing(user, 10 * scale), '#0057B8', 3 * scale, 22 * scale),
  extrusion(circleRing(user, 5 * scale), '#FFFFFF', 22 * scale, 25 * scale),
];

export const busExtrusions = (bus: LngLat & { color: string; heading: number }, scale = 1): Extrusion[] => {
  const center: LngLat = { longitude: bus.longitude, latitude: bus.latitude };
  const k = scale;
  return [
    extrusion(rectangleRing(center, bus.heading, 38 * k, 17 * k), '#121212', 0, 4 * k),
    extrusion(rectangleRing(center, bus.heading, 36 * k, 15 * k), bus.color, 4 * k, 14 * k),
    extrusion(rectangleRing(center, bus.heading, 26 * k, 13 * k, -1 * k), '#E8F6FF', 14 * k, 22 * k),
    extrusion(rectangleRing(center, bus.heading, 28 * k, 15 * k, -1 * k), bus.color, 22 * k, 24 * k),
  ];
};

export const zoomScale = (zoom: number): number => Math.min(4, Math.max(1, 2 ** (16.6 - zoom)));
