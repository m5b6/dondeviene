import { RedError, httpStatusForError, isRedError } from '../red/errors';

export interface JsonOptions {
  cacheSeconds?: number;
  staleSeconds?: number;
}

export const json = (data: unknown, { cacheSeconds = 0, staleSeconds = 0 }: JsonOptions = {}): Response =>
  Response.json(data, {
    headers: {
      'cache-control':
        cacheSeconds > 0
          ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${staleSeconds}`
          : 'no-store',
    },
  });

export const fail = (error: unknown): Response => {
  if (isRedError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: httpStatusForError(error), headers: { 'cache-control': 'no-store' } },
    );
  }
  console.error('unhandled error in api route', error);
  return Response.json(
    { error: { code: 'INTERNAL', message: 'unexpected error' } },
    { status: 500, headers: { 'cache-control': 'no-store' } },
  );
};

export const handle = async (run: () => Promise<Response>): Promise<Response> => {
  try {
    return await run();
  } catch (error) {
    return fail(error);
  }
};

export const requireNumber = (params: URLSearchParams, name: string): number => {
  const raw = params.get(name);
  const value = raw === null || raw.trim() === '' ? Number.NaN : Number(raw);
  if (!Number.isFinite(value)) {
    throw new RedError('INVALID_INPUT', `query parameter "${name}" must be a number`);
  }
  return value;
};

export const optionalInteger = (
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number => {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RedError('INVALID_INPUT', `query parameter "${name}" must be an integer from ${min} to ${max}`);
  }
  return value;
};

export const parseLatLng = (raw: string | null, name: string) => {
  const match = raw ? /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(raw.trim()) : null;
  if (!match) {
    throw new RedError('INVALID_INPUT', `query parameter "${name}" must look like -33.4372,-70.6506`);
  }
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
};
