export type EtaKind = 'arriving' | 'under' | 'between' | 'over' | 'none' | 'unknown';

export interface Eta {
  raw: string;
  kind: EtaKind;
  minMinutes: number | null;
  maxMinutes: number | null;
}

export type ServiceStatus = 'ok' | 'no_buses' | 'out_of_service' | 'frequency' | 'unknown';

export interface BusArrival {
  plate: string | null;
  distanceMeters: number | null;
  eta: Eta;
}

export interface ServiceArrivals {
  service: string;
  destination: string | null;
  direction: number | null;
  color: string | null;
  hasTimetable: boolean;
  operatorCode: string | null;
  status: ServiceStatus;
  statusCode: string;
  message: string;
  buses: BusArrival[];
}

export interface StopPrediction {
  stop: { code: string; name: string; latitude: number | null; longitude: number | null };
  localDate: string | null;
  localTime: string | null;
  stopMessage: string | null;
  services: ServiceArrivals[];
}

export interface ScheduleWindow {
  dayType: string;
  start: string;
  end: string;
}

export interface RouteStop {
  code: string;
  stopId: number | null;
  sequence: number;
  name: string;
  commune: string | null;
  street: string | null;
  latitude: number;
  longitude: number;
}

export interface RouteDirection {
  id: number;
  destination: string;
  hasTimetable: boolean;
  schedules: ScheduleWindow[];
  stops: RouteStop[];
  path: Array<[number, number]>;
}

export interface RouteFile {
  service: string;
  operator: { id: number; name: string; color: string | null } | null;
  outbound: RouteDirection | null;
  inbound: RouteDirection | null;
}

export interface CatalogStop {
  code: string;
  name: string;
  commune: string | null;
  street: string | null;
  latitude: number;
  longitude: number;
  services: string[];
}

export interface Catalog {
  version: string | null;
  generatedAt: string;
  stops: CatalogStop[];
  services: string[];
}

export interface NearbyStop extends CatalogStop {
  distanceMeters: number;
}

export interface GeocodedPlace {
  name: string;
  street: string | null;
  city: string | null;
  district: string | null;
  transportMode: string | null;
  latitude: number;
  longitude: number;
}
