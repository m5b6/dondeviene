import { describe, expect, it } from 'vitest';
import { TtlCache } from '../server/red/cache';

describe('TtlCache', () => {
  const setup = (options: { ttlMs?: number; staleOnErrorMs?: number; maxEntries?: number } = {}) => {
    let clock = 0;
    const cache = new TtlCache<string>({ ttlMs: 1000, now: () => clock, ...options });
    return { cache, advance: (ms: number) => (clock += ms) };
  };

  it('serves a fresh entry without loading again', async () => {
    const { cache, advance } = setup();
    let loads = 0;
    const load = async () => `v${++loads}`;
    expect((await cache.get('k', load)).value).toBe('v1');
    advance(999);
    expect((await cache.get('k', load)).value).toBe('v1');
    expect(loads).toBe(1);
  });

  it('reloads after the ttl', async () => {
    const { cache, advance } = setup();
    let loads = 0;
    const load = async () => `v${++loads}`;
    await cache.get('k', load);
    advance(1000);
    expect((await cache.get('k', load)).value).toBe('v2');
  });

  it('runs one load for concurrent callers', async () => {
    const { cache } = setup();
    let loads = 0;
    const load = async () => {
      loads += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 'value';
    };
    const results = await Promise.all([cache.get('k', load), cache.get('k', load), cache.get('k', load)]);
    expect(loads).toBe(1);
    expect(results.every((hit) => hit.value === 'value')).toBe(true);
  });

  it('serves the old value marked stale when the reload fails inside the stale window', async () => {
    const { cache, advance } = setup({ staleOnErrorMs: 5000 });
    await cache.get('k', async () => 'old');
    advance(2000);
    const hit = await cache.get('k', async () => {
      throw new Error('upstream down');
    });
    expect(hit).toMatchObject({ value: 'old', stale: true, fetchedAt: 0 });
  });

  it('throws once the stale window has passed', async () => {
    const { cache, advance } = setup({ staleOnErrorMs: 1000 });
    await cache.get('k', async () => 'old');
    advance(2500);
    await expect(
      cache.get('k', async () => {
        throw new Error('upstream down');
      }),
    ).rejects.toThrow('upstream down');
  });

  it('throws when there is nothing cached to fall back on', async () => {
    const { cache } = setup({ staleOnErrorMs: 5000 });
    await expect(
      cache.get('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });

  it('evicts the oldest entries beyond the limit', async () => {
    const { cache } = setup({ maxEntries: 2 });
    let loads = 0;
    const load = async () => `v${++loads}`;
    await cache.get('a', load);
    await cache.get('b', load);
    await cache.get('c', load);
    await cache.get('a', load);
    expect(loads).toBe(4);
  });
});
