import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Catalog, CatalogStop, RouteFile, StopPrediction } from './types';

export const buildCatalog = (
  routes: RouteFile[],
  version: string | null,
  generatedAt: string,
): Catalog => {
  const stops = new Map<string, CatalogStop>();
  const services = new Set<string>();

  for (const route of routes) {
    services.add(route.service);
    for (const direction of [route.outbound, route.inbound]) {
      if (!direction) continue;
      for (const stop of direction.stops) {
        const existing = stops.get(stop.code);
        if (existing) {
          if (!existing.services.includes(route.service)) existing.services.push(route.service);
          continue;
        }
        stops.set(stop.code, {
          code: stop.code,
          name: stop.name,
          commune: stop.commune,
          street: stop.street,
          latitude: stop.latitude,
          longitude: stop.longitude,
          services: [route.service],
        });
      }
    }
  }

  const sortedStops = [...stops.values()]
    .map((stop) => ({ ...stop, services: [...stop.services].sort() }))
    .sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));

  return {
    version,
    generatedAt,
    stops: sortedStops,
    services: [...services].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
  };
};

export const stopFromPrediction = (prediction: StopPrediction): CatalogStop | null => {
  const { code, name, latitude, longitude } = prediction.stop;
  if (latitude === null || longitude === null) return null;
  return {
    code,
    name,
    commune: null,
    street: null,
    latitude,
    longitude,
    services: [...new Set(prediction.services.map((service) => service.service))].sort(),
  };
};

export const addStops = (catalog: Catalog, extra: CatalogStop[]): Catalog => {
  const known = new Set(catalog.stops.map((stop) => stop.code));
  const merged = [...catalog.stops, ...extra.filter((stop) => !known.has(stop.code))];
  merged.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
  return { ...catalog, stops: merged };
};

export const catalogPath = (root: string) => path.join(root, 'data/catalog/catalog.json');

export const saveCatalog = async (root: string, catalog: Catalog): Promise<void> => {
  const file = catalogPath(root);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(catalog)}\n`);
};

export const loadCatalog = async (root: string): Promise<Catalog | null> => {
  try {
    return JSON.parse(await readFile(catalogPath(root), 'utf8')) as Catalog;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
};

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const matchRank = (stop: CatalogStop, needle: string): number | null => {
  const code = stop.code.toLowerCase();
  if (code === needle) return 0;
  if (code.startsWith(needle)) return 1;
  const name = fold(stop.name);
  if (name.startsWith(needle)) return 2;
  if (name.includes(needle)) return 3;
  if (stop.street && fold(stop.street).includes(needle)) return 4;
  if (stop.commune && fold(stop.commune).includes(needle)) return 5;
  return null;
};

export const searchCatalogStops = (stops: CatalogStop[], query: string, limit = 10): CatalogStop[] => {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];
  const ranked: Array<{ stop: CatalogStop; rank: number }> = [];
  for (const stop of stops) {
    const rank = matchRank(stop, needle);
    if (rank !== null) ranked.push({ stop, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.stop.name.length - b.stop.name.length)
    .slice(0, limit)
    .map((entry) => entry.stop);
};
