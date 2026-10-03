import { haversineMeters } from '../server/red/geo';
import { headingBetween } from './geometry3d';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export type PathPoint = [number, number];

export interface PathProjection {
  distanceFromStartMeters: number;
  offsetMeters: number;
}

const METERS_PER_DEGREE_LATITUDE = 111_320;

const toLocalMeters = (origin: LatLng, point: LatLng): [number, number] => {
  const x = (point.longitude - origin.longitude) * METERS_PER_DEGREE_LATITUDE * Math.cos((origin.latitude * Math.PI) / 180);
  const y = (point.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE;
  return [x, y];
};

export const pathLengthsFromStart = (path: PathPoint[]): number[] => {
  const cumulative = [0];
  for (let index = 1; index < path.length; index++) {
    cumulative.push(
      cumulative[index - 1] + haversineMeters(path[index - 1][0], path[index - 1][1], path[index][0], path[index][1]),
    );
  }
  return cumulative;
};

export const projectOntoPath = (path: PathPoint[], point: LatLng, cumulative = pathLengthsFromStart(path)): PathProjection | null => {
  if (path.length < 2) return null;
  let best: PathProjection | null = null;
  for (let index = 0; index < path.length - 1; index++) {
    const start: LatLng = { latitude: path[index][0], longitude: path[index][1] };
    const end: LatLng = { latitude: path[index + 1][0], longitude: path[index + 1][1] };
    const [endX, endY] = toLocalMeters(start, end);
    const [pointX, pointY] = toLocalMeters(start, point);
    const lengthSquared = endX * endX + endY * endY;
    const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, (pointX * endX + pointY * endY) / lengthSquared));
    const offsetMeters = Math.hypot(pointX - t * endX, pointY - t * endY);
    if (!best || offsetMeters < best.offsetMeters) {
      best = {
        offsetMeters,
        distanceFromStartMeters: cumulative[index] + t * (cumulative[index + 1] - cumulative[index]),
      };
    }
  }
  return best;
};

export const pointAtDistance = (path: PathPoint[], distanceFromStart: number, cumulative = pathLengthsFromStart(path)): LatLng | null => {
  if (path.length === 0) return null;
  if (path.length === 1 || distanceFromStart <= 0) return { latitude: path[0][0], longitude: path[0][1] };
  const total = cumulative[cumulative.length - 1];
  if (distanceFromStart >= total) {
    const last = path[path.length - 1];
    return { latitude: last[0], longitude: last[1] };
  }
  let index = 1;
  while (cumulative[index] < distanceFromStart) index += 1;
  const segment = cumulative[index] - cumulative[index - 1];
  const t = segment === 0 ? 0 : (distanceFromStart - cumulative[index - 1]) / segment;
  return {
    latitude: path[index - 1][0] + t * (path[index][0] - path[index - 1][0]),
    longitude: path[index - 1][1] + t * (path[index][1] - path[index - 1][1]),
  };
};

export const MAX_STOP_OFFSET_METERS = 150;

export interface EstimatedBus {
  position: LatLng;
  clamped: boolean;
  headingDegrees: number;
}

const HEADING_LOOKAROUND_METERS = 12;

export const estimateBusPosition = (
  path: PathPoint[],
  stop: LatLng,
  metersBehindStop: number,
  cumulative = pathLengthsFromStart(path),
): EstimatedBus | null => {
  if (!Number.isFinite(metersBehindStop) || metersBehindStop < 0) return null;
  const projection = projectOntoPath(path, stop, cumulative);
  if (!projection || projection.offsetMeters > MAX_STOP_OFFSET_METERS) return null;
  const wanted = projection.distanceFromStartMeters - metersBehindStop;
  const distance = Math.max(0, wanted);
  const position = pointAtDistance(path, distance, cumulative);
  if (!position) return null;
  const behind = pointAtDistance(path, Math.max(0, distance - HEADING_LOOKAROUND_METERS), cumulative);
  const ahead = pointAtDistance(path, distance + HEADING_LOOKAROUND_METERS, cumulative);
  const headingDegrees = behind && ahead ? headingBetween(behind, ahead) : 0;
  return { position, clamped: wanted < 0, headingDegrees };
};
