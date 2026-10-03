# Dónde viene

Real-time bus arrivals for Santiago, built on top of red.cl's own data. The visual direction is in [DESIGN.md](DESIGN.md); everything known about red.cl's services is in [docs/RED_API.md](docs/RED_API.md).

## Front end

Mobile first, with a desktop layout (rail, departures board, route panel). Pages: **Cerca de ti** (`/`), **Paradero** (`/paradero/PC187`), **Recorrido** (`/servicio/401?stop=PC187`), **Buscar** (`/buscar`), **Mis paraderos** (`/guardados`, stored on the device only). Arrivals refresh every 15 s while the tab is visible and keep the last answer on screen, marked, when red.cl stops answering.

**Live map.** Stop and route pages (and the home screen, for nearby stops) show a playful 3D MapLibre map (OpenFreeMap tiles recoloured in `lib/map-style.ts`, tilted camera, pastel 3D buildings, toy buses): the route in its line colour, the stop, your location when the browser already has permission, and the buses with their ETA. red.cl publishes no GPS for buses, only a distance to the stop along the route, so each bus is placed by walking back that distance from the stop along the route path (`lib/position.ts`). That is an estimate and the map says so; if the stop is more than 150 m from the route path, the buses are not drawn at all. Positions glide to the new estimate on each 15 s refresh. The MapLibre worker files are copied into `public/maplibre/` on install and build.

Not built yet: trip planning screens (the `/api/plan` route is ready), push alerts, live bus positions (red.cl does not publish them).

## Backend

`server/red/` is a typed client for red.cl with no UI dependencies:

| File | Job |
|---|---|
| `bootstrap.ts` | gets the short-lived prediction token, catalog version and detoured services from the public stop page; refreshes before expiry |
| `predictions.ts`, `eta.ts` | arrivals at a stop, normalized: services, up to two buses each, plate, distance, ETA as a typed value |
| `routes.ts` | route files: both directions, stops, path, schedules |
| `catalog.ts`, `geo.ts` | local index of all stops (built by the crawler): nearby and text search |
| `geocode.ts`, `plan.ts` | place search, reverse geocoding, trip planning (OpenTripPlanner, with Metro) |
| `http.ts`, `cache.ts` | polite HTTP (per-host spacing, retries, timeouts) and a TTL cache that coalesces requests and serves a stale answer when red.cl is down |
| `service.ts` | the facade the API routes call |

### API

| Route | Returns |
|---|---|
| `GET /api/stops/nearby?lat=&lng=&limit=&radius=` | closest stops from the local catalog |
| `GET /api/stops/search?q=` | stops by code, name or street, plus geocoded places |
| `GET /api/stops/PC187[?service=401]` | live arrivals, with `observedAt`, `ageSeconds`, `stale` |
| `GET /api/services` | all service codes |
| `GET /api/services/210` | route: operator, both directions, stops, path |
| `GET /api/plan?from=lat,lng&to=lat,lng[&busOnly=true&arriveBy=true&date=&time=&max=]` | itineraries with decoded paths and line colours |
| `GET /api/geocode/reverse?lat=&lng=` | nearest address |
| `GET /api/status` | upstream health: catalog version, token expiry, detours |
| `GET /api/health` | liveness |

Errors are JSON: `{ "error": { "code": "UNKNOWN_STOP", "message": "..." } }` with status 400, 404, 502 or 503.

One upstream request per stop per 15 seconds, however many people are watching. Caches are in memory per server instance.

### Scripts

```bash
npm test                 # unit tests, no network
npm run typecheck:server

npm run crawl            # downloads all route files and builds data/catalog/catalog.json
npm run probe            # samples stops and records every response code and ETA wording
```

`crawl` is resumable, waits 1.2 s between requests, identifies itself honestly, and stops after repeated failures. Raw files go to `data/raw/` (ignored by git). The compact catalog in `data/catalog/` is committed so the API works without a crawl; rebuild it when red.cl publishes a new catalog version (`/api/status` shows it).

### Run

```bash
npm install
npm run dev
```

Node 20 or newer. Live at https://dondeviene-matiasberriosos-projects.vercel.app (Vercel project `dondeviene`; the `dondeviene.cl` domains still point at another host). Deployed on Vercel in the `gru1` region (closest to Santiago); `data/catalog/catalog.json` is bundled with the API functions through `outputFileTracingIncludes`.
