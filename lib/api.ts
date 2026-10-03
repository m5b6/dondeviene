import type { ArrivalsResult, SearchResult } from '@/server/red/service';
import type { NearbyStop, RouteFile } from '@/server/red/types';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const getJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    if ((cause as { name?: string }).name === 'AbortError') throw cause;
    throw new ApiError('OFFLINE', 'sin conexión', 0);
  }
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? 'ERROR', body?.error?.message ?? response.statusText, response.status);
  }
  return body as T;
};

const routeCache = new Map<string, Promise<RouteFile>>();

const cachedRoute = (service: string): Promise<RouteFile> => {
  const existing = routeCache.get(service);
  if (existing) return existing;
  const request = getJson<RouteFile>(`/api/services/${encodeURIComponent(service)}`).catch((error) => {
    routeCache.delete(service);
    throw error;
  });
  routeCache.set(service, request);
  return request;
};

export const api = {
  nearby: (latitude: number, longitude: number, signal?: AbortSignal) =>
    getJson<{ stops: NearbyStop[] }>(`/api/stops/nearby?lat=${latitude}&lng=${longitude}&limit=6&radius=900`, signal),
  arrivals: (code: string, service?: string, signal?: AbortSignal) =>
    getJson<ArrivalsResult>(`/api/stops/${code}${service ? `?service=${encodeURIComponent(service)}` : ''}`, signal),
  route: (service: string) => cachedRoute(service),
  search: (query: string, signal?: AbortSignal) =>
    getJson<SearchResult>(`/api/stops/search?q=${encodeURIComponent(query)}`, signal),
};

export const friendlyError = (error: unknown): string => {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Intenta de nuevo.';
  switch (error.code) {
    case 'OFFLINE':
      return 'Sin conexión';
    case 'UNKNOWN_STOP':
      return 'Ese paradero no existe';
    case 'UNKNOWN_SERVICE':
      return 'Ese servicio no existe';
    case 'INVALID_INPUT':
      return 'Revisa lo que escribiste';
    case 'CATALOG_UNAVAILABLE':
      return 'Estamos preparando los datos, vuelve en un momento';
    default:
      return 'Red Movilidad no responde ahora';
  }
};
