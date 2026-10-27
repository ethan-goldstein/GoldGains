import { scale } from './math';
import type { Nutrients } from './nutrients';

export type FoodSource = 'custom' | 'off' | 'usda' | 'quick';

/** The reference amount a food's nutrients describe, e.g. "2/3 cup (55 g)" */
export interface Serving {
  qty: number;
  unit: string;
  /** weight (or volume, for liquids) of one serving; unknown for some custom foods */
  grams?: number;
}

/** An extra household measure, e.g. "1 large" = 50 g */
export interface Portion {
  label: string;
  grams: number;
}

/** Everything needed to log a food. Entries keep a copy so history never changes under you. */
export interface FoodCore {
  name: string;
  brand?: string;
  serving: Serving;
  /** nutrients for ONE serving as defined above */
  nutrients: Nutrients;
  portions?: Portion[];
  /** 'ml' for drinks, where serving.grams is really millilitres */
  baseUnit?: 'g' | 'ml';
}

export interface Food extends FoodCore {
  id: string;
  source: FoodSource;
  barcode?: string;
  /** source-side id (USDA fdcId, OFF code) */
  ref?: string;
  imageUrl?: string;
  favorite: 0 | 1;
  useCount: number;
  lastUsedAt?: number;
  /** last amount + unit the user logged, offered as the default next time */
  lastAmount?: number;
  lastUnit?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UnitOption {
  key: string;
  label: string;
  /** how many servings one of this unit is */
  servingsPer: number;
}

const OZ = 28.349523125;
const FLOZ = 29.5735295625;

export function servingLabel(s: Serving, baseUnit: 'g' | 'ml' = 'g'): string {
  const qty = formatQty(s.qty);
  const unit = s.unit.trim();
  const isMass = unit === 'g' || unit === 'ml';
  if (isMass) return `${qty} ${unit}`;
  return s.grams ? `${qty} ${unit} (${Math.round(s.grams)} ${baseUnit})` : `${qty} ${unit}`;
}

export function unitOptions(food: FoodCore): UnitOption[] {
  const base = food.baseUnit ?? 'g';
  const g = food.serving.grams;
  const opts: UnitOption[] = [];
  const unit = food.serving.unit.trim();
  if (unit !== 'g' && unit !== 'ml') {
    opts.push({ key: 'serving', label: food.serving.qty === 1 ? unit : `serving (${formatQty(food.serving.qty)} ${unit})`, servingsPer: 1 });
  }
  if (g && g > 0) {
    if (base === 'ml') {
      opts.push({ key: 'ml', label: 'ml', servingsPer: 1 / g });
      opts.push({ key: 'floz', label: 'fl oz', servingsPer: FLOZ / g });
    } else {
      opts.push({ key: 'g', label: 'g', servingsPer: 1 / g });
      opts.push({ key: 'oz', label: 'oz', servingsPer: OZ / g });
    }
    food.portions?.forEach((p, i) => {
      opts.push({ key: `p${i}`, label: p.label, servingsPer: p.grams / g });
    });
  }
  if (opts.length === 0) opts.push({ key: 'serving', label: 'serving', servingsPer: 1 });
  return opts;
}

export function defaultUnit(food: FoodCore & { lastUnit?: string; lastAmount?: number }): { unit: string; amount: number } {
  const opts = unitOptions(food);
  if (food.lastUnit && opts.some((o) => o.key === food.lastUnit)) {
    return { unit: food.lastUnit, amount: food.lastAmount ?? 1 };
  }
  const first = opts[0]!;
  if (first.key === 'g' || first.key === 'ml') {
    // USDA foods: prefer the first household portion, else 100 g
    const portion = opts.find((o) => o.key.startsWith('p'));
    if (portion) return { unit: portion.key, amount: 1 };
    return { unit: first.key, amount: food.serving.grams ?? 100 };
  }
  return { unit: first.key, amount: 1 };
}

export function servingsFor(food: FoodCore, amount: number, unit: string): number {
  const opt = unitOptions(food).find((o) => o.key === unit);
  return amount * (opt?.servingsPer ?? 1);
}

export function nutrientsFor(food: FoodCore, amount: number, unit: string): Nutrients {
  return scale(food.nutrients, servingsFor(food, amount, unit));
}

export function amountLabel(food: FoodCore, amount: number, unit: string): string {
  const opt = unitOptions(food).find((o) => o.key === unit);
  const label = opt?.label ?? unit;
  if (unit === 'serving') {
    const s = food.serving;
    const total = s.qty * amount;
    return `${formatQty(total)} ${s.unit}`;
  }
  if (unit.startsWith('p')) return amount === 1 ? label : `${formatQty(amount)} × ${label}`;
  return `${formatQty(amount)} ${label}`;
}

const FRACTIONS: [number, string][] = [
  [0.125, '⅛'],
  [0.25, '¼'],
  [0.333, '⅓'],
  [0.5, '½'],
  [0.667, '⅔'],
  [0.75, '¾'],
];

export function formatQty(q: number): string {
  if (!Number.isFinite(q)) return '';
  const whole = Math.floor(q);
  const frac = q - whole;
  if (frac < 0.02) return String(whole);
  for (const [val, sym] of FRACTIONS) {
    if (Math.abs(frac - val) < 0.02) return whole ? `${whole}${sym}` : sym;
  }
  return String(Number(q.toFixed(2)));
}

export function pickCore(f: FoodCore): FoodCore {
  const core: FoodCore = { name: f.name, serving: { ...f.serving }, nutrients: { ...f.nutrients } };
  if (f.brand) core.brand = f.brand;
  if (f.portions?.length) core.portions = f.portions.map((p) => ({ ...p }));
  if (f.baseUnit) core.baseUnit = f.baseUnit;
  return core;
}
