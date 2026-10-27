// Open Food Facts client. Barcode lookups use the v2 product API; text search uses the
// classic cgi/search.pl endpoint (the newer search service does not send CORS headers).
// OFF asks clients to stay under 15 product reads and 10 searches per minute.

import type { Food } from '@/domain/food';
import { gramsToUnit, NUTRIENTS, NUTRIENT_KEYS, type Nutrients } from '@/domain/nutrients';

const HOST = 'https://world.openfoodfacts.org';
const APP_ID = 'GoldGains/1.0 (https://github.com/ethan-goldstein/GoldGains)';
const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'generic_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutrition_data_per',
  'nutriments',
  'image_front_small_url',
  'quantity',
].join(',');

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  nutrition_data_per?: string;
  nutriments?: Record<string, number | string | undefined>;
  image_front_small_url?: string;
}

export class OffError extends Error {
  constructor(
    message: string,
    readonly kind: 'offline' | 'rate' | 'network' | 'disabled',
  ) {
    super(message);
  }
}

// ── throttling ──────────────────────────────────────────────────────────────

class Bucket {
  private stamps: number[] = [];
  constructor(private readonly perMinute: number) {}
  take(): boolean {
    const now = Date.now();
    this.stamps = this.stamps.filter((t) => now - t < 60_000);
    if (this.stamps.length >= this.perMinute) return false;
    this.stamps.push(now);
    return true;
  }
}

const productBucket = new Bucket(14);
const searchBucket = new Bucket(9);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function offFetch(url: string, bucket: Bucket): Promise<Response> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OffError('You’re offline.', 'offline');
  if (!bucket.take()) throw new OffError('Slow down a sec — Open Food Facts limits lookups per minute.', 'rate');
  const base: RequestInit = { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' };
  // X-User-Agent identifies the app (browsers can't set User-Agent); OFF's CORS policy allows it.
  // OFF's servers sometimes answer 503 without CORS headers, which surfaces as a network error,
  // so retry twice with a short backoff before giving up.
  const delays = [1200, 2500];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fetch(url, { ...base, headers: { 'X-User-Agent': APP_ID } });
    } catch {
      if (attempt < delays.length) await wait(delays[attempt]!);
    }
  }
  throw new OffError('Open Food Facts didn’t answer. Try again in a moment — barcode scans and everyday foods still work.', 'network');
}

/** Look up a GTIN. Returns null when OFF doesn't know the product (it answers 404). */
export async function lookupBarcode(gtin: string): Promise<Food | null> {
  const res = await offFetch(`${HOST}/api/v2/product/${encodeURIComponent(gtin)}.json?fields=${FIELDS}`, productBucket);
  if (res.status === 404) return null;
  if (res.status === 429) throw new OffError('Open Food Facts is busy. Try again in a minute.', 'rate');
  if (!res.ok) throw new OffError('Open Food Facts had a problem. Try again.', 'network');
  const json = (await res.json()) as { status?: number; product?: OffProduct };
  if (json.status !== 1 || !json.product) return null;
  return productToFood(json.product, gtin);
}

export async function searchOff(q: string): Promise<Food[]> {
  const params = new URLSearchParams({
    search_terms: q.slice(0, 120),
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '30',
    fields: FIELDS,
    sort_by: 'unique_scans_n',
  });
  const res = await offFetch(`${HOST}/cgi/search.pl?${params}`, searchBucket);
  if (res.status === 429) throw new OffError('Open Food Facts is busy. Try again in a minute.', 'rate');
  if (!res.ok) throw new OffError('Open Food Facts search had a problem.', 'network');
  const json = (await res.json()) as { products?: OffProduct[] };
  return (json.products ?? []).map((p) => productToFood(p)).filter((f): f is Food => f !== null);
}

// ── mapping ─────────────────────────────────────────────────────────────────

const num = (x: unknown): number | undefined => {
  const n = typeof x === 'string' ? Number(x.replace(',', '.')) : typeof x === 'number' ? x : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** nutrients per 100 g/ml in our units */
export function per100(nm: Record<string, unknown>, suffix: '_100g' | '_serving'): Nutrients {
  const out: Nutrients = {};
  for (const k of NUTRIENT_KEYS) {
    const def = NUTRIENTS[k];
    if (!def.off) continue;
    for (const key of def.off) {
      const v = num(nm[`${key}${suffix}`]);
      if (v === undefined) continue;
      out[k] = r3(def.unit === 'kcal' ? v : v * gramsToUnit(def.unit));
      break;
    }
  }
  if (out.kcal === undefined) {
    // energy without -kcal is kJ
    const kj = num(nm[`energy-kj${suffix}`]) ?? num(nm[`energy${suffix}`]);
    if (kj !== undefined) out.kcal = r3(kj / 4.184);
  }
  return out;
}

function cleanName(p: OffProduct): string | undefined {
  const n = (p.product_name_en || p.product_name || p.generic_name || '').trim();
  return n ? n.slice(0, 120) : undefined;
}

function cleanBrand(p: OffProduct): string | undefined {
  const b = (p.brands || '').split(',')[0]?.trim();
  return b ? b.slice(0, 60) : undefined;
}

/** Parse OFF's serving_size text, e.g. "2/3 cup (55 g)" → { qty: 0.667, unit: 'cup' } */
export function parseServingText(text: string | undefined): { qty: number; unit: string } | undefined {
  if (!text) return undefined;
  const head = text.split('(')[0]!.trim();
  const m = head.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)$/);
  if (!m) return head ? { qty: 1, unit: head.slice(0, 40) } : undefined;
  const raw = m[1]!;
  let qty: number;
  if (raw.includes('/')) {
    const parts = raw.split(/\s+/);
    const frac = parts.at(-1)!.split('/').map(Number);
    qty = (parts.length > 1 ? Number(parts[0]) : 0) + frac[0]! / frac[1]!;
  } else qty = Number(raw);
  const unit = (m[2] || 'serving').trim().slice(0, 40);
  if (!Number.isFinite(qty) || qty <= 0) return undefined;
  return { qty, unit };
}

export function productToFood(p: OffProduct, gtin?: string): Food | null {
  const name = cleanName(p);
  const nm = p.nutriments ?? {};
  const base100 = per100(nm, '_100g');
  const baseServ = per100(nm, '_serving');
  const hasAny = Object.keys(base100).length > 0 || Object.keys(baseServ).length > 0;
  if (!name || !hasAny) return null;

  const servQty = num(p.serving_quantity);
  const unitRaw = (p.serving_quantity_unit || '').toLowerCase();
  const baseUnit: 'g' | 'ml' = unitRaw === 'ml' || /\bml\b/i.test(p.serving_size ?? '') ? 'ml' : 'g';
  const text = parseServingText(p.serving_size);

  let serving: Food['serving'];
  let nutrients: Nutrients;
  if (servQty && servQty > 0) {
    const isMassOnly = !text || /^(g|ml|gram|grams)$/i.test(text.unit);
    serving = isMassOnly ? { qty: servQty, unit: baseUnit, grams: servQty } : { qty: text.qty, unit: text.unit, grams: servQty };
    // OFF computes _serving from _100g when data is per 100 g, so prefer _100g × grams for consistency
    nutrients = Object.keys(base100).length ? scaleBy(base100, servQty / 100) : baseServ;
  } else if (Object.keys(baseServ).length && text) {
    serving = { qty: text.qty, unit: text.unit };
    nutrients = baseServ;
  } else {
    serving = { qty: 100, unit: baseUnit, grams: 100 };
    nutrients = base100;
  }

  const code = gtin ?? p.code;
  const now = Date.now();
  const food: Food = {
    id: '',
    source: 'off',
    name,
    serving,
    nutrients,
    favorite: 0,
    useCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const brand = cleanBrand(p);
  if (brand) food.brand = brand;
  if (baseUnit === 'ml') food.baseUnit = 'ml';
  if (code && /^\d{6,14}$/.test(code)) {
    food.barcode = code.length === 12 ? `0${code}` : code;
    food.ref = code;
  }
  if (p.image_front_small_url?.startsWith('https://images.openfoodfacts.org/')) food.imageUrl = p.image_front_small_url;
  return food;
}

function scaleBy(n: Nutrients, f: number): Nutrients {
  const out: Nutrients = {};
  for (const [k, v] of Object.entries(n)) out[k as keyof Nutrients] = r3((v as number) * f);
  return out;
}

/** trim float noise (29.000000000000014 → 29) */
const r3 = (x: number) => Math.round(x * 1000) / 1000;
