import { describe, expect, it } from 'vitest';
import { BootstrapProvider, parseBootstrapPage } from '../server/red/bootstrap';
import { RedError } from '../server/red/errors';
import { bootstrapPage, fakeJwt, fakeNetwork, testHttp } from './helpers';

const NOW = Date.parse('2026-10-03T15:00:00Z');

describe('parseBootstrapPage', () => {
  it('extracts the token, its expiry, the catalog version and detoured services', () => {
    const jwt = fakeJwt(NOW + 3_600_000);
    const parsed = parseBootstrapPage(bootstrapPage(jwt), NOW);
    expect(parsed.jwt).toBe(jwt);
    expect(parsed.jwtExpiresAt).toBe(NOW + 3_600_000);
    expect(parsed.catalogVersion).toBe('20261003_2');
    expect(parsed.detourServices).toEqual(['385', 'E04', '107c']);
  });

  it('fails loudly when the page layout changes', () => {
    expect(() => parseBootstrapPage('<html>nothing here</html>', NOW)).toThrow(RedError);
  });

  it('lists each detoured service once even when red.cl repeats it', () => {
    const jwt = fakeJwt(NOW + 1000);
    const parsed = parseBootstrapPage(bootstrapPage(jwt, '1', ['226', 'E12', '226', 'E12', '107c']), NOW);
    expect(parsed.detourServices).toEqual(['226', 'E12', '107c']);
  });

  it('tolerates a page with no detour list', () => {
    const jwt = fakeJwt(NOW + 1000);
    const page = bootstrapPage(jwt).replace(/var desvios[\s\S]*?\];/, '');
    expect(parseBootstrapPage(page, NOW).detourServices).toEqual([]);
  });
});

describe('BootstrapProvider', () => {
  const setup = (pages: string[]) => {
    let clock = NOW;
    let index = 0;
    const network = fakeNetwork([
      ['/planifica-tu-viaje/cuando-llega/', () => new Response(pages[Math.min(index++, pages.length - 1)])],
    ]);
    const http = testHttp(network, () => clock);
    const provider = new BootstrapProvider(http, { now: () => clock });
    return { network, provider, advance: (ms: number) => (clock += ms) };
  };

  it('fetches once and reuses the token while it is fresh', async () => {
    const { network, provider } = setup([bootstrapPage(fakeJwt(NOW + 3_600_000))]);
    await provider.get();
    await provider.get();
    expect(network.calls).toHaveLength(1);
  });

  it('shares one request between concurrent callers', async () => {
    const { network, provider } = setup([bootstrapPage(fakeJwt(NOW + 3_600_000))]);
    await Promise.all([provider.get(), provider.get(), provider.get()]);
    expect(network.calls).toHaveLength(1);
  });

  it('refreshes before the token expires', async () => {
    const { network, provider, advance } = setup([
      bootstrapPage(fakeJwt(NOW + 600_000)),
      bootstrapPage(fakeJwt(NOW + 4_200_000)),
    ]);
    await provider.get();
    advance(490_000);
    const refreshed = await provider.get();
    expect(network.calls).toHaveLength(2);
    expect(refreshed.jwtExpiresAt).toBe(NOW + 4_200_000);
  });

  it('refreshes when told the token was rejected', async () => {
    const { network, provider } = setup([
      bootstrapPage(fakeJwt(NOW + 3_600_000)),
      bootstrapPage(fakeJwt(NOW + 3_700_000)),
    ]);
    await provider.get();
    provider.invalidate();
    await provider.get();
    expect(network.calls).toHaveLength(2);
  });

  it('keeps using a still-valid token when a refresh fails', async () => {
    let fail = false;
    const network = fakeNetwork([
      [
        '/planifica-tu-viaje/cuando-llega/',
        () => (fail ? new Response('down', { status: 503 }) : new Response(bootstrapPage(fakeJwt(NOW + 3_600_000)))),
      ],
    ]);
    const http = testHttp(network, () => NOW);
    const provider = new BootstrapProvider(http, { now: () => NOW });
    const first = await provider.get();
    fail = true;
    provider.invalidate();
    expect(await provider.get()).toEqual(first);
  });

  it('throws when there is no usable token at all', async () => {
    const network = fakeNetwork([['/planifica-tu-viaje/', () => new Response('down', { status: 503 })]]);
    const provider = new BootstrapProvider(testHttp(network), { now: () => NOW });
    await expect(provider.get()).rejects.toMatchObject({ code: 'UPSTREAM_DOWN' });
  });
});
