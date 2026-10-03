import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BootstrapProvider } from '../server/red/bootstrap';
import { redUrls } from '../server/red/config';
import { HttpClient } from '../server/red/http';

const SAMPLE_SIZE = Number(process.env.PROBE_SAMPLE ?? 60);
const GAP_MS = Number(process.env.PROBE_GAP_MS ?? 1200);

interface RawItem {
  codigorespuesta?: string;
  respuestaServicio?: string;
  horaprediccionbus1?: string;
  horaprediccionbus2?: string;
  color?: string;
  sentido?: string;
  codigo?: string;
  servicio?: string;
  distanciabus1?: string;
  distanciabus2?: string;
  ppubus1?: string;
  ppubus2?: string;
  itinerario?: boolean;
}

const template = (text: string | undefined) => (text ?? '').replace(/\d+/g, 'N');

const tally = (map: Map<string, { count: number; example: string }>, key: string, example: string) => {
  const entry = map.get(key) ?? { count: 0, example };
  entry.count += 1;
  map.set(key, entry);
};

const seededShuffle = <T>(items: T[], seed: number): T[] => {
  const copy = [...items];
  let state = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const main = async () => {
  const http = new HttpClient({ minGapMs: GAP_MS });
  const bootstrap = new BootstrapProvider(http);
  const stops = await http.getJson<string[]>(redUrls.allStops);
  const sample = seededShuffle(stops, 20261003).slice(0, SAMPLE_SIZE);

  const responseCodes = new Map<string, { count: number; example: string }>();
  const serviceMessages = new Map<string, { count: number; example: string }>();
  const stopMessages = new Map<string, { count: number; example: string }>();
  const etaTemplates = new Map<string, { count: number; example: string }>();
  const colors = new Map<string, { count: number; example: string }>();
  const directions = new Map<string, { count: number; example: string }>();
  const itemKeySets = new Map<string, { count: number; example: string }>();
  const topLevelKeys = new Map<string, { count: number; example: string }>();
  let failures = 0;
  let stopsWithNullServices = 0;
  let itemAsObject = 0;

  for (const code of sample) {
    const { jwt } = await bootstrap.get();
    const response = await http.get(`${redUrls.prediction}?t=${encodeURIComponent(jwt)}&codsimt=${code}`);
    if (!response.ok) {
      failures += 1;
      tally(stopMessages, `HTTP ${response.status}`, `${code}: ${response.body.slice(0, 80)}`);
      continue;
    }
    const body = JSON.parse(response.body) as Record<string, unknown> & {
      servicios?: { item?: RawItem[] | RawItem } | null;
      respuestaParadero?: string;
    };
    tally(topLevelKeys, Object.keys(body).sort().join(','), code);
    tally(stopMessages, body.respuestaParadero ?? '(none)', code);
    if (!body.servicios) {
      stopsWithNullServices += 1;
      continue;
    }
    const rawItems = body.servicios.item;
    if (rawItems && !Array.isArray(rawItems)) itemAsObject += 1;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    for (const item of items) {
      const where = `${code}/${item.servicio}`;
      tally(responseCodes, JSON.stringify(item.codigorespuesta), where);
      tally(serviceMessages, `${item.codigorespuesta} | ${item.respuestaServicio ?? ''}`, where);
      tally(etaTemplates, `bus1: ${template(item.horaprediccionbus1)}`, `${item.horaprediccionbus1} @ ${where}`);
      tally(etaTemplates, `bus2: ${template(item.horaprediccionbus2)}`, `${item.horaprediccionbus2} @ ${where}`);
      tally(colors, item.color ?? '(missing)', where);
      tally(directions, String(item.sentido), where);
      tally(itemKeySets, Object.keys(item).sort().join(','), where);
    }
  }

  const dump = (map: Map<string, { count: number; example: string }>) =>
    Object.fromEntries([...map.entries()].sort((a, b) => b[1].count - a[1].count));

  const report = {
    probedAt: new Date().toISOString(),
    sampled: sample.length,
    failures,
    stopsWithNullServices,
    itemAsObject,
    topLevelKeys: dump(topLevelKeys),
    stopMessages: dump(stopMessages),
    responseCodes: dump(responseCodes),
    serviceMessages: dump(serviceMessages),
    etaTemplates: dump(etaTemplates),
    colors: dump(colors),
    directions: dump(directions),
    itemKeySets: dump(itemKeySets),
  };

  const outDir = path.join(process.cwd(), 'docs/red-api/captures');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'variants.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
