import { describe, expect, it } from 'vitest';
import { RedError } from '../server/red/errors';
import { fetchStopPrediction, normalizePrediction, statusFromCode } from '../server/red/predictions';
import { bootstrapPage, fakeJwt, fakeNetwork, fixtureJson, testBootstrap, testHttp } from './helpers';

const NOW = Date.parse('2026-10-03T15:00:00Z');
const captured = () => fixtureJson<Record<string, unknown>>('prediccion_PC187.json');

describe('normalizePrediction', () => {
  it('normalizes a real capture', () => {
    const prediction = normalizePrediction(captured(), 'PC187');
    expect(prediction.stop).toEqual({
      code: 'PC187',
      name: 'PARADA 2 / HOSPITAL METROPOLITANO',
      latitude: -33.4191229,
      longitude: -70.6058199,
    });
    expect(prediction.localDate).toBe('2026-10-03');
    expect(prediction.services).toHaveLength(10);
  });

  it('puts services with the soonest bus first and empty services last', () => {
    const { services } = normalizePrediction(captured(), 'PC187');
    expect(services[0].service).toBe('421');
    expect(services[0].buses[0].eta.kind).toBe('under');
    const noBuses = services.filter((service) => service.status === 'no_buses');
    expect(noBuses).toHaveLength(4);
    expect(services.slice(-4).every((service) => service.status === 'no_buses')).toBe(true);
  });

  it('keeps plates and distances as numbers and nulls', () => {
    const service = normalizePrediction(captured(), 'PC187').services.find((item) => item.service === '401');
    expect(service?.buses[0]).toMatchObject({ plate: 'PFVJ-21', distanceMeters: 675 });
    expect(service?.buses[0].eta).toMatchObject({ kind: 'under', maxMinutes: 3 });
    expect(service?.buses[1].eta).toMatchObject({ kind: 'between', minMinutes: 7, maxMinutes: 11 });
    expect(service?.destination).toBe('Maipú');
  });

  it('normalizes colours to lowercase and blank colours to null', () => {
    const payload = {
      ...captured(),
      servicios: {
        item: [
          { codigorespuesta: '00', servicio: 'A1', color: '#CF152D', horaprediccionbus1: 'Llegando' },
          { codigorespuesta: '00', servicio: 'A2', color: '', horaprediccionbus1: 'Llegando' },
        ],
      },
    };
    const colors = Object.fromEntries(
      normalizePrediction(payload, 'PC187').services.map((service) => [service.service, service.color]),
    );
    expect(colors).toEqual({ A1: '#cf152d', A2: null });
  });

  it('accepts a single service sent as an object instead of a list', () => {
    const payload = {
      ...captured(),
      servicios: { item: { codigorespuesta: '01', servicio: '210', horaprediccionbus1: 'Mas de 40 min' } },
    };
    const { services } = normalizePrediction(payload, 'PC187');
    expect(services).toHaveLength(1);
    expect(services[0].buses).toHaveLength(1);
    expect(services[0].status).toBe('ok');
  });

  it('copes with services that omit destination, colour and direction', () => {
    const payload = {
      ...captured(),
      servicios: { item: [{ codigorespuesta: '10', servicio: '505', respuestaServicio: 'No hay buses que se dirijan al paradero' }] },
    };
    const [service] = normalizePrediction(payload, 'PC187').services;
    expect(service).toMatchObject({ destination: null, direction: null, color: null, hasTimetable: false, buses: [] });
  });

  it('returns an empty list when the stop has no services block', () => {
    expect(normalizePrediction({ ...captured(), servicios: null }, 'PC187').services).toEqual([]);
  });

  it('rejects stops red.cl does not know', () => {
    expect(() => normalizePrediction({ ...captured(), nomett: null }, 'PC187')).toThrowError(
      expect.objectContaining({ code: 'UNKNOWN_STOP' }),
    );
  });

  it('flags payloads that no longer match the expected shape', () => {
    expect(() => normalizePrediction({ servicios: 'surprise' }, 'PC187')).toThrow(RedError);
  });
});

describe('statusFromCode', () => {
  it('maps the codes red.cl uses', () => {
    expect(statusFromCode('00')).toBe('ok');
    expect(statusFromCode('01')).toBe('ok');
    expect(statusFromCode('10')).toBe('no_buses');
    expect(statusFromCode('11')).toBe('out_of_service');
    expect(statusFromCode('9')).toBe('frequency');
    expect(statusFromCode('42')).toBe('unknown');
  });
});

describe('fetchStopPrediction', () => {
  const tokenPage = (expiresAt: number) => new Response(bootstrapPage(fakeJwt(expiresAt)));

  it('sends the token and stop code and returns normalized data', async () => {
    const network = fakeNetwork([
      ['/cuando-llega/', () => tokenPage(NOW + 3_600_000)],
      ['/predictorPlus/prediccion', () => Response.json(captured())],
    ]);
    const http = testHttp(network, () => NOW);
    const result = await fetchStopPrediction({ http, bootstrap: testBootstrap(http, () => NOW) }, 'PC187');
    expect(result.services.length).toBeGreaterThan(0);
    const url = new URL(network.callsMatching('/predictorPlus/')[0]);
    expect(url.searchParams.get('codsimt')).toBe('PC187');
    expect(url.searchParams.get('t')).toMatch(/^[\w-]+\.[\w-]+\.signature$/);
    expect(url.searchParams.has('codser')).toBe(false);
  });

  it('passes a service filter through', async () => {
    const network = fakeNetwork([
      ['/cuando-llega/', () => tokenPage(NOW + 3_600_000)],
      ['/predictorPlus/prediccion', () => Response.json(captured())],
    ]);
    const http = testHttp(network, () => NOW);
    await fetchStopPrediction({ http, bootstrap: testBootstrap(http, () => NOW) }, 'PC187', '401');
    expect(new URL(network.callsMatching('/predictorPlus/')[0]).searchParams.get('codser')).toBe('401');
  });

  it('refreshes the token once when red.cl answers 500 and retries', async () => {
    let predictionCalls = 0;
    const network = fakeNetwork([
      ['/cuando-llega/', () => tokenPage(NOW + 3_600_000)],
      [
        '/predictorPlus/prediccion',
        () => (++predictionCalls === 1 ? new Response('Token inválido', { status: 500 }) : Response.json(captured())),
      ],
    ]);
    const http = testHttp(network, () => NOW);
    const result = await fetchStopPrediction({ http, bootstrap: testBootstrap(http, () => NOW) }, 'PC187');
    expect(result.stop.code).toBe('PC187');
    expect(network.callsMatching('/cuando-llega/')).toHaveLength(2);
    expect(predictionCalls).toBe(2);
  });

  it('gives up with BAD_TOKEN when a fresh token is also refused', async () => {
    const network = fakeNetwork([
      ['/cuando-llega/', () => tokenPage(NOW + 3_600_000)],
      ['/predictorPlus/prediccion', () => new Response('Token inválido', { status: 500 })],
    ]);
    const http = testHttp(network, () => NOW);
    await expect(
      fetchStopPrediction({ http, bootstrap: testBootstrap(http, () => NOW) }, 'PC187'),
    ).rejects.toMatchObject({ code: 'BAD_TOKEN' });
  });

  it('maps a 400 to UNKNOWN_STOP', async () => {
    const network = fakeNetwork([
      ['/cuando-llega/', () => tokenPage(NOW + 3_600_000)],
      ['/predictorPlus/prediccion', () => new Response("Formato incorrecto para el parámetro 'codsimt'.", { status: 400 })],
    ]);
    const http = testHttp(network, () => NOW);
    await expect(
      fetchStopPrediction({ http, bootstrap: testBootstrap(http, () => NOW) }, 'PA99999'),
    ).rejects.toMatchObject({ code: 'UNKNOWN_STOP' });
  });

  it('validates codes locally without touching the network', async () => {
    const network = fakeNetwork([]);
    const http = testHttp(network);
    const deps = { http, bootstrap: testBootstrap(http) };
    await expect(fetchStopPrediction(deps, 'pc187')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(fetchStopPrediction(deps, 'PC187', 'bad code')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(network.calls).toHaveLength(0);
  });
});
