import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BootstrapProvider } from '../server/red/bootstrap';
import { addStops, buildCatalog, saveCatalog, stopFromPrediction } from '../server/red/catalog';
import { redUrls } from '../server/red/config';
import { isRedError } from '../server/red/errors';
import { HttpClient } from '../server/red/http';
import { fetchStopPrediction } from '../server/red/predictions';
import { normalizeRouteFile } from '../server/red/routes';
import type { CatalogStop, RouteFile } from '../server/red/types';

const ROOT = process.cwd();
const RAW_DIR = path.join(ROOT, 'data/raw/routes');
const VERSION_FILE = path.join(ROOT, 'data/raw/version.txt');
const MISSING_FILE = path.join(ROOT, 'data/raw/missing-services.json');
const UNRESOLVED_FILE = path.join(ROOT, 'data/raw/unresolved-stops.json');
const GAP_MS = Number(process.env.CRAWL_GAP_MS ?? 1200);
const MAX_CONSECUTIVE_FAILURES = Number(process.env.CRAWL_MAX_FAILURES ?? 5);
const FORCE = process.env.CRAWL_FORCE === '1';

const exists = async (file: string) => {
  try {
    await readFile(file);
    return true;
  } catch {
    return false;
  }
};

const readText = async (file: string) => {
  try {
    return (await readFile(file, 'utf8')).trim();
  } catch {
    return null;
  }
};

const main = async () => {
  const http = new HttpClient({ minGapMs: GAP_MS });
  const bootstrap = new BootstrapProvider(http);
  const { catalogVersion } = await bootstrap.get();
  console.log(`catalog version: ${catalogVersion ?? 'unknown'}`);

  const [services, stopCodes] = await Promise.all([
    http.getJson<string[]>(redUrls.allServices),
    http.getJson<string[]>(redUrls.allStops),
  ]);
  console.log(`upstream lists: ${services.length} services, ${stopCodes.length} stops`);

  await mkdir(RAW_DIR, { recursive: true });
  const previousVersion = await readText(VERSION_FILE);
  const reuseCache = !FORCE && previousVersion === catalogVersion;
  if (!reuseCache) console.log('version changed or forced: re-downloading every route file');

  const missing: string[] = [];
  let consecutiveFailures = 0;
  let downloaded = 0;

  for (const [index, service] of services.entries()) {
    const file = path.join(RAW_DIR, `${service}.json`);
    if (reuseCache && (await exists(file))) continue;
    try {
      const url = `${redUrls.serviceFile(service)}${catalogVersion ? `?v=${encodeURIComponent(catalogVersion)}` : ''}`;
      const response = await http.get(url);
      if (response.status === 404) {
        missing.push(service);
        console.warn(`404 ${service}`);
        continue;
      }
      if (!response.ok) throw http.statusError(response);
      normalizeRouteFile(service, JSON.parse(response.body));
      await writeFile(file, response.body);
      downloaded += 1;
      consecutiveFailures = 0;
      if (downloaded % 25 === 0) console.log(`  ${index + 1}/${services.length} (${downloaded} downloaded)`);
    } catch (error) {
      consecutiveFailures += 1;
      const reason = isRedError(error) ? `${error.code}: ${error.message}` : String(error);
      console.error(`failed ${service}: ${reason}`);
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`stopping after ${consecutiveFailures} consecutive failures; rerun to resume`);
        process.exit(2);
      }
    }
  }

  const files = (await readdir(RAW_DIR)).filter((name) => name.endsWith('.json'));
  const routes: RouteFile[] = [];
  for (const name of files) {
    const service = name.replace(/\.json$/, '');
    routes.push(normalizeRouteFile(service, JSON.parse(await readFile(path.join(RAW_DIR, name), 'utf8'))));
  }

  const fromRoutes = buildCatalog(routes, catalogVersion, new Date().toISOString());
  const routeStopCodes = new Set(fromRoutes.stops.map((stop) => stop.code));
  const withoutRoute = stopCodes.filter((code) => !routeStopCodes.has(code));
  console.log(`${withoutRoute.length} stops are on no current route; resolving them through predictions`);

  const backfilled: CatalogStop[] = [];
  const unresolved: string[] = [];
  let backfillFailures = 0;
  for (const code of withoutRoute) {
    try {
      const prediction = await fetchStopPrediction({ http, bootstrap }, code);
      const stop = stopFromPrediction(prediction);
      if (stop) backfilled.push(stop);
      else unresolved.push(code);
      backfillFailures = 0;
    } catch (error) {
      if (isRedError(error) && error.code === 'UNKNOWN_STOP') {
        unresolved.push(code);
        continue;
      }
      backfillFailures += 1;
      console.error(`failed ${code}: ${isRedError(error) ? error.code : String(error)}`);
      unresolved.push(code);
      if (backfillFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error(`stopping backfill after ${backfillFailures} consecutive failures`);
        process.exit(2);
      }
    }
  }

  const catalog = addStops(fromRoutes, backfilled);
  await saveCatalog(ROOT, catalog);
  await writeFile(VERSION_FILE, `${catalogVersion ?? ''}\n`);
  await writeFile(MISSING_FILE, `${JSON.stringify(missing, null, 2)}\n`);
  await writeFile(UNRESOLVED_FILE, `${JSON.stringify(unresolved, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        servicesListed: services.length,
        routeFiles: routes.length,
        missingServices: missing.length,
        stopsListed: stopCodes.length,
        stopsFromRoutes: fromRoutes.stops.length,
        stopsBackfilledFromPredictions: backfilled.length,
        stopsInCatalog: catalog.stops.length,
        stopsStillWithoutCoordinates: unresolved.length,
        sampleUnresolved: unresolved.slice(0, 10),
        downloadedThisRun: downloaded,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
