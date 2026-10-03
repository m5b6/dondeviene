import { z } from 'zod';
import type { BootstrapProvider } from './bootstrap';
import { SERVICE_CODE_PATTERN, STOP_CODE_PATTERN, redUrls } from './config';
import { RedError } from './errors';
import { etaSortMinutes, parseEta } from './eta';
import type { HttpClient } from './http';
import type { BusArrival, ServiceArrivals, ServiceStatus, StopPrediction } from './types';

const text = z.string().nullish();

const rawServiceSchema = z.object({
  codigorespuesta: z.coerce.string(),
  respuestaServicio: text,
  servicio: z.string(),
  destino: text,
  sentido: z.coerce.string().nullish(),
  color: text,
  itinerario: z.boolean().nullish(),
  codigo: text,
  distanciabus1: text,
  distanciabus2: text,
  horaprediccionbus1: text,
  horaprediccionbus2: text,
  ppubus1: text,
  ppubus2: text,
});

const rawPredictionSchema = z.object({
  fechaprediccion: text,
  horaprediccion: text,
  nomett: z.string().nullable().optional(),
  paradero: text,
  respuestaParadero: text,
  x: text,
  y: text,
  servicios: z
    .object({ item: z.union([z.array(rawServiceSchema), rawServiceSchema]).nullish() })
    .nullish(),
});

type RawService = z.infer<typeof rawServiceSchema>;

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toNumber = (value: string | null | undefined): number | null => {
  const trimmed = blankToNull(value);
  if (trimmed === null) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export const statusFromCode = (code: string): ServiceStatus => {
  switch (code) {
    case '00':
    case '01':
      return 'ok';
    case '10':
      return 'no_buses';
    case '11':
      return 'out_of_service';
    case '9':
    case '09':
      return 'frequency';
    default:
      return 'unknown';
  }
};

const normalizeColor = (value: string | null | undefined): string | null => {
  const trimmed = blankToNull(value);
  return trimmed ? trimmed.toLowerCase() : null;
};

const normalizeBus = (
  plate: string | null | undefined,
  distance: string | null | undefined,
  eta: string | null | undefined,
): BusArrival | null => {
  const parsedEta = parseEta(eta);
  if (parsedEta.kind === 'none') return null;
  return { plate: blankToNull(plate), distanceMeters: toNumber(distance), eta: parsedEta };
};

const normalizeService = (raw: RawService): ServiceArrivals => {
  const buses = [
    normalizeBus(raw.ppubus1, raw.distanciabus1, raw.horaprediccionbus1),
    normalizeBus(raw.ppubus2, raw.distanciabus2, raw.horaprediccionbus2),
  ].filter((bus): bus is BusArrival => bus !== null);
  const direction = toNumber(raw.sentido);
  return {
    service: raw.servicio,
    destination: blankToNull(raw.destino),
    direction,
    color: normalizeColor(raw.color),
    hasTimetable: raw.itinerario === true,
    operatorCode: blankToNull(raw.codigo),
    status: statusFromCode(raw.codigorespuesta),
    statusCode: raw.codigorespuesta,
    message: blankToNull(raw.respuestaServicio) ?? '',
    buses,
  };
};

const nextArrivalMinutes = (service: ServiceArrivals) =>
  service.buses.length > 0 ? etaSortMinutes(service.buses[0].eta) : Number.POSITIVE_INFINITY;

export const normalizePrediction = (payload: unknown, requestedStop: string): StopPrediction => {
  const parsed = rawPredictionSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RedError('UNEXPECTED_SHAPE', 'prediction payload does not match the expected shape', {
      upstreamBody: JSON.stringify(payload),
      cause: parsed.error,
    });
  }
  const raw = parsed.data;
  if (raw.nomett == null) {
    throw new RedError('UNKNOWN_STOP', `stop ${requestedStop} is not known to red.cl`);
  }
  const items = raw.servicios?.item;
  const rawServices = Array.isArray(items) ? items : items ? [items] : [];
  const services = rawServices
    .map(normalizeService)
    .sort((a, b) => nextArrivalMinutes(a) - nextArrivalMinutes(b) || a.service.localeCompare(b.service));

  return {
    stop: {
      code: raw.paradero ?? requestedStop,
      name: raw.nomett,
      latitude: toNumber(raw.x),
      longitude: toNumber(raw.y),
    },
    localDate: blankToNull(raw.fechaprediccion),
    localTime: blankToNull(raw.horaprediccion),
    stopMessage: blankToNull(raw.respuestaParadero),
    services,
  };
};

export interface PredictionDeps {
  http: HttpClient;
  bootstrap: BootstrapProvider;
}

export const assertStopCode = (code: string): void => {
  if (!STOP_CODE_PATTERN.test(code)) {
    throw new RedError('INVALID_INPUT', `stop code must look like PC187, got "${code}"`);
  }
};

export const assertServiceCode = (code: string): void => {
  if (!SERVICE_CODE_PATTERN.test(code)) {
    throw new RedError('INVALID_INPUT', `service code must look like 210 or J13c, got "${code}"`);
  }
};

export const fetchStopPrediction = async (
  { http, bootstrap }: PredictionDeps,
  stopCode: string,
  serviceCode?: string,
): Promise<StopPrediction> => {
  assertStopCode(stopCode);
  if (serviceCode) assertServiceCode(serviceCode);

  for (let attempt = 0; attempt < 2; attempt++) {
    const { jwt } = await bootstrap.get();
    const query = new URLSearchParams({ t: jwt, codsimt: stopCode });
    if (serviceCode) query.set('codser', serviceCode);
    const response = await http.get(`${redUrls.prediction}?${query}`);

    if (response.ok) {
      let payload: unknown;
      try {
        payload = JSON.parse(response.body);
      } catch (cause) {
        throw new RedError('UNEXPECTED_SHAPE', 'prediction was not JSON', {
          url: response.url,
          upstreamBody: response.body,
          cause,
        });
      }
      return normalizePrediction(payload, stopCode);
    }
    if (response.status === 400) {
      throw new RedError('UNKNOWN_STOP', `red.cl rejected stop ${stopCode}`, {
        status: 400,
        upstreamBody: response.body,
      });
    }
    if (response.status === 500 && attempt === 0) {
      bootstrap.invalidate();
      continue;
    }
    if (response.status === 500) {
      throw new RedError('BAD_TOKEN', 'red.cl rejected a freshly issued token', {
        status: 500,
        upstreamBody: response.body,
      });
    }
    throw http.statusError(response);
  }
  throw new RedError('BAD_TOKEN', 'could not obtain a token red.cl accepts');
};
