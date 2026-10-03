import type { RouteDirection, RouteFile, ServiceArrivals } from '../server/red/types';

export type DirectionKey = 'outbound' | 'inbound';

export interface PickedDirection {
  key: DirectionKey;
  direction: RouteDirection;
}

export const pickDirection = (
  route: RouteFile,
  stopCode: string | null | undefined,
  arrival: ServiceArrivals | null | undefined,
  choice: DirectionKey | null,
): PickedDirection | null => {
  const all = (['outbound', 'inbound'] as const)
    .map((key) => ({ key, direction: route[key] }))
    .filter((entry): entry is PickedDirection => entry.direction !== null);
  if (choice) {
    const chosen = all.find((entry) => entry.key === choice);
    if (chosen) return chosen;
  }
  const serving = stopCode ? all.filter((entry) => entry.direction.stops.some((stop) => stop.code === stopCode)) : all;
  const pool = serving.length > 0 ? serving : all;
  const byDestination = arrival?.destination
    ? pool.find((entry) => entry.direction.destination === arrival.destination)
    : undefined;
  return byDestination ?? pool[0] ?? null;
};
