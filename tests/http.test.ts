import { describe, expect, it } from 'vitest';
import { HttpClient } from '../server/red/http';
import { fakeNetwork } from './helpers';

describe('HttpClient', () => {
  it('identifies itself with an honest user agent', async () => {
    let seen = '';
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      seen = new Headers(init?.headers).get('user-agent') ?? '';
      return new Response('ok');
    }) as typeof fetch;
    await new HttpClient({ fetchImpl, minGapMs: 0 }).get('https://www.red.cl/x');
    expect(seen).toMatch(/^dondeviene\//);
  });

  it('retries gateway errors with backoff and then succeeds', async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    const network = fakeNetwork([['/flaky', () => (++attempts < 3 ? new Response('bad', { status: 502 }) : new Response('fine'))]]);
    const client = new HttpClient({
      fetchImpl: network.fetchImpl,
      minGapMs: 0,
      retries: 2,
      sleep: async (ms) => void sleeps.push(ms),
    });
    const response = await client.get('https://www.red.cl/flaky');
    expect(response.body).toBe('fine');
    expect(attempts).toBe(3);
    expect(sleeps.filter((ms) => ms >= 1000)).toEqual([1000, 2000]);
  });

  it('returns the last gateway error response once retries run out', async () => {
    const network = fakeNetwork([['/down', () => new Response('proxy error', { status: 502 })]]);
    const client = new HttpClient({ fetchImpl: network.fetchImpl, minGapMs: 0, retries: 1, sleep: async () => undefined });
    const response = await client.get('https://www.red.cl/down');
    expect(response.status).toBe(502);
    expect(network.calls).toHaveLength(2);
  });

  it('does not retry client errors', async () => {
    const network = fakeNetwork([['/bad', () => new Response('nope', { status: 400 })]]);
    const client = new HttpClient({ fetchImpl: network.fetchImpl, minGapMs: 0, sleep: async () => undefined });
    expect((await client.get('https://www.red.cl/bad')).status).toBe(400);
    expect(network.calls).toHaveLength(1);
  });

  it('spaces requests to the same host by the minimum gap', async () => {
    let clock = 1000;
    const startedAt: number[] = [];
    const fetchImpl = (async () => {
      startedAt.push(clock);
      return new Response('ok');
    }) as typeof fetch;
    const client = new HttpClient({
      fetchImpl,
      minGapMs: 500,
      now: () => clock,
      sleep: async (ms) => void (clock += ms),
    });
    await Promise.all([
      client.get('https://www.red.cl/a'),
      client.get('https://www.red.cl/b'),
      client.get('https://www.red.cl/c'),
    ]);
    expect(startedAt.map((time, index) => (index === 0 ? 0 : time - startedAt[index - 1]))).toEqual([0, 500, 500]);
  });

  it('does not make different hosts wait for each other', async () => {
    let clock = 1000;
    const startedAt: number[] = [];
    const fetchImpl = (async () => {
      startedAt.push(clock);
      return new Response('ok');
    }) as typeof fetch;
    const client = new HttpClient({ fetchImpl, minGapMs: 500, now: () => clock, sleep: async (ms) => void (clock += ms) });
    await Promise.all([client.get('https://www.red.cl/a'), client.get('https://dtpm.amigocloud.com/b')]);
    expect(startedAt).toEqual([1000, 1000]);
  });

  it('turns a hung request into a TIMEOUT error', async () => {
    const fetchImpl = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    const client = new HttpClient({ fetchImpl, minGapMs: 0, timeoutMs: 10, retries: 0 });
    await expect(client.get('https://www.red.cl/slow')).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('turns a network failure into a NETWORK error', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const client = new HttpClient({ fetchImpl, minGapMs: 0, retries: 0 });
    await expect(client.get('https://www.red.cl/x')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  it('reports invalid JSON as UNEXPECTED_SHAPE', async () => {
    const network = fakeNetwork([['/html', () => new Response('<html>', { status: 200 })]]);
    const client = new HttpClient({ fetchImpl: network.fetchImpl, minGapMs: 0 });
    await expect(client.getJson('https://www.red.cl/html')).rejects.toMatchObject({ code: 'UNEXPECTED_SHAPE' });
  });
});
