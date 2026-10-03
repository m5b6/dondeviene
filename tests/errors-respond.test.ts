import { describe, expect, it } from 'vitest';
import { fail, optionalInteger, parseLatLng, requireNumber } from '../server/http/respond';
import { RedError, httpStatusForError, isRedError } from '../server/red/errors';

class ForeignRedError extends Error {
  readonly code = 'INVALID_INPUT';
  constructor(message: string) {
    super(message);
    this.name = 'RedError';
  }
}

describe('isRedError', () => {
  it('recognises errors from this module', () => {
    expect(isRedError(new RedError('TIMEOUT', 'slow'))).toBe(true);
  });

  it('recognises a copy of the class loaded by another bundle', () => {
    expect(isRedError(new ForeignRedError('x'))).toBe(true);
  });

  it('rejects ordinary errors and non-errors', () => {
    expect(isRedError(new Error('x'))).toBe(false);
    expect(isRedError({ name: 'RedError', code: 'TIMEOUT' })).toBe(false);
    expect(isRedError(null)).toBe(false);
  });
});

describe('httpStatusForError', () => {
  it.each([
    ['INVALID_INPUT', 400],
    ['UNKNOWN_STOP', 404],
    ['UNKNOWN_SERVICE', 404],
    ['CATALOG_UNAVAILABLE', 503],
    ['TIMEOUT', 502],
    ['UPSTREAM_DOWN', 502],
    ['BAD_TOKEN', 502],
    ['UNEXPECTED_SHAPE', 502],
  ] as const)('%s becomes %i', (code, status) => {
    expect(httpStatusForError(new RedError(code, 'x'))).toBe(status);
  });
});

describe('fail', () => {
  it('answers with the mapped status even for an error class from another bundle', async () => {
    const response = fail(new ForeignRedError('bad stop'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: 'INVALID_INPUT', message: 'bad stop' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('hides details of unexpected errors', async () => {
    const response = fail(new Error('secret internals'));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });
});

describe('query parsing', () => {
  const query = (text: string) => new URLSearchParams(text);

  it('requires finite numbers', () => {
    expect(requireNumber(query('lat=-33.4'), 'lat')).toBe(-33.4);
    expect(() => requireNumber(query('lat='), 'lat')).toThrow(RedError);
    expect(() => requireNumber(query('lat=abc'), 'lat')).toThrow(RedError);
    expect(() => requireNumber(query(''), 'lat')).toThrow(RedError);
  });

  it('bounds optional integers', () => {
    expect(optionalInteger(query(''), 'limit', 10, 1, 30)).toBe(10);
    expect(optionalInteger(query('limit=5'), 'limit', 10, 1, 30)).toBe(5);
    expect(() => optionalInteger(query('limit=31'), 'limit', 10, 1, 30)).toThrow(RedError);
    expect(() => optionalInteger(query('limit=2.5'), 'limit', 10, 1, 30)).toThrow(RedError);
  });

  it('parses coordinate pairs', () => {
    expect(parseLatLng('-33.4372,-70.6506', 'from')).toEqual({ latitude: -33.4372, longitude: -70.6506 });
    expect(() => parseLatLng('-33.4372', 'from')).toThrow(RedError);
    expect(() => parseLatLng(null, 'from')).toThrow(RedError);
  });
});
