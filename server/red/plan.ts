import { z } from 'zod';
import { redUrls } from './config';
import { RedError } from './errors';
import type { HttpClient } from './http';

export type LatLng = { latitude: number; longitude: number };

export interface PlanParams {
  from: LatLng;
  to: LatLng;
  date?: string;
  time?: string;
  arriveBy?: boolean;
  busOnly?: boolean;
  maxItineraries?: number;
}

export interface PlanPlace {
  name: string;
  stopCode: string | null;
  latitude: number;
  longitude: number;
}

export interface PlanLeg {
  mode: string;
  route: string | null;
  routeLongName: string | null;
  headsign: string | null;
  agency: string | null;
  color: string | null;
  textColor: string | null;
  realTime: boolean;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  from: PlanPlace;
  to: PlanPlace;
  path: Array<[number, number]>;
}

export interface PlanItinerary {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  walkSeconds: number;
  transitSeconds: number;
  waitingSeconds: number;
  walkMeters: number;
  transfers: number;
  legs: PlanLeg[];
}

export interface PlanResult {
  itineraries: PlanItinerary[];
  reason: string | null;
}

const placeSchema = z.object({
  name: z.string().nullish(),
  stopCode: z.string().nullish(),
  lat: z.number(),
  lon: z.number(),
});

const legSchema = z.object({
  mode: z.string(),
  route: z.string().nullish(),
  routeLongName: z.string().nullish(),
  headsign: z.string().nullish(),
  agencyName: z.string().nullish(),
  routeColor: z.string().nullish(),
  routeTextColor: z.string().nullish(),
  realTime: z.boolean().nullish(),
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number().nullish(),
  distance: z.number().nullish(),
  from: placeSchema,
  to: placeSchema,
  legGeometry: z.object({ points: z.string() }).nullish(),
});

const itinerarySchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  duration: z.number(),
  walkTime: z.number().nullish(),
  transitTime: z.number().nullish(),
  waitingTime: z.number().nullish(),
  walkDistance: z.number().nullish(),
  transfers: z.number().nullish(),
  legs: z.array(legSchema),
});

const planSchema = z.object({
  plan: z.object({ itineraries: z.array(itinerarySchema) }).nullish(),
  error: z.object({ msg: z.string().nullish(), message: z.string().nullish() }).nullish(),
});

export const decodePolyline = (encoded: string, precision = 5): Array<[number, number]> => {
  const factor = 10 ** precision;
  const points: Array<[number, number]> = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const readValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    latitude += readValue();
    longitude += readValue();
    points.push([latitude / factor, longitude / factor]);
  }
  return points;
};

const santiagoClock = (at: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.month}-${parts.day}-${parts.year}`, time: `${parts.hour}:${parts.minute}` };
};

const hexColor = (value: string | null | undefined) => (value ? `#${value.toLowerCase()}` : null);
const isoFromMillis = (millis: number) => new Date(millis).toISOString();

const toPlace = (place: z.infer<typeof placeSchema>): PlanPlace => ({
  name: place.name?.trim() || 'Sin nombre',
  stopCode: place.stopCode?.trim() || null,
  latitude: place.lat,
  longitude: place.lon,
});

export const buildPlanUrl = (params: PlanParams, now: Date = new Date()): string => {
  const clock = santiagoClock(now);
  const query = new URLSearchParams({
    date: params.date ?? clock.date,
    time: params.time ?? clock.time,
    mode: `WALK,${params.busOnly ? 'BUS' : 'TRANSIT'}`,
    fromPlace: `${params.from.latitude},${params.from.longitude}`,
    toPlace: `${params.to.latitude},${params.to.longitude}`,
    numItineraries: String(Math.min(Math.max(params.maxItineraries ?? 5, 1), 10)),
    arriveBy: String(params.arriveBy ?? false),
  });
  return `${redUrls.tripPlan}?${query}`;
};

export const normalizePlan = (payload: unknown): PlanResult => {
  const parsed = planSchema.safeParse(payload);
  if (!parsed.success) {
    throw new RedError('UNEXPECTED_SHAPE', 'trip planner returned an unexpected shape', {
      cause: parsed.error,
    });
  }
  const { plan, error } = parsed.data;
  if (!plan) {
    return { itineraries: [], reason: error?.msg ?? error?.message ?? 'no itineraries found' };
  }
  return {
    reason: null,
    itineraries: plan.itineraries.map((itinerary) => ({
      startTime: isoFromMillis(itinerary.startTime),
      endTime: isoFromMillis(itinerary.endTime),
      durationSeconds: itinerary.duration,
      walkSeconds: itinerary.walkTime ?? 0,
      transitSeconds: itinerary.transitTime ?? 0,
      waitingSeconds: itinerary.waitingTime ?? 0,
      walkMeters: Math.round(itinerary.walkDistance ?? 0),
      transfers: itinerary.transfers ?? 0,
      legs: itinerary.legs.map((leg) => ({
        mode: leg.mode,
        route: leg.route?.trim() || null,
        routeLongName: leg.routeLongName?.trim() || null,
        headsign: leg.headsign?.trim() || null,
        agency: leg.agencyName?.trim() || null,
        color: hexColor(leg.routeColor),
        textColor: hexColor(leg.routeTextColor),
        realTime: leg.realTime === true,
        startTime: isoFromMillis(leg.startTime),
        endTime: isoFromMillis(leg.endTime),
        durationSeconds: leg.duration ?? Math.round((leg.endTime - leg.startTime) / 1000),
        distanceMeters: Math.round(leg.distance ?? 0),
        from: toPlace(leg.from),
        to: toPlace(leg.to),
        path: leg.legGeometry ? decodePolyline(leg.legGeometry.points) : [],
      })),
    })),
  };
};

export const planTrip = async (http: HttpClient, params: PlanParams): Promise<PlanResult> =>
  normalizePlan(await http.getJson<unknown>(buildPlanUrl(params), { timeoutMs: 30_000 }));
