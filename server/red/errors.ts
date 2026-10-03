export type RedErrorCode =
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UPSTREAM_STATUS'
  | 'UPSTREAM_DOWN'
  | 'BAD_TOKEN'
  | 'INVALID_INPUT'
  | 'UNKNOWN_STOP'
  | 'UNKNOWN_SERVICE'
  | 'CATALOG_UNAVAILABLE'
  | 'UNEXPECTED_SHAPE';

export interface RedErrorDetails {
  status?: number | null;
  url?: string;
  upstreamBody?: string;
  cause?: unknown;
}

export class RedError extends Error {
  readonly code: RedErrorCode;
  readonly status: number | null;
  readonly url: string | undefined;
  readonly upstreamBody: string | undefined;

  constructor(code: RedErrorCode, message: string, details: RedErrorDetails = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = 'RedError';
    this.code = code;
    this.status = details.status ?? null;
    this.url = details.url;
    this.upstreamBody = details.upstreamBody?.slice(0, 500);
  }
}

export const isRedError = (value: unknown): value is RedError =>
  value instanceof Error &&
  value.name === 'RedError' &&
  typeof (value as { code?: unknown }).code === 'string';

export const httpStatusForError = (error: RedError): number => {
  switch (error.code) {
    case 'INVALID_INPUT':
      return 400;
    case 'UNKNOWN_STOP':
    case 'UNKNOWN_SERVICE':
      return 404;
    case 'CATALOG_UNAVAILABLE':
      return 503;
    case 'TIMEOUT':
    case 'NETWORK':
    case 'UPSTREAM_DOWN':
    case 'BAD_TOKEN':
    case 'UPSTREAM_STATUS':
    case 'UNEXPECTED_SHAPE':
      return 502;
  }
};
