import { redUrls } from './config';
import { RedError } from './errors';
import type { HttpClient } from './http';

export interface RedBootstrap {
  jwt: string;
  jwtExpiresAt: number | null;
  catalogVersion: string | null;
  detourServices: string[];
  fetchedAt: number;
}

const JWT_PATTERN = /\$jwt\s*=\s*'([A-Za-z0-9+/=_-]+)'/;
const VERSION_PATTERN = /const\s+PO_HORA_VERSION\s*=\s*'([^']+)'/;
const DETOURS_PATTERN = /var\s+desvios\s*=\s*\[([\s\S]*?)\]\s*;/;
const QUOTED_PATTERN = /"([^"]+)"/g;

const decodeBase64 = (value: string) => Buffer.from(value, 'base64').toString('utf8');

const decodeJwtExpiry = (jwt: string): number | null => {
  const payload = jwt.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const parseBootstrapPage = (html: string, now: number): RedBootstrap => {
  const encoded = JWT_PATTERN.exec(html)?.[1];
  if (!encoded) {
    throw new RedError('UNEXPECTED_SHAPE', 'prediction token not found in red.cl page');
  }
  const jwt = decodeBase64(encoded);
  if (jwt.split('.').length !== 3) {
    throw new RedError('UNEXPECTED_SHAPE', 'prediction token is not a JWT');
  }
  const detoursBlock = DETOURS_PATTERN.exec(html)?.[1] ?? '';
  const detourServices = [...new Set([...detoursBlock.matchAll(QUOTED_PATTERN)].map((match) => match[1]))];
  return {
    jwt,
    jwtExpiresAt: decodeJwtExpiry(jwt),
    catalogVersion: VERSION_PATTERN.exec(html)?.[1] ?? null,
    detourServices,
    fetchedAt: now,
  };
};

export interface BootstrapProviderOptions {
  now?: () => number;
  maxAgeMs?: number;
  expirySafetyMarginMs?: number;
}

export class BootstrapProvider {
  private current: RedBootstrap | null = null;
  private inflight: Promise<RedBootstrap> | null = null;
  private forceRefresh = false;
  private readonly now: () => number;
  private readonly maxAgeMs: number;
  private readonly expirySafetyMarginMs: number;

  constructor(
    private readonly http: HttpClient,
    options: BootstrapProviderOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.maxAgeMs = options.maxAgeMs ?? 15 * 60_000;
    this.expirySafetyMarginMs = options.expirySafetyMarginMs ?? 120_000;
  }

  async get(): Promise<RedBootstrap> {
    if (this.current && !this.forceRefresh && !this.isStale(this.current)) return this.current;
    this.inflight ??= this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  invalidate(): void {
    this.forceRefresh = true;
  }

  private isStale(bootstrap: RedBootstrap): boolean {
    const now = this.now();
    if (now - bootstrap.fetchedAt > this.maxAgeMs) return true;
    return bootstrap.jwtExpiresAt !== null && bootstrap.jwtExpiresAt - this.expirySafetyMarginMs <= now;
  }

  private async refresh(): Promise<RedBootstrap> {
    try {
      const html = await this.http.getText(redUrls.bootstrapPage);
      this.current = parseBootstrapPage(html, this.now());
      this.forceRefresh = false;
      return this.current;
    } catch (error) {
      const previous = this.current;
      const stillValid = previous && (previous.jwtExpiresAt === null || previous.jwtExpiresAt > this.now());
      if (stillValid) return previous;
      throw error;
    }
  }
}
