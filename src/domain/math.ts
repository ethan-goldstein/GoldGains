import { KCAL_PER_G, MACROS, NUTRIENT_KEYS, type Macro, type NutrientKey, type Nutrients } from './nutrients';

export function scale(n: Nutrients, factor: number): Nutrients {
  const out: Nutrients = {};
  for (const k of NUTRIENT_KEYS) {
    const v = n[k];
    if (v !== undefined && Number.isFinite(v)) out[k] = v * factor;
  }
  return out;
}

export interface Totals {
  sum: Nutrients;
  /** keys where at least one item had no value, so the total is a lower bound ("≥") */
  partial: Set<NutrientKey>;
  count: number;
}

export function total(items: Nutrients[]): Totals {
  const sum: Nutrients = {};
  const partial = new Set<NutrientKey>();
  for (const k of NUTRIENT_KEYS) {
    let s = 0;
    let seen = false;
    for (const n of items) {
      const v = n[k];
      if (v === undefined) {
        partial.add(k);
      } else {
        s += v;
        seen = true;
      }
    }
    if (seen) sum[k] = s;
    else partial.delete(k);
  }
  return { sum, partial, count: items.length };
}

export const v = (n: Nutrients, k: NutrientKey): number => n[k] ?? 0;

/** Net carbs = total carbs − fiber − sugar alcohols (never below 0) */
export function netCarbs(n: Nutrients): number {
  return Math.max(0, v(n, 'carbs') - v(n, 'fiber') - v(n, 'sugarAlcohols'));
}

/** "Healthy fats" = mono + polyunsaturated, when either is known */
export function healthyFats(n: Nutrients): number | undefined {
  if (n.monoFat === undefined && n.polyFat === undefined) return undefined;
  return v(n, 'monoFat') + v(n, 'polyFat');
}

export interface MacroSplit {
  grams: Record<Macro, number>;
  kcal: Record<Macro, number>;
  /** share of macro calories, 0–1 */
  pct: Record<Macro, number>;
  macroKcal: number;
}

export function macroSplit(n: Nutrients, useNetCarbs = false): MacroSplit {
  const grams: Record<Macro, number> = {
    protein: v(n, 'protein'),
    carbs: useNetCarbs ? netCarbs(n) : v(n, 'carbs'),
    fat: v(n, 'fat'),
  };
  const kcal = {} as Record<Macro, number>;
  let macroKcal = 0;
  for (const m of MACROS) {
    kcal[m] = grams[m] * KCAL_PER_G[m];
    macroKcal += kcal[m];
  }
  const pct = {} as Record<Macro, number>;
  for (const m of MACROS) pct[m] = macroKcal > 0 ? kcal[m] / macroKcal : 0;
  return { grams, kcal, pct, macroKcal };
}

/** Calories implied by the macros, accounting for fiber (2 kcal/g) and sugar alcohols (2.4 kcal/g). */
export function atwaterKcal(n: Nutrients): number {
  const fiber = v(n, 'fiber');
  const sa = v(n, 'sugarAlcohols');
  const digestible = Math.max(0, v(n, 'carbs') - fiber - sa);
  return 4 * v(n, 'protein') + 4 * digestible + 2 * fiber + 2.4 * sa + 9 * v(n, 'fat') + 7 * v(n, 'alcohol');
}

/** Sensible precision for display: whole numbers above 10, one decimal below, two below 1 for µg-scale values */
export function fmt(x: number | undefined, opts: { max?: number } = {}): string {
  if (x === undefined || !Number.isFinite(x)) return '—';
  const abs = Math.abs(x);
  let digits = abs >= 10 ? 0 : abs >= 1 ? 1 : abs === 0 ? 0 : 2;
  if (opts.max !== undefined) digits = Math.min(digits, opts.max);
  const r = Number(x.toFixed(digits));
  return r.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export const round = (x: number, step = 1) => Math.round(x / step) * step;
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
