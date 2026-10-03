import { USER_AGENT } from './config';
import { RedError, isRedError } from './errors';

export interface HttpClientOptions {
  userAgent?: string;
  minGapMs?: number;
  timeoutMs?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  ok: boolean;
  body: string;
  headers: Headers;
  url: string;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const backoffMs = (attempt: number) => 1000 * 2 ** (attempt - 1);

export class HttpClient {
  private readonly userAgent: string;
  private readonly minGapMs: number;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly tails = new Map<string, Promise<void>>();
  private readonly lastStartedAt = new Map<string, number>();

  constructor(options: HttpClientOptions = {}) {
    this.userAgent = options.userAgent ?? USER_AGENT;
    this.minGapMs = options.minGapMs ?? 250;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.retries = options.retries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
  }

  async get(url: string, options: RequestOptions = {}): Promise<HttpResponse> {
    const origin = new URL(url).origin;
    const retries = options.retries ?? this.retries;
    let lastError: RedError | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await this.sleep(backoffMs(attempt));
      await this.waitForTurn(origin);
      try {
        const response = await this.requestOnce(url, options);
        if (RETRYABLE_STATUS.has(response.status) && attempt < retries) continue;
        return response;
      } catch (error) {
        if (!isRedError(error) || attempt === retries) throw error;
        lastError = error;
      }
    }
    throw lastError ?? new RedError('NETWORK', 'request failed', { url });
  }

  async getJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.get(url, options);
    if (!response.ok) throw this.statusError(response);
    try {
      return JSON.parse(response.body) as T;
    } catch (cause) {
      throw new RedError('UNEXPECTED_SHAPE', 'upstream returned invalid JSON', {
        url,
        status: response.status,
        upstreamBody: response.body,
        cause,
      });
    }
  }

  async getText(url: string, options: RequestOptions = {}): Promise<string> {
    const response = await this.get(url, options);
    if (!response.ok) throw this.statusError(response);
    return response.body;
  }

  statusError(response: HttpResponse): RedError {
    const code = response.status >= 502 ? 'UPSTREAM_DOWN' : 'UPSTREAM_STATUS';
    return new RedError(code, `upstream answered ${response.status}`, {
      url: response.url,
      status: response.status,
      upstreamBody: response.body,
    });
  }

  private async waitForTurn(origin: string): Promise<void> {
    const previous = this.tails.get(origin) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tails.set(
      origin,
      previous.then(() => mine),
    );
    await previous;
    const last = this.lastStartedAt.get(origin);
    if (last !== undefined) {
      const wait = last + this.minGapMs - this.now();
      if (wait > 0) await this.sleep(wait);
    }
    this.lastStartedAt.set(origin, this.now());
    release();
  }

  private async requestOnce(url: string, options: RequestOptions): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'user-agent': this.userAgent, accept: '*/*', ...options.headers },
      });
      const body = await response.text();
      return { status: response.status, ok: response.ok, body, headers: response.headers, url };
    } catch (cause) {
      if (controller.signal.aborted) {
        throw new RedError('TIMEOUT', `timed out after ${options.timeoutMs ?? this.timeoutMs} ms`, {
          url,
          cause,
        });
      }
      throw new RedError('NETWORK', 'network error', { url, cause });
    } finally {
      clearTimeout(timer);
    }
  }
}
