# Dónde viene — DESIGN.md

Real-time bus arrivals for Santiago, drawn like station signage (NYC, Tokyo, Santiago Metro). Mobile first, desktop second.

Visual spec: https://claude.ai/artifact/PTXC3B2PCDwNcnCqbVRGxm

## Principles

1. **One glance, one answer.** The next bus, in minutes, is the largest type on every screen.
2. **Signage, not software.** Flat colour fields, hard edges, 2 px rules. No shadows, gradients, glass, illustration.
3. **Helvetica discipline.** One grotesque family, three weights, flush left, tabular numerals.
4. **Colour is the line.** Colour belongs to services. Everything else is ink and paper.
5. **Honest about doubt.** Predictions are estimates. Show their age, show when red.cl has nothing, never invent a number.
6. **Built for the kerb.** Sunlight, one thumb, bad signal. High contrast, 56 px targets, last answer stays on screen.

## Tokens

```css
:root {
  --ink: #121212;
  --paper: #F4F3EE;
  --paper-dark: #D9D7CF;
  --mute: #6B6A65;
  --body: #3A3935;
  --signal: #FFC20E;

  --font: 'Helvetica Neue', 'Archivo', Helvetica, sans-serif;
  --space: 8px;
  --rule: 2px;
  --radius-sm: 4px;
  --radius-plate: 8px;
  --target: 56px;
}
```

No dark theme in v1. If added later: ink ground `#121212`, paper text, same line colours.

## Type

Helvetica Neue first. Archivo (Google Fonts, variable, `wdth` 100) is the free stand-in; load it for Android and Windows. Weights 500, 700, 800 only. Replace the current `Barlow_Condensed` in `app/fonts.ts`.

| Role | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| Display | 120 / 104 | 800 | −4% | Minutes on a hero card (desktop) |
| Minutes | 52 / 52 | 800 | −3% | Minutes in an arrival row |
| Sign | 44 / 46 | 800 | −2% | Stop name on desktop |
| Stop name | 30 / 32 | 800 | −2% | Stop header on mobile |
| Title | 20 / 24 | 700 | 0 | Destination |
| Body | 17 / 24 | 500 | 0 | Sentences |
| Label | 13 / 16 | 700 | +8%, uppercase | Metadata, section labels |

Rules: flush left, ragged right. Only roundels are centred. `font-variant-numeric: tabular-nums` on every number that can change. Title Case for stop names (as on station signs). Uppercase only for labels under 32 characters.

## Line colours

Twelve lines. Text colour is fixed per swatch and holds 4.5:1.

| Name | Hex | Text |
|---|---|---|
| Tomate | `#D5281B` | white |
| Mandarina | `#F26B0F` | ink |
| Girasol | `#FFC20E` | ink |
| Pistacho | `#8DC63F` | ink |
| Pino | `#00843D` | white |
| Laguna | `#00A19A` | ink |
| Cielo | `#4FB0E5` | ink |
| Océano | `#0057B8` | white |
| Uva | `#6A2C91` | white |
| Frambuesa | `#C2185B` | white |
| Tierra | `#7A4B2A` | white |
| Grafito | `#2B2B2B` | white |

red.cl sends one hex per service (`color` field). Snap it to the nearest of the twelve in CIELAB and keep the original in the data. Never render the raw value.

Yellow (`--signal`) is also the "Llegando" chip and the "you are here" marker. It is the only status colour. Status is always carried by a label too, never by colour alone.

## Plates

- **Roundel**: circle, up to 3 characters (`210`, `B21`). Sizes 24, 32, 40, 48, 52, 76.
- **Plate**: 8 px radius, `min-width` 64, 10 px side padding, for 4+ characters (`506c`, `C08e`).
- **Stop plate**: ink rectangle, white 800 text, no radius. Holds the stop code (`PC187`). Inverts to paper on an ink header.
- **Outline roundel** (2 px `--mute` border, `--mute` text) for services with no current prediction.

## Components

**Arrival row.** Roundel or plate · destination (Title) with a 13 px muted sub line (distance, "luego N min") · minutes right-aligned. 1 px `--paper-dark` rule between rows; the first row of a list takes a 2 px ink rule below it.

Four states, from what red.cl actually returns:

| State | Right side | Sub line |
|---|---|---|
| Exact | `4` + `min` | `1,2 km · luego 14 min` |
| Llegando | yellow chip, label `LLEGANDO` | `120 m` |
| Rango | `5–8` + `min` | `Rango de red.cl · 2,8 km` |
| Sin servicio | `—` in `--mute`, outline roundel | `Fuera de horario de operación` |

**Freshness bar.** 4 px track, ink fill shrinking toward the next refresh, with `Actualizado hace 8 s` under it. Stale (over 60 s or offline): dashed `--mute` track and `Sin conexión · último dato hace 2 min`. The last good data stays visible.

**Actions.** 56 px high. Primary: ink fill, paper text, 4 px radius, arrow right. Secondary: 2 px ink border. Filter chips: fully round, ink fill when selected, 2 px border when not.

**Strip map (recorrido).** The signature element. A 8 px vertical bar in the line colour. Stops are 24 px paper dots with a 4 px ink ring. Buses are 28 px ink squares with a bus glyph on the bar, labelled with minutes. Your stop is a 36 px yellow square with a 4 px ink ring and an ink `TÚ ESTÁS AQUÍ` tag. The terminal is a solid ink square labelled `TERMINAL`.

**Motion.** Digits change like a split-flap, 160 ms, no easing flourish. Off under `prefers-reduced-motion`.

## Layout

- Grid 8 px. Page gutter 20 px on mobile, 48 px on desktop.
- Radii: 0, 4, 8, round. Nothing else.
- No shadows. Depth comes from ink bands and 2 px rules.
- Targets 56 px minimum. Roundels inside rows may be smaller because the whole row is the target.

### Mobile (390 px, primary)

Screens: **Cerca de ti** (ink header with the neighbourhood name, nearest stop expanded with its next three services, the rest condensed), **Paradero** (ink header with stop plate, name, direction, freshness; arrival rows; pinned action bar), **Recorrido** (header in the line colour, strip map, pinned action).

Bottom bar, 72 px, three tabs: Cerca, Mis paraderos, Buscar. The active tab has a 4 px ink top bar. No status-bar mock, no floating buttons.

### Desktop (1360 px)

Three columns: 300 px ink rail (wordmark, search, saved stops), fluid departures board (stop header, table with Línea / Destino / Próximo / Luego / Distancia, 76 px rows), 380 px strip map for the selected service, separated by a 2 px ink rule. Below 1024 px collapse to the mobile screens.

## Copy

- UI in Spanish, Chilean register, short. Code in English.
- Say **paradero**, **recorrido**, **servicio**, **bus**. Say "Llegando", never "Arribando".
- Units: `4 min`, `1,2 km`, `120 m` (decimal comma).
- Errors say what is wrong and what is still on screen: `Sin conexión · último dato hace 2 min`. No exclamation marks, no apologies.

## Accessibility

- Text 4.5:1 minimum; large text 3:1. Line colours are never the only carrier: every plate has its number.
- Real `<button>` and `<a>`; visible 2 px ink focus ring with 2 px offset.
- Minutes announced as text (`Servicio 210, en 4 minutos`), not as digits per character; the split-flap is decorative.
- Respect `prefers-reduced-motion` and dynamic type up to 130%.

## What changes in the existing repo

- `app/fonts.ts`: drop Barlow Condensed, load Archivo, set `--font`.
- `tailwind.config.ts` and `app/globals.css`: replace the theme with the tokens above; delete unused shadcn components (`components/ui/*` is mostly unused).
- `components/BusCard.tsx`, `ParaderoList.tsx`: rebuild as Arrival row and Stop plate.
- `components/map.tsx`, `ParaderoMap.tsx`: keep the map as a secondary view only; the strip map is the main spatial element.
- `lib/fetch-paraderos.ts`: see below.

## Data notes (red.cl)

Full reference: `docs/RED_API.md`. What matters for design:

- Predictions come from `/predictorPlus/prediccion` with a token the stop page embeds (about an hour of life). The old `/predictor/` endpoint the first version used is dead, which is why that version stopped working.
- ETA is **text only**, in four fixed templates, so the four arrival states above are exactly what red.cl can say: `Llegando`, `En menos de N min` (show `<N`), `Entre A Y B min` (show `A–B`), `Mas de N min` (show `>N`). Empty means no bus. Anything else is shown verbatim, never converted to a number.
- A service has up to two buses, each with a plate and a distance in metres. Show the first bus large and the second as `luego …`.
- `color` from red.cl is the colour of the physical bus, set per operator, not per service. About a third of the network is the same red and about a fifth has no colour. Keep the operator colour on the plate when it exists, because it matches the bus people are looking for, and snap it to the nearest palette entry. Services without one take a palette colour from a stable hash of the service code, so a service keeps its colour everywhere.
- red.cl's own eight bus colours are mapped to the palette exactly, so operators stay distinguishable (plain nearest-colour snapping merged three blues into one): `#cf152d`, `#ED1C24` to Tomate; `#F7941D` to Mandarina; `#FFD400` to Girasol; `#00A77E` to Pino; `#0093B3` to Laguna; `#00A1E4` to Cielo; `#0077bb` to Océano.
- Metro legs from the trip planner carry the real Metro line colours; show them as-is inside a journey, since they are the lines people already know.
- `itinerario` (has a published timetable) is true on ordinary services such as 210 and 401 too, so it is not a low-frequency marker. Treat it only as "a timetable page exists".
- Stops have no street-level photo or icon data; the stop plate is built from the code and name only.
- Nearby stops are computed on our side from the route files, because red.cl's own nearby endpoint is down.
