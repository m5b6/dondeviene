# red.cl — reverse-engineered API reference

What `https://www.red.cl` (Red Movilidad, Santiago) actually calls behind its pages, as observed on **2026-10-03** by reading the site's own HTML and JavaScript and exercising each endpoint with ordinary read-only `GET` requests.

Status words used below: **observed** means I called it and read the response; **from site JS** means the site's code references it but I did not (or could not) get a good response.

Raw captures live in `docs/red-api/captures/`. Re-run `npm run probe` and `npm run crawl` to refresh them.

## How the site is built

red.cl is a WordPress site with a jQuery front end. Pages are server-rendered PHP; the live data comes from a few small JSON services. There is no public documentation and no API key.

Everything the front end needs is reachable with a plain `GET`. The prediction service sends `Access-Control-Allow-Origin: https://www.red.cl`, so **browsers on other origins cannot call it directly**. That is why this project proxies it from a server.

`robots.txt` is `User-agent: * / Disallow:` (everything allowed).

## Working endpoints

| # | What | Method and URL | Status |
|---|---|---|---|
| 1 | Prediction token, catalog version, detoured services | `GET /planifica-tu-viaje/cuando-llega/` (HTML) | observed |
| 2 | Arrivals at a stop | `GET /predictorPlus/prediccion?t=<jwt>&codsimt=<stop>[&codser=<service>]` | observed |
| 3 | All stop codes | `GET /jsonPO/paraderos_todos.json` | observed |
| 4 | All service codes | `GET /jsonPO/servicios_todos.json` | observed |
| 5 | Route detail (both directions, stops, path, schedules) | `GET /jsonPO/servicio_<code>.json?v=<version>` | observed |
| 6 | Place search | `GET /geocoder/buscar?busqueda=<text>` | observed |
| 7 | Reverse geocode | `GET /geocoder/reverse?latitud=<lat>&longitud=<lon>` | observed |
| 8 | Trip planner (OpenTripPlanner) | `GET https://dtpm.amigocloud.com/api/otp/plan?...` | observed |
| 9 | Map style (OpenMapTiles vector) | `GET https://mapasred.tstgo.cl/styles/redstreets/style.json` | observed |
| 10 | Scheduled itineraries (night and low-frequency services) | `GET /mapas-y-horarios/bus/recorridos-programados/?codser=<code>` (HTML tables) | page exists, not parsed |
| 11 | Metro and Metrotren station pages | `GET /mapas-y-horarios/metro/`, `/metrotren/` (HTML) | page exists, not parsed |

### 1. Bootstrap page and the token

The stop page embeds a short-lived JWT, base64-encoded, in an inline script:

```js
$jwt = 'ZXlKMGVY...';           // base64 of a JWT
consultaParadero($jwt, $codsimt, desvios);
```

The front end does `atob($jwt)` and sends the result as `t`. Every visitor gets one; it is not tied to a session.

- JWT header `{"typ":"JWT","alg":"HS256"}`, payload `{"exp": <unix seconds>}` only. Observed lifetime about **one hour**.
- The same page also defines `const PO_HORA_VERSION = '20261003_2';` (the catalog version, used as a cache-buster `?v=` on the JSON files) and `var desvios = ["385","E04","107c", ...];` (services with a planned detour today).
- Fetching the page with no `codsimt` still returns the token. This project fetches it once, caches it until two minutes before `exp`, and refreshes it if the service answers 500.

### 2. Arrivals: `/predictorPlus/prediccion`

`GET` only. A `POST` returns 404 `Ruta no encontrada.`

| Param | Required | Notes |
|---|---|---|
| `t` | yes | token from #1 |
| `codsimt` | yes | stop code, upper case, `^[A-Z]{2}\d+$` (for example `PC187`) |
| `codser` | no | restrict to one service; case-sensitive, see "Service codes" |

Response (`application/json`):

```json
{
  "fechaprediccion": "2026-10-03",
  "horaprediccion": "12:00",
  "nomett": "PARADA 2 / HOSPITAL METROPOLITANO",
  "paradero": "PC187",
  "respuestaParadero": "09 - Entrega la frecuencia del servicio",
  "urlpublicidad": "...", "urlLinkPublicidad": "...",
  "x": "-33.4191229", "y": "-70.6058199",
  "servicios": { "item": [ { ...service... } ] }
}
```

`x` is latitude and `y` is longitude (strings). `fechaprediccion` and `horaprediccion` are Santiago local time. `nomett` is `null` for an unknown stop (the site checks this).

Each service item:

| Field | Meaning |
|---|---|
| `servicio` | service code (`401`, `J13c`) |
| `codigorespuesta` | `"00"` two buses, `"01"` one bus, `"10"` no buses. From site JS only: `"9"`, `"11"` (out of service) |
| `respuestaServicio` | human text matching the code, for example `Información de tiempos de los próximos 2 buses` or `No hay buses que se dirijan al paradero` |
| `horaprediccionbus1`, `horaprediccionbus2` | ETA text, see below; empty string when absent |
| `distanciabus1`, `distanciabus2` | metres to the stop, as strings; empty when absent |
| `ppubus1`, `ppubus2` | licence plate of each bus; empty when absent |
| `destino`, `sentido`, `color`, `itinerario`, `codigo` | destination name, direction (`"1"` or `"2"`), hex colour, has a scheduled timetable, business-unit code (`U14`). **These five are missing entirely on some items** (seen on service `505`) |

**ETA text templates** (from 60 sampled stops, 179 service items). Digits vary:

| Text | Meaning |
|---|---|
| `Llegando` | arriving now |
| `En menos de N min` | under N minutes |
| `Entre A Y B min` | between A and B minutes |
| `Mas de N min` | more than N minutes (no accent on "Mas") |
| (empty) | no bus |

There is no numeric ETA field; the text is the only source. The parser matches these four templates exactly and keeps any other text as `unknown` with the raw string, never guessing a number.

**Colours.** `color` is empty on about a third of items. Non-empty values seen: `#cf152d`, `#CF152D`, `#ED1C24` (reds), `#F7941D` (orange), `#00A77E` (green), `#0093B3` (teal), `#00A1E4` and `#0077bb` (blues), `#FFD400` (yellow). The same colour appears in different letter cases, so normalize to lower case. They follow the operator ("negocio"), not the individual service.

**Errors** (plain text bodies, not JSON):

| Situation | Status | Body |
|---|---|---|
| Missing `t` | 400 | `Falta el parámetro 't'.` |
| Missing `codsimt` | 400 | `Falta el parámetro 'codsimt'.` |
| Lower-case, malformed or unknown stop code (`pc187`, `ZZ99999`, `PA99999`) | 400 | `Formato incorrecto para el parámetro 'codsimt'.` |
| Invalid or expired token | 500 | `Token inválido` |

An unknown but well-formed code (`PA99999`) is indistinguishable from a malformed one.

The server identifies as `BaseHTTP/0.6 Python/3.12.3` behind Apache. Typical latency 40 to 550 ms.

### 3 and 4. Code lists

`paraderos_todos.json` is a flat array of stop codes (12,122 on 2026-10-03, 112 KB). `servicios_todos.json` is a flat array of service codes (417, 3 KB). **Stops come without coordinates or names.** Those come from the route files (#5) or from a prediction (#2, which returns `x`, `y` and `nomett`).

All 12,122 stop codes match `^[A-Z]{2}\d+$`; prefixes seen are PA to PJ and one PZ. All 417 service codes match `^[0-9A-Z]+[a-z]?$`.

### 5. Route files: `/jsonPO/servicio_<code>.json`

```json
{
  "negocio": { "id": 19, "nombre": "Consorcio Conecta", "color": "", "url": "" },
  "ida":     { "id": 1503, "destino": "Puente Alto", "itinerario": true,
               "horarios": [ { "tipoDia": "Lunes a Viernes", "inicio": "00:00", "fin": "23:59" } ],
               "paraderos": [ { "id": 10114, "cod": "PI340", "name": "Parada 3 - Metro San Alberto Hurtado",
                                "pos": [-33.45376, -70.6893659], "comuna": "ESTACIÓN CENTRAL",
                                "eje": "Alameda", "stop": { "stopId": 1280344 }, "type": 0, ... } ],
               "path": [ [-33.463178, -70.695377], ... ] },
  "regreso": { ... }
}
```

- `pos` and `path` points are `[latitude, longitude]`.
- A service that runs one way has `regreso: null` (or the reverse). The site's code handles both.
- `?v=<PO_HORA_VERSION>` is only a cache-buster; the file also loads without it. Responses carry `Cache-Control: max-age=31536000` and an `ETag`, so they are meant to be cached hard and re-fetched when the version changes.
- Size is 30 to 110 KB per file.
- Day types seen: `Lunes a Viernes`, `Sábado`, `Domingo y Festivos`.

**File names are case-sensitive.** The site uppercases the code and then lower-cases the last character if it is a letter: `J13c` works, `J13C` returns a 404 HTML page.

### 6 and 7. Geocoder

`/geocoder/buscar?busqueda=Providencia%20Los%20Leones` returns `{ "t": "mapas-red", "lugares": [ { "detalle": { "nombre", "calle", "ciudad", "distrito", "estado", "pais", "modo_transporte" }, "coord": { "lat", "lon" } } ] }`. `modo_transporte` is present for Metro stations (`"metro"`). Results include streets, landmarks and stations. The site only searches from 3 characters.

`/geocoder/reverse?latitud=-33.4372&longitud=-70.6506` returns `{ "t", "nombre", "lat": "<string>", "lon": "<string>" }`. Note the parameter names are Spanish and the returned coordinates are strings.

### 8. Trip planner

A standard OpenTripPlanner 1.x on a vendor host (AmigoCloud) that serves DTPM, the transport authority. The site's "Cómo llegar" page calls:

```
GET https://dtpm.amigocloud.com/api/otp/plan
  ?date=10-03-2026            MM-DD-YYYY
  &time=12:30                 HH:mm, Santiago time
  &mode=WALK,TRANSIT          or WALK,BUS for "solo bus"
  &fromPlace=-33.4372,-70.6506
  &toPlace=-33.4489,-70.6693
  &numItineraries=20          the site asks for 20 and shows 5
  &arriveBy=false
```

The response is OTP's usual `plan.itineraries[].legs[]` with `mode` (`WALK`, `BUS`, `SUBWAY`, probably `RAIL`), `route`, `routeColor`, `routeTextColor`, `headsign`, `agencyName`, `from`/`to` with `stopCode`, and `legGeometry.points` as a Google encoded polyline (precision 5). Metro legs carry the real line colours (L5 is `00965E`). Bus legs use red.cl service codes as `route`. Times are epoch milliseconds. `realTime` was `false` on every leg observed.

I did not probe other OTP endpoints; only `plan`, which the site itself uses, and the router root (`/api/otp/`), which returns the router polygon.

### 9. Map style

`https://mapasred.tstgo.cl/styles/redstreets/style.json` is a Mapbox GL style (116 layers) with one vector source `https://mapasred.tstgo.cl/data/v3.json` (OpenMapTiles schema), sprites at `/styles/redstreets/sprite` and glyphs at `/fonts/{fontstack}/{range}.pbf`. It loads in MapLibre GL without any key. The site additionally sets a Mapbox access token in `mapas/iniciar-mapa.js`; it is not needed for this style and this project does not use it.

## Operators and colours

Every route file names its operator (`negocio`), and the colours red.cl shows are the colours of the physical buses of that operator. Counted over all 417 route files on 2026-10-03:

| Operator id | Name | Colour | Services |
|---|---|---|---|
| 1 | Inversiones Alsacia S.A. | `#00a1e4` | 11 |
| 2 | SU-BUS Chile S.A. | `#0077bb` | 21 |
| 3 | Buses Vule S.A. | `#00a77e` | 68 |
| 4 | Express de Santiago Uno S.A. | `#f7941d` | 32 |
| 5 | Buses Metropolitana S.A. | `#0093b3` | 44 |
| 6 | Redbus Urbano S.A. | `#ed1c24` | 8 |
| 7 | Servicio de Transportes de Personas | `#ffd400` | 12 |
| 8 to 13 | Alfa US1, Omega US2, STU US3, RBU US4, STU US5, RBU US6 | `#cf152d` (all six) | 133 |
| 14, 15 | Voy Santiago SpA | none | 27 |
| 16 | Gran America | none | 20 |
| 18, 19 | Consorcio Conecta | none | 40 |
| (missing) | service `I39` has no `negocio` | none | 1 |

So red is the colour of about a third of the network, and about a fifth of services (those of Voy Santiago, Gran America and Consorcio Conecta) have no colour at all. 64 services run in one direction only.

The prediction's `codigo` looks like `U<operator id>` (`U14` is Voy Santiago, `U4` is Express de Santiago Uno). One discrepancy is unresolved: service `405` is listed under Voy Santiago (id 14) in its route file, but a prediction for it carried `codigo: "U4"` and `color: "#F7941D"`. Do not rely on either field alone to name the operator.

## Not reachable (and what that tells us)

| Endpoint | Result on 2026-10-03 |
|---|---|
| `GET /predictor/prediccion?t=...&codsimt=...` | **timeout (30 s).** This is what the abandoned project used; it has been replaced by `/predictorPlus/`. |
| `GET /restservice/rest/getpuntoparada/?lat=&lon=&bip=1` | **502 Proxy Error after 60 s.** The site's own "Cerca de mí" page still calls it, so that feature is broken on red.cl right now. Nearby search is therefore built from the route files instead. |
| `GET /restservice_v2/rest/...` | 404 `Ruta no encontrada.` The base path is defined in `functions.js` but nothing uses it any more. |
| `GET /wp-json/wp/v2/posts`, `/categories` | 401, blocked by iThemes Security. This is an explicit access restriction and was not worked around. The WordPress route index is public but only lists CMS plugin routes. |
| Vehicle positions | **No endpoint found.** Buses appear only as plate and distance in a prediction. |
| The official mobile app's API | not examined |

## Rules this project follows

- **Read-only `GET` only.** Nothing that writes, logs in, or touches an authenticated area.
- **Honest `User-Agent`**: `dondeviene/0.1 (+https://github.com/m5b6/dondeviene; ...)`. red.cl and the planner accept it.
- **Politeness**: at least 250 ms between requests to a host at runtime (1.2 s in the crawler), retries only for 502, 503 and 504 with 1 s and 2 s back-off, and a circuit breaker in the crawler.
- **One upstream request per stop per 15 seconds** no matter how many people watch it (shared in-memory cache with request coalescing). If red.cl fails, the last answer is served marked `stale` for up to two more minutes.
- **No token tricks.** The token is obtained the way a browser obtains it, from the public page, and refreshed on its own expiry.
- **Respect restrictions.** Where the site says no (the WordPress API), the answer is no.

If this is ever offered to DTPM or red.cl, the useful asks are: an official arrivals API with numeric ETAs, vehicle positions, and CORS for registered origins.

## Open questions

- `codigorespuesta` values `9` and `11` come from the site's JavaScript and were not seen in the 60-stop sample. Re-run `npm run probe` at night and on Sundays to catch more.
- Whether the token can be requested any other way than scraping the page.
- Rate limits: none were hit (no 429 and no `Retry-After`), but none are documented.
- Scheduled itineraries (`recorridos-programados`) and Metro/Metrotren station data are HTML only.
