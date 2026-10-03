export interface CacheHit<V> {
  value: V;
  fetchedAt: number;
  stale: boolean;
}

interface Entry<V> {
  value: V;
  fetchedAt: number;
}

export interface TtlCacheOptions {
  ttlMs: number;
  staleOnErrorMs?: number;
  maxEntries?: number;
  now?: () => number;
}

export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();
  private readonly inflight = new Map<string, Promise<CacheHit<V>>>();
  private readonly ttlMs: number;
  private readonly staleOnErrorMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: TtlCacheOptions) {
    this.ttlMs = options.ttlMs;
    this.staleOnErrorMs = options.staleOnErrorMs ?? 0;
    this.maxEntries = options.maxEntries ?? 2000;
    this.now = options.now ?? Date.now;
  }

  get(key: string, load: () => Promise<V>): Promise<CacheHit<V>> {
    const entry = this.entries.get(key);
    const now = this.now();
    if (entry && now - entry.fetchedAt < this.ttlMs) {
      return Promise.resolve({ value: entry.value, fetchedAt: entry.fetchedAt, stale: false });
    }
    const running = this.inflight.get(key);
    if (running) return running;

    const promise = load()
      .then((value): CacheHit<V> => {
        const fetchedAt = this.now();
        this.store(key, { value, fetchedAt });
        return { value, fetchedAt, stale: false };
      })
      .catch((error): CacheHit<V> => {
        if (entry && now - entry.fetchedAt < this.ttlMs + this.staleOnErrorMs) {
          return { value: entry.value, fetchedAt: entry.fetchedAt, stale: true };
        }
        throw error;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, promise);
    return promise;
  }

  private store(key: string, entry: Entry<V>): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
