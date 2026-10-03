import type { CatalogStop, NearbyStop } from './types';

const EARTH_RADIUS_METERS = 6_371_008.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const haversineMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number => {
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
};

export interface NearbyOptions {
  limit?: number;
  maxMeters?: number;
}

export const nearestStops = (
  stops: CatalogStop[],
  latitude: number,
  longitude: number,
  { limit = 10, maxMeters = 800 }: NearbyOptions = {},
): NearbyStop[] => {
  const latitudeSpan = maxMeters / 111_320;
  const longitudeSpan = maxMeters / (111_320 * Math.max(0.01, Math.cos(toRadians(latitude))));
  const found: NearbyStop[] = [];
  for (const stop of stops) {
    if (Math.abs(stop.latitude - latitude) > latitudeSpan) continue;
    if (Math.abs(stop.longitude - longitude) > longitudeSpan) continue;
    const distanceMeters = haversineMeters(latitude, longitude, stop.latitude, stop.longitude);
    if (distanceMeters <= maxMeters) found.push({ ...stop, distanceMeters: Math.round(distanceMeters) });
  }
  return found.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit);
};

export const isInsideSantiagoRegion = (latitude: number, longitude: number): boolean =>
  latitude >= -34.4 && latitude <= -32.9 && longitude >= -71.6 && longitude <= -69.9;
