import { z } from 'zod';
import { canonicalServiceCode } from './codes';
import { SERVICE_CODE_PATTERN, redUrls } from './config';
import { RedError } from './errors';
import type { HttpClient } from './http';
import type { RouteDirection, RouteFile, RouteStop } from './types';

const rawStopSchema = z.object({
  id: z.number().nullish(),
  cod: z.string(),
  pos: z.tuple([z.number(), z.number()]),
  name: z.string(),
  comuna: z.string().nullish(),
  eje: z.string().nullish(),
  stop: z.object({ stopId: z.number().nullish() }).nullish(),
});

const rawDirectionSchema = z.object({
  id: z.number(),
  destino: z.string(),
  itinerario: z.boolean().nullish(),
  horarios: z
    .array(
      z.object({
        tipoDia: z.string().nullish(),
        inicio: z.string().nullish(),
        fin: z.string().nullish(),
      }),
    )
    .nullish(),
  paraderos: z.array(rawStopSchema),
  path: z.array(z.tuple([z.number(), z.number()])),
});

const rawRouteSchema = z.object({
  negocio: z
    .object({ id: z.number(), nombre: z.string(), color: z.string().nullish() })
    .nullish(),
  ida: rawDirectionSchema.nullish(),
  regreso: rawDirectionSchema.nullish(),
});

export { canonicalServiceCode };

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeDirection = (raw: z.infer<typeof rawDirectionSchema>): RouteDirection => ({
  id: raw.id,
  destination: raw.destino,
  hasTimetable: raw.itinerario === true,
  schedules: (raw.horarios ?? [])
    .filter((window) => window.tipoDia && window.inicio && window.fin)
    .map((window) => ({
      dayType: window.tipoDia as string,
      start: window.inicio as string,
      end: window.fin as string,
    })),
  stops: raw.paraderos.map(
    (stop, sequence): RouteStop => ({
      code: stop.cod,
      stopId: stop.stop?.stopId ?? stop.id ?? null,
      sequence,
      name: stop.name,
      commune: blankToNull(stop.comuna),
      street: blankToNull(stop.eje),
      latitude: stop.pos[0],
      longitude: stop.pos[1],
    }),
  ),
  path: raw.path,
});

export const normalizeRouteFile = (service: string, payload: unknown): RouteFile => {
  const parsed = rawRouteSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RedError('UNEXPECTED_SHAPE', `route file for ${service} has an unexpected shape`, {
      cause: parsed.error,
    });
  }
  const { negocio, ida, regreso } = parsed.data;
  return {
    service,
    operator: negocio
      ? { id: negocio.id, name: negocio.nombre, color: blankToNull(negocio.color) }
      : null,
    outbound: ida ? normalizeDirection(ida) : null,
    inbound: regreso ? normalizeDirection(regreso) : null,
  };
};

export const fetchRouteFile = async (
  http: HttpClient,
  input: string,
  catalogVersion?: string | null,
): Promise<RouteFile> => {
  const service = canonicalServiceCode(input);
  if (!SERVICE_CODE_PATTERN.test(service)) {
    throw new RedError('INVALID_INPUT', `service code must look like 210 or J13c, got "${input}"`);
  }
  const suffix = catalogVersion ? `?v=${encodeURIComponent(catalogVersion)}` : '';
  const response = await http.get(`${redUrls.serviceFile(service)}${suffix}`);
  if (response.status === 404) {
    throw new RedError('UNKNOWN_SERVICE', `service ${service} does not exist`, { status: 404 });
  }
  if (!response.ok) throw http.statusError(response);
  let payload: unknown;
  try {
    payload = JSON.parse(response.body);
  } catch (cause) {
    throw new RedError('UNEXPECTED_SHAPE', `route file for ${service} is not JSON`, { cause });
  }
  return normalizeRouteFile(service, payload);
};
