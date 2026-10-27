// Builds src/data/generic-foods.json from the USDA SR Legacy CSV download (public domain).
//   1. Download FoodData_Central_sr_legacy_food_csv_2018-04.zip from https://fdc.nal.usda.gov/download-datasets/
//   2. Unzip it into data-raw/ (gitignored)
//   3. npm run foods -- data-raw/sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { NUTRIENTS, NUTRIENT_KEYS, type NutrientKey } from '../src/domain/nutrients.ts';
import { CURATED } from './foods-curated.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(process.argv[2] ?? join(root, 'data-raw/sr-legacy/FoodData_Central_sr_legacy_food_csv_2018-04'));
if (!existsSync(join(dir, 'food.csv'))) {
  console.error(`food.csv not found in ${dir}`);
  process.exit(1);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const readCsv = (file: string) =>
  readFileSync(join(dir, file), 'utf8')
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map(parseCsvLine);

async function streamCsv(file: string, onRow: (r: string[]) => void) {
  const rl = createInterface({ input: createReadStream(join(dir, file)) });
  let first = true;
  for await (const line of rl) {
    if (first) {
      first = false;
      continue;
    }
    if (line) onRow(parseCsvLine(line));
  }
}

// ── resolve curated names to fdc ids ──
const byDesc = new Map<string, string>();
for (const [id, , desc] of readCsv('food.csv')) byDesc.set(desc!.toLowerCase(), id!);

const UNIT_WORDS = new Set(['cup', 'tbsp', 'tsp', 'tablespoon', 'medium', 'large', 'slice', 'fruit', 'roll', 'half', 'ear', 'stalk', 'clove', 'spear', 'pepper', 'glass', 'shot', 'bar', 'square', 'date', 'kiwifruit']);

interface Pick {
  id: string;
  name: string;
  aliases: string;
  pref?: string;
}
const picks: Pick[] = [];
const missing: string[] = [];
const seen = new Set<string>();
const descs = [...byDesc.keys()];
// exact description first; else the shortest description starting with the match text
const resolve1 = (match: string) => {
  const m = match.toLowerCase();
  const exact = byDesc.get(m);
  if (exact) return exact;
  const hit = descs.filter((d) => d.startsWith(m)).sort((a, b) => a.length - b.length)[0];
  return hit ? byDesc.get(hit) : undefined;
};
for (const [name, match, aliases = '', pref] of CURATED) {
  const id = resolve1(match);
  if (!id) {
    missing.push(`${name}  ←  ${match}`);
    continue;
  }
  if (seen.has(name)) continue;
  seen.add(name);
  const aliasIsUnit = !pref && UNIT_WORDS.has(aliases);
  picks.push({ id, name, aliases: aliasIsUnit ? '' : aliases, pref: aliasIsUnit ? aliases : pref });
}
const ids = new Set(picks.map((p) => p.id));

// ── nutrients ──
const idToKey = new Map<number, NutrientKey>();
for (const k of NUTRIENT_KEYS) for (const n of NUTRIENTS[k].usda ?? []) if (!idToKey.has(n)) idToKey.set(n, k);
const OMEGA3 = { ala: [1404, 1270], epa: 1278, dha: 1272, dpa: 1280 };

const raw = new Map<string, Map<number, number>>();
await streamCsv('food_nutrient.csv', (r) => {
  const fdc = r[1]!;
  if (!ids.has(fdc)) return;
  const nid = Number(r[2]);
  const amt = Number(r[3]);
  if (!Number.isFinite(amt)) return;
  let m = raw.get(fdc);
  if (!m) raw.set(fdc, (m = new Map()));
  m.set(nid, amt);
});

const r2 = (x: number) => Math.round(x * 100) / 100;

function nutrientsFor(m: Map<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of NUTRIENT_KEYS) {
    for (const nid of NUTRIENTS[k].usda ?? []) {
      const v = m.get(nid);
      if (v !== undefined) {
        out[k] = r2(v);
        break;
      }
    }
  }
  if (out.vitD === undefined && m.has(1110)) out.vitD = r2(m.get(1110)! / 40);
  const ala = m.get(OMEGA3.ala[0]!) ?? m.get(OMEGA3.ala[1]!);
  const o3 = [ala, m.get(OMEGA3.epa), m.get(OMEGA3.dha), m.get(OMEGA3.dpa)].filter((x): x is number => x !== undefined);
  if (o3.length) out.omega3 = r2(o3.reduce((a, b) => a + b, 0));
  // SR Legacy predates added-sugar labeling; leave it unknown rather than guess
  return out;
}

// ── portions ──
const units = new Map(readCsv('measure_unit.csv').map(([id, name]) => [id!, name!]));
const portions = new Map<string, { label: string; grams: number; seq: number }[]>();
await streamCsv('food_portion.csv', (r) => {
  const fdc = r[1]!;
  if (!ids.has(fdc)) return;
  const amount = Number(r[3]);
  const unit = units.get(r[4]!) ?? 'undetermined';
  const modifier = (r[6] ?? '').trim();
  const grams = Number(r[7]);
  if (!(grams > 0)) return;
  let label = unit === 'undetermined' ? modifier : `${unit} ${modifier}`.trim();
  if (/^NLEA serving$/i.test(label)) label = 'serving';
  label = label.replace(/\s+/g, ' ').replace(/""/g, '"');
  const amt = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const amtText = amt === 1 ? '1' : String(Math.round(amt * 100) / 100);
  let list = portions.get(fdc);
  if (!list) portions.set(fdc, (list = []));
  if (label) list.push({ label: `${amtText} ${label}`.slice(0, 70), grams: r2(grams), seq: Number(r[2]) });
});

function orderPortions(list: { label: string; grams: number; seq: number }[], pref?: string) {
  const sorted = [...list].sort((a, b) => a.seq - b.seq);
  const want = [pref, 'medium', 'serving', 'large'].filter(Boolean) as string[];
  for (const w of want) {
    const i = sorted.findIndex((p) => p.label.toLowerCase().includes(w.toLowerCase()));
    if (i > 0) {
      const [p] = sorted.splice(i, 1);
      sorted.unshift(p!);
      break;
    }
    if (i === 0) break;
  }
  // drop exact duplicates
  const out: { label: string; grams: number }[] = [];
  for (const p of sorted) if (!out.some((o) => o.label === p.label)) out.push({ label: p.label, grams: p.grams });
  return out.slice(0, 8);
}

// ── write ──
interface GenericFood {
  id: string;
  n: string;
  a?: string;
  p: [string, number][];
  v: Record<string, number>;
}
const foods: GenericFood[] = [];
for (const p of picks) {
  const m = raw.get(p.id);
  if (!m) continue;
  const v = nutrientsFor(m);
  if (v.kcal === undefined) {
    missing.push(`${p.name}: no energy value`);
    continue;
  }
  const g: GenericFood = { id: `usda:${p.id}`, n: p.name, p: orderPortions(portions.get(p.id) ?? [], p.pref).map((x) => [x.label, x.grams]), v };
  if (p.aliases) g.a = p.aliases;
  foods.push(g);
}

const outFile = join(root, 'src/data/generic-foods.json');
writeFileSync(outFile, JSON.stringify(foods));
console.log(`wrote ${foods.length} foods → ${outFile} (${Math.round(JSON.stringify(foods).length / 1024)} KB)`);
if (missing.length) {
  console.log(`\n${missing.length} not matched:`);
  for (const m of missing) console.log(`  ${m}`);
}
