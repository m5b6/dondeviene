import { describe, expect, it } from 'vitest';
import { addStops, buildCatalog, searchCatalogStops, stopFromPrediction } from '../server/red/catalog';
import { haversineMeters, isInsideSantiagoRegion, nearestStops } from '../server/red/geo';
import { normalizePrediction } from '../server/red/predictions';
import { canonicalServiceCode, fetchRouteFile, normalizeRouteFile } from '../server/red/routes';
import type { CatalogStop } from '../server/red/types';
import { fakeNetwork, fixtureJson, testHttp } from './helpers';

describe('canonicalServiceCode', () => {
  it('uppercases everything and lowercases a trailing letter, like the red.cl site does', () => {
    expect(canonicalServiceCode('j13c')).toBe('J13c');
    expect(canonicalServiceCode('210E')).toBe('210e');
    expect(canonicalServiceCode('i09')).toBe('I09');
    expect(canonicalServiceCode(' 405 ')).toBe('405');
    expect(canonicalServiceCode('b21N')).toBe('B21n');
  });
});

describe('normalizeRouteFile', () => {
  const route = () => normalizeRouteFile('210', fixtureJson('servicio_210.trimmed.json'));

  it('reads operator, both directions, stops and path', () => {
    const file = route();
    expect(file.operator).toEqual({ id: 19, name: 'Consorcio Conecta', color: null });
    expect(file.outbound?.destination).toBe('Puente Alto');
    expect(file.inbound?.destination).toBe('Estación Central');
    expect(file.outbound?.stops).toHaveLength(5);
    expect(file.outbound?.path).toHaveLength(6);
  });

  it('keeps stop order as a sequence and maps coordinates', () => {
    const [first, second] = route().outbound?.stops ?? [];
    expect(first).toMatchObject({ code: 'PI1840', sequence: 0, latitude: -33.4626374, longitude: -70.6954462 });
    expect(first.commune).toBe('ESTACIÓN CENTRAL');
    expect(first.street).toBe('General Amengual');
    expect(second.sequence).toBe(1);
  });

  it('reads schedule windows and the timetable flag', () => {
    const outbound = route().outbound;
    expect(outbound?.hasTimetable).toBe(true);
    expect(outbound?.schedules).toContainEqual({ dayType: 'Lunes a Viernes', start: '00:00', end: '23:59' });
  });

  it('allows a service that only runs one way', () => {
    const raw = fixtureJson<Record<string, unknown>>('servicio_210.trimmed.json');
    const file = normalizeRouteFile('210', { ...raw, regreso: null });
    expect(file.inbound).toBeNull();
    expect(file.outbound).not.toBeNull();
  });

  it('rejects a file that lost its stop coordinates', () => {
    expect(() => normalizeRouteFile('210', { ida: { id: 1, destino: 'X', paraderos: [{ cod: 'PA1', name: 'n' }], path: [] } })).toThrow();
  });
});

describe('fetchRouteFile', () => {
  it('requests the canonical file name with the catalog version', async () => {
    const network = fakeNetwork([['/jsonPO/servicio_J13c.json', () => Response.json(fixtureJson('servicio_210.trimmed.json'))]]);
    const file = await fetchRouteFile(testHttp(network), 'j13c', '20261003_2');
    expect(file.service).toBe('J13c');
    expect(network.calls[0]).toContain('servicio_J13c.json?v=20261003_2');
  });

  it('maps a 404 to UNKNOWN_SERVICE', async () => {
    const network = fakeNetwork([['/jsonPO/', () => new Response('<html>', { status: 404 })]]);
    await expect(fetchRouteFile(testHttp(network), 'ZZ9')).rejects.toMatchObject({ code: 'UNKNOWN_SERVICE' });
  });

  it('rejects malformed codes before any request', async () => {
    const network = fakeNetwork([]);
    await expect(fetchRouteFile(testHttp(network), '../etc')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(network.calls).toHaveLength(0);
  });
});

describe('buildCatalog', () => {
  it('merges stops shared by several services and directions', () => {
    const base = normalizeRouteFile('210', fixtureJson('servicio_210.trimmed.json'));
    const other = { ...base, service: '211' };
    const catalog = buildCatalog([base, other], '20261003_2', '2026-10-03T00:00:00Z');
    expect(catalog.services).toEqual(['210', '211']);
    const stop = catalog.stops.find((item) => item.code === 'PI1840');
    expect(stop?.services).toEqual(['210', '211']);
    expect(new Set(catalog.stops.map((item) => item.code)).size).toBe(catalog.stops.length);
  });
});

describe('catalog backfill from predictions', () => {
  const prediction = normalizePrediction(fixtureJson('prediccion_PC187.json'), 'PC187');

  it('turns a prediction into a catalog stop with its services', () => {
    const stop = stopFromPrediction(prediction);
    expect(stop).toMatchObject({ code: 'PC187', latitude: -33.4191229, longitude: -70.6058199, commune: null });
    expect(stop?.services).toContain('401');
    expect(stop?.services).toEqual([...(stop?.services ?? [])].sort());
  });

  it('skips a prediction that has no coordinates', () => {
    const noCoordinates = { ...prediction, stop: { ...prediction.stop, latitude: null, longitude: null } };
    expect(stopFromPrediction(noCoordinates)).toBeNull();
  });

  it('adds stops without duplicating or reordering existing ones', () => {
    const base = buildCatalog([normalizeRouteFile('210', fixtureJson('servicio_210.trimmed.json'))], 'v', 'now');
    const extra = stopFromPrediction(prediction);
    const merged = addStops(base, [extra as CatalogStop, base.stops[0]]);
    expect(merged.stops).toHaveLength(base.stops.length + 1);
    expect(merged.stops.map((stop) => stop.code)).toEqual(
      [...merged.stops.map((stop) => stop.code)].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })),
    );
  });
});

describe('geo', () => {
  const stops: CatalogStop[] = [
    { code: 'PA1', name: 'Plaza de Armas', commune: 'SANTIAGO', street: 'Catedral', latitude: -33.4372, longitude: -70.6506, services: ['210'] },
    { code: 'PA2', name: 'Cerro Santa Lucía', commune: 'SANTIAGO', street: 'Alameda', latitude: -33.4400, longitude: -70.6440, services: ['405'] },
    { code: 'PA3', name: 'Maipú Centro', commune: 'MAIPÚ', street: 'Pajaritos', latitude: -33.5100, longitude: -70.7600, services: ['I09'] },
  ];

  it('computes great-circle distance', () => {
    expect(haversineMeters(-33, -70, -34, -70)).toBeGreaterThan(111_000);
    expect(haversineMeters(-33, -70, -34, -70)).toBeLessThan(111_400);
    expect(haversineMeters(-33.4, -70.6, -33.4, -70.6)).toBe(0);
  });

  it('returns nearby stops nearest first and drops far ones', () => {
    const found = nearestStops(stops, -33.4372, -70.6506, { maxMeters: 1500 });
    expect(found.map((stop) => stop.code)).toEqual(['PA1', 'PA2']);
    expect(found[0].distanceMeters).toBe(0);
    expect(found[1].distanceMeters).toBeGreaterThan(500);
  });

  it('honours the limit', () => {
    expect(nearestStops(stops, -33.4372, -70.6506, { maxMeters: 50_000, limit: 1 })).toHaveLength(1);
  });

  it('recognises coordinates inside the Santiago region', () => {
    expect(isInsideSantiagoRegion(-33.4372, -70.6506)).toBe(true);
    expect(isInsideSantiagoRegion(40.4, -3.7)).toBe(false);
  });

  it('matches without accents and in either case', () => {
    const accented: CatalogStop[] = [
      { code: 'PB10', name: 'Av. Peñalolén / Grecia', commune: 'PEÑALOLÉN', street: 'Grecia', latitude: -33.48, longitude: -70.54, services: [] },
      { code: 'PB11', name: 'Maipú Centro', commune: 'MAIPÚ', street: 'Pajaritos', latitude: -33.5, longitude: -70.76, services: [] },
    ];
    expect(searchCatalogStops(accented, 'penalolen')[0].code).toBe('PB10');
    expect(searchCatalogStops(accented, 'MAIPU')[0].code).toBe('PB11');
  });

  it('ranks code and name-prefix matches above street and commune matches', () => {
    const mixed: CatalogStop[] = [
      { code: 'PA9', name: 'Otra parada', commune: 'X', street: 'Los Leones', latitude: 0, longitude: 0, services: [] },
      { code: 'PA8', name: 'Los Leones Sur', commune: 'X', street: 'Otra', latitude: 0, longitude: 0, services: [] },
      { code: 'PA7', name: 'Metro Los Leones', commune: 'X', street: 'Otra', latitude: 0, longitude: 0, services: [] },
    ];
    expect(searchCatalogStops(mixed, 'los leones').map((stop) => stop.code)).toEqual(['PA8', 'PA7', 'PA9']);
  });

  it('does not depend on where in the list a match sits', () => {
    const many: CatalogStop[] = Array.from({ length: 500 }, (_, index) => ({
      code: `PA${index}`, name: 'Parada comun', commune: null, street: null, latitude: 0, longitude: 0, services: [],
    }));
    many.push({ code: 'PZ1', name: 'Hospital unico', commune: null, street: null, latitude: 0, longitude: 0, services: [] });
    expect(searchCatalogStops(many, 'hospital unico')[0].code).toBe('PZ1');
  });

  it('finds stops by exact code first, then by name or street', () => {
    expect(searchCatalogStops(stops, 'pa1')[0].code).toBe('PA1');
    expect(searchCatalogStops(stops, 'pajaritos').map((stop) => stop.code)).toEqual(['PA3']);
    expect(searchCatalogStops(stops, 'lucía').map((stop) => stop.code)).toEqual(['PA2']);
    expect(searchCatalogStops(stops, 'x')).toEqual([]);
  });
});
