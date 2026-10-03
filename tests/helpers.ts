import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BootstrapProvider } from '../server/red/bootstrap';
import { HttpClient } from '../server/red/http';

export const fixture = (name: string): string =>
  readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

export const fixtureJson = <T = unknown>(name: string): T => JSON.parse(fixture(name)) as T;

export const fakeJwt = (expiresAtMs: number): string => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ typ: 'JWT', alg: 'HS256' })}.${encode({ exp: Math.floor(expiresAtMs / 1000) })}.signature`;
};

export const bootstrapPage = (jwt: string, version = '20261003_2', detours = ['385', 'E04', '107c']): string => `
<html><body>
<script>const PO_HORA_VERSION = '${version}';</script>
<script type="text/javascript">
var desvios = [
${detours.map((code) => `    "${code}",`).join('\n')}
];
</script>
<script>
    $jwt = '${Buffer.from(jwt).toString('base64')}';
    $codsimt = '';
    consultaParadero($jwt,$codsimt, desvios);
</script>
</body></html>`;

export type Handler = (url: URL) => Response | Promise<Response>;

export interface FakeNetwork {
  fetchImpl: typeof fetch;
  calls: string[];
  callsMatching: (pattern: string | RegExp) => string[];
}

export const fakeNetwork = (routes: Array<[string | RegExp, Handler]>): FakeNetwork => {
  const calls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    calls.push(url.toString());
    for (const [pattern, handler] of routes) {
      const matches = typeof pattern === 'string' ? url.toString().includes(pattern) : pattern.test(url.toString());
      if (matches) return handler(url);
    }
    return new Response('Ruta no encontrada.', { status: 404 });
  }) as typeof fetch;
  return {
    fetchImpl,
    calls,
    callsMatching: (pattern) =>
      calls.filter((call) => (typeof pattern === 'string' ? call.includes(pattern) : pattern.test(call))),
  };
};

export const testHttp = (network: FakeNetwork, now: () => number = Date.now): HttpClient =>
  new HttpClient({
    fetchImpl: network.fetchImpl,
    minGapMs: 0,
    retries: 2,
    now,
    sleep: async () => undefined,
  });

export const testBootstrap = (http: HttpClient, now: () => number = Date.now): BootstrapProvider =>
  new BootstrapProvider(http, { now });
