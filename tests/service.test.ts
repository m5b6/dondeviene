import { describe, expect, it } from 'vitest';
import { RedService } from '../server/red/service';
import type { Catalog } from '../server/red/types';
import { bootstrapPage, fakeJwt, fakeNetwork, fixture, fixtureJson, testBootstrap, testHttp } from './helpers';

const NOW = Date.parse('2026-10-03T15:00:00Z');

const catalog: Catalog = {
  version: '20261003_2',
  generatedAt: '2026-10-03T00:00:00Z',
  services: ['210', '401'],
  stops: [
    { code: 'PC187', name: 'PARADA 2 / HOSPITAL METROPOLITANO', commune: 'PROVIDENCIA', street: 'Av. Providencia', latitude: -33.4191, longitude: -70.6058, services: ['401', '503'] },
    { code: 'PA1', name: 'Plaza de Armas', commune: 'SANTIAGO', street: 'Catedral', latitude: -33.4372, longitude: -70.6506, services: ['210'] },
  ],
};

const build = (clockRef = { now: NOW }) => {
  const network = fakeNetwork([
    ['/cuando-llega/', () => new Response(bootstrapPage(fakeJwt(NOW + 3_600_000)))],
    ['/predictorPlus/prediccion', () => Response.json(fixtureJson('prediccion_PC187.json'))],
    ['/jsonPO/servicio_210.json', () => Response.json(fixtureJson('servicio_210.trimmed.json'))],
    ['/geocoder/buscar', () => Response.json(fixtureJson('geocoder_buscar.json'))],
    ['/api/otp/plan', () => Response.json(fixtureJson('otp_plan.json'))],
  ]);
  const now = () => clockRef.now;
  const http = testHttp(network, now);
  const service = new RedService({ http, bootstrap: testBootstrap(http, now), catalog, now });
  return { service, network, clockRef };
};

describe('RedService.stopArrivals', () => {
  it('returns arrivals enriched with the local catalog entry', async () => {
    const { service } = build();
    const result = await service.stopArrivals('PC187');
    expect(result.stop.name).toBe('PARADA 2 / HOSPITAL METROPOLITANO');
    expect(result.catalogStop?.street).toBe('Av. Providencia');
    expect(result.stale).toBe(false);
    expect(result.ageSeconds).toBe(0);
    expect(result.observedAt).toBe('2026-10-03T15:00:00.000Z');
  });

  it('costs red.cl one request for any number of simultaneous viewers of a stop', async () => {
    const { service, network } = build();
    await Promise.all(Array.from({ length: 25 }, () => service.stopArrivals('PC187')));
    expect(network.callsMatching('/predictorPlus/')).toHaveLength(1);
  });

  it('serves the cached answer inside 15 seconds and refreshes after', async () => {
    const { service, network, clockRef } = build();
    await service.stopArrivals('PC187');
    clockRef.now += 14_000;
    const cached = await service.stopArrivals('PC187');
    expect(cached.ageSeconds).toBe(14);
    expect(network.callsMatching('/predictorPlus/')).toHaveLength(1);
    clockRef.now += 2_000;
    await service.stopArrivals('PC187');
    expect(network.callsMatching('/predictorPlus/')).toHaveLength(2);
  });

  it('keeps answering with a stale result when red.cl goes down', async () => {
    let up = true;
    const clockRef = { now: NOW };
    const network = fakeNetwork([
      ['/cuando-llega/', () => new Response(bootstrapPage(fakeJwt(NOW + 3_600_000)))],
      ['/predictorPlus/prediccion', () => (up ? Response.json(fixtureJson('prediccion_PC187.json')) : new Response('proxy', { status: 502 }))],
    ]);
    const now = () => clockRef.now;
    const http = testHttp(network, now);
    const service = new RedService({ http, bootstrap: testBootstrap(http, now), catalog, now });
    await service.stopArrivals('PC187');
    up = false;
    clockRef.now += 30_000;
    const result = await service.stopArrivals('PC187');
    expect(result.stale).toBe(true);
    expect(result.ageSeconds).toBe(30);
    expect(result.services.length).toBeGreaterThan(0);
  });

  it('caches per service filter separately', async () => {
    const { service, network } = build();
    await service.stopArrivals('PC187');
    await service.stopArrivals('PC187', '401');
    expect(network.callsMatching('/predictorPlus/')).toHaveLength(2);
  });
});

describe('RedService other operations', () => {
  it('finds nearby stops from the local catalog and sorts by distance', async () => {
    const { service, network } = build();
    const stops = await service.nearbyStops(-33.4372, -70.6506, { maxMeters: 1000 });
    expect(stops.map((stop) => stop.code)).toEqual(['PA1']);
    expect(network.calls).toHaveLength(0);
  });

  it('refuses coordinates outside Santiago', async () => {
    const { service } = build();
    await expect(service.nearbyStops(40.4, -3.7)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('explains how to build the catalog when it is missing', async () => {
    const network = fakeNetwork([]);
    const http = testHttp(network);
    const service = new RedService({ http, bootstrap: testBootstrap(http), catalog: null });
    await expect(service.nearbyStops(-33.4372, -70.6506)).rejects.toMatchObject({ code: 'CATALOG_UNAVAILABLE' });
  });

  it('combines catalog stops with geocoded places', async () => {
    const { service } = build();
    const result = await service.search('Providencia');
    expect(result.stops.map((stop) => stop.code)).toContain('PC187');
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.placesAvailable).toBe(true);
  });

  it('still returns stops when the geocoder is down', async () => {
    const network = fakeNetwork([['/geocoder/buscar', () => new Response('x', { status: 502 })]]);
    const http = testHttp(network);
    const service = new RedService({ http, bootstrap: testBootstrap(http), catalog });
    const result = await service.search('Plaza de Armas');
    expect(result.stops.map((stop) => stop.code)).toEqual(['PA1']);
    expect(result.placesAvailable).toBe(false);
  });

  it('loads a route once per catalog version', async () => {
    const { service, network } = build();
    await service.route('210');
    await service.route('210');
    expect(network.callsMatching('servicio_210.json')).toHaveLength(1);
  });

  it('plans a trip and refuses endpoints outside the region', async () => {
    const { service } = build();
    const result = await service.plan({
      from: { latitude: -33.4372, longitude: -70.6506 },
      to: { latitude: -33.4489, longitude: -70.6693 },
    });
    expect(result.itineraries).toHaveLength(3);
    await expect(
      service.plan({ from: { latitude: 0, longitude: 0 }, to: { latitude: -33.4, longitude: -70.6 } }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('reports upstream status including detours and token expiry', async () => {
    const { service } = build();
    const status = await service.status();
    expect(status.catalogVersion).toBe('20261003_2');
    expect(status.detourServices).toContain('385');
    expect(status.tokenExpiresAt).toBe('2026-10-03T16:00:00.000Z');
    expect(status.localCatalog).toMatchObject({ stops: 2, services: 2 });
  });
});

describe('fixtures', () => {
  it('real prediction capture is present', () => {
    expect(fixture('prediccion_PC187.json')).toContain('PARADA 2 / HOSPITAL METROPOLITANO');
  });
});
