import { BootstrapProvider } from './bootstrap';
import { TtlCache } from './cache';
import { loadCatalog, searchCatalogStops } from './catalog';
import { MAP_STYLE_URL } from './config';
import { RedError, isRedError } from './errors';
import { type NearbyOptions, isInsideSantiagoRegion, nearestStops } from './geo';
import { reversePlace, searchPlaces } from './geocode';
import { HttpClient } from './http';
import { type PlanParams, type PlanResult, planTrip } from './plan';
import { assertStopCode, fetchStopPrediction } from './predictions';
import { canonicalServiceCode, fetchRouteFile } from './routes';
import type {
  Catalog,
  CatalogStop,
  GeocodedPlace,
  NearbyStop,
  RouteFile,
  StopPrediction,
} from './types';

export interface ArrivalsResult extends StopPrediction {
  observedAt: string;
  ageSeconds: number;
  stale: boolean;
  catalogStop: CatalogStop | null;
}

export interface SearchResult {
  stops: CatalogStop[];
  places: GeocodedPlace[];
  placesAvailable: boolean;
}

export interface UpstreamStatus {
  checkedAt: string;
  catalogVersion: string | null;
  tokenExpiresAt: string | null;
  detourServices: string[];
  localCatalog: { stops: number; services: number; generatedAt: string } | null;
  mapStyleUrl: string;
}

export interface RedServiceOptions {
  http?: HttpClient;
  bootstrap?: BootstrapProvider;
  catalogRoot?: string;
  catalog?: Catalog | null;
  now?: () => number;
  arrivalsTtlMs?: number;
  arrivalsStaleMs?: number;
}

const HOUR_MS = 3_600_000;

export class RedService {
  readonly http: HttpClient;
  readonly bootstrap: BootstrapProvider;
  private readonly catalogRoot: string;
  private catalog: Catalog | null | undefined;
  private readonly now: () => number;
  private readonly arrivals: TtlCache<StopPrediction>;
  private readonly routes: TtlCache<RouteFile>;

  constructor(options: RedServiceOptions = {}) {
    this.now = options.now ?? Date.now;
    this.http = options.http ?? new HttpClient({ now: this.now });
    this.bootstrap = options.bootstrap ?? new BootstrapProvider(this.http, { now: this.now });
    this.catalogRoot = options.catalogRoot ?? process.cwd();
    this.catalog = options.catalog;
    this.arrivals = new TtlCache({
      ttlMs: options.arrivalsTtlMs ?? 15_000,
      staleOnErrorMs: options.arrivalsStaleMs ?? 120_000,
      now: this.now,
    });
    this.routes = new TtlCache({ ttlMs: 6 * HOUR_MS, staleOnErrorMs: 24 * HOUR_MS, maxEntries: 500, now: this.now });
  }

  async getCatalog(): Promise<Catalog> {
    if (this.catalog === undefined) this.catalog = await loadCatalog(this.catalogRoot);
    if (!this.catalog) {
      throw new RedError(
        'CATALOG_UNAVAILABLE',
        'local stop catalog is missing; run "npm run crawl" to build it',
      );
    }
    return this.catalog;
  }

  async stopArrivals(stopCode: string, serviceCode?: string): Promise<ArrivalsResult> {
    assertStopCode(stopCode);
    const service = serviceCode ? canonicalServiceCode(serviceCode) : undefined;
    const hit = await this.arrivals.get(`${stopCode}|${service ?? ''}`, () =>
      fetchStopPrediction({ http: this.http, bootstrap: this.bootstrap }, stopCode, service),
    );
    const catalog = this.catalog === undefined ? await loadCatalog(this.catalogRoot) : this.catalog;
    if (this.catalog === undefined) this.catalog = catalog;
    return {
      ...hit.value,
      observedAt: new Date(hit.fetchedAt).toISOString(),
      ageSeconds: Math.max(0, Math.round((this.now() - hit.fetchedAt) / 1000)),
      stale: hit.stale,
      catalogStop: catalog?.stops.find((stop) => stop.code === stopCode) ?? null,
    };
  }

  async nearbyStops(latitude: number, longitude: number, options?: NearbyOptions): Promise<NearbyStop[]> {
    if (!isInsideSantiagoRegion(latitude, longitude)) {
      throw new RedError('INVALID_INPUT', 'coordinates are outside the Santiago region');
    }
    const catalog = await this.getCatalog();
    return nearestStops(catalog.stops, latitude, longitude, options);
  }

  async search(query: string): Promise<SearchResult> {
    const catalog = await this.getCatalog();
    const stops = searchCatalogStops(catalog.stops, query, 8);
    try {
      const places = await searchPlaces(this.http, query);
      return { stops, places, placesAvailable: true };
    } catch (error) {
      if (isRedError(error) && error.code === 'INVALID_INPUT') {
        return { stops, places: [], placesAvailable: true };
      }
      return { stops, places: [], placesAvailable: false };
    }
  }

  async reverse(latitude: number, longitude: number) {
    return reversePlace(this.http, latitude, longitude);
  }

  async serviceList(): Promise<string[]> {
    return (await this.getCatalog()).services;
  }

  async route(serviceCode: string): Promise<RouteFile> {
    const service = canonicalServiceCode(serviceCode);
    const { catalogVersion } = await this.bootstrap.get();
    const hit = await this.routes.get(`${service}|${catalogVersion ?? ''}`, () =>
      fetchRouteFile(this.http, service, catalogVersion),
    );
    return hit.value;
  }

  async plan(params: PlanParams): Promise<PlanResult> {
    for (const point of [params.from, params.to]) {
      if (!isInsideSantiagoRegion(point.latitude, point.longitude)) {
        throw new RedError('INVALID_INPUT', 'coordinates are outside the Santiago region');
      }
    }
    return planTrip(this.http, params);
  }

  async status(): Promise<UpstreamStatus> {
    const bootstrap = await this.bootstrap.get();
    const catalog = this.catalog === undefined ? await loadCatalog(this.catalogRoot) : this.catalog;
    if (this.catalog === undefined) this.catalog = catalog;
    return {
      checkedAt: new Date(this.now()).toISOString(),
      catalogVersion: bootstrap.catalogVersion,
      tokenExpiresAt: bootstrap.jwtExpiresAt ? new Date(bootstrap.jwtExpiresAt).toISOString() : null,
      detourServices: bootstrap.detourServices,
      localCatalog: catalog
        ? { stops: catalog.stops.length, services: catalog.services.length, generatedAt: catalog.generatedAt }
        : null,
      mapStyleUrl: MAP_STYLE_URL,
    };
  }
}
