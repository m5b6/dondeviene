import { z } from 'zod';
import { redUrls } from './config';
import { RedError } from './errors';
import type { HttpClient } from './http';
import type { GeocodedPlace } from './types';

const searchSchema = z.object({
  lugares: z.array(
    z.object({
      detalle: z.object({
        nombre: z.string().nullish(),
        calle: z.string().nullish(),
        ciudad: z.string().nullish(),
        distrito: z.string().nullish(),
        modo_transporte: z.string().nullish(),
      }),
      coord: z.object({ lat: z.coerce.number(), lon: z.coerce.number() }),
    }),
  ),
});

const reverseSchema = z.object({
  nombre: z.string().nullish(),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
});

const blankToNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const searchPlaces = async (http: HttpClient, query: string): Promise<GeocodedPlace[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    throw new RedError('INVALID_INPUT', 'search text needs at least 3 characters');
  }
  const payload = await http.getJson<unknown>(
    `${redUrls.geocodeSearch}?${new URLSearchParams({ busqueda: trimmed })}`,
  );
  const parsed = searchSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RedError('UNEXPECTED_SHAPE', 'geocoder search returned an unexpected shape', {
      cause: parsed.error,
    });
  }
  return parsed.data.lugares.map(({ detalle, coord }) => ({
    name: blankToNull(detalle.nombre) ?? blankToNull(detalle.calle) ?? 'Sin nombre',
    street: blankToNull(detalle.calle),
    city: blankToNull(detalle.ciudad),
    district: blankToNull(detalle.distrito),
    transportMode: blankToNull(detalle.modo_transporte),
    latitude: coord.lat,
    longitude: coord.lon,
  }));
};

export const reversePlace = async (
  http: HttpClient,
  latitude: number,
  longitude: number,
): Promise<{ name: string | null; latitude: number; longitude: number }> => {
  const payload = await http.getJson<unknown>(
    `${redUrls.geocodeReverse}?${new URLSearchParams({
      latitud: String(latitude),
      longitud: String(longitude),
    })}`,
  );
  const parsed = reverseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RedError('UNEXPECTED_SHAPE', 'geocoder reverse returned an unexpected shape', {
      cause: parsed.error,
    });
  }
  return {
    name: blankToNull(parsed.data.nombre),
    latitude: parsed.data.lat,
    longitude: parsed.data.lon,
  };
};
