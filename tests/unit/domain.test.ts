import { describe, expect, it } from 'vitest';
import { addDays, dayKey, monthGrid, weekOf } from '@/domain/day';
import { activeKcal, bestSet, est1RM } from '@/domain/exercise';
import { amountLabel, defaultUnit, formatQty, nutrientsFor, unitOptions, type FoodCore } from '@/domain/food';
import { isValidGtin, normalizeGtin, upcEtoA } from '@/domain/gtin';
import { atwaterKcal, healthyFats, macroSplit, netCarbs, total } from '@/domain/math';
import { bmr, budgetFor, DEFAULT_PROFILE, lbToKg, macroGrams } from '@/domain/profile';
import { gainsScore, streak } from '@/domain/score';

describe('nutrient math', () => {
  it('totals keep "unknown" separate from zero', () => {
    const t = total([{ kcal: 100, fiber: 3 }, { kcal: 50 }]);
    expect(t.sum).toEqual({ kcal: 150, fiber: 3 });
    expect(t.partial.has('fiber')).toBe(true);
    expect(t.partial.has('kcal')).toBe(false);
    expect(t.sum.sodium).toBeUndefined();
  });
  it('net carbs and healthy fats', () => {
    expect(netCarbs({ carbs: 23, fiber: 10, sugarAlcohols: 6 })).toBe(7);
    expect(netCarbs({ carbs: 5, fiber: 9 })).toBe(0);
    expect(healthyFats({ monoFat: 5.5, polyFat: 3 })).toBe(8.5);
    expect(healthyFats({ fat: 3 })).toBeUndefined();
  });
  it('macro split is by calories', () => {
    const s = macroSplit({ protein: 30, carbs: 40, fat: 10 });
    expect(s.macroKcal).toBe(370);
    expect(s.pct.fat).toBeCloseTo(90 / 370);
    expect(s.pct.protein + s.pct.carbs + s.pct.fat).toBeCloseTo(1);
  });
  it('atwater accounts for fiber and sugar alcohols', () => {
    expect(atwaterKcal({ protein: 20, carbs: 23, fiber: 10, sugarAlcohols: 6, fat: 7 })).toBeCloseTo(80 + 28 + 20 + 14.4 + 63);
  });
});

describe('servings', () => {
  const bar: FoodCore = { name: 'Bar', serving: { qty: 1, unit: 'bar', grams: 60 }, nutrients: { kcal: 210, protein: 20 } };
  const egg: FoodCore = { name: 'Egg', serving: { qty: 100, unit: 'g', grams: 100 }, nutrients: { kcal: 143 }, portions: [{ label: '1 large', grams: 50 }] };
  it('offers serving, g, oz and portions', () => {
    expect(unitOptions(bar).map((o) => o.key)).toEqual(['serving', 'g', 'oz']);
    expect(unitOptions(egg).map((o) => o.key)).toEqual(['g', 'oz', 'p0']);
  });
  it('scales nutrients by any unit', () => {
    expect(nutrientsFor(bar, 2, 'serving').kcal).toBe(420);
    expect(nutrientsFor(bar, 30, 'g').protein).toBe(10);
    expect(nutrientsFor(egg, 2, 'p0').kcal).toBeCloseTo(143);
    expect(nutrientsFor(egg, 1, 'oz').kcal).toBeCloseTo(143 * 0.2835, 1);
  });
  it('defaults USDA foods to their first household portion', () => {
    expect(defaultUnit(egg)).toEqual({ unit: 'p0', amount: 1 });
    expect(defaultUnit({ ...egg, lastUnit: 'g', lastAmount: 120 } as FoodCore)).toEqual({ unit: 'g', amount: 120 });
  });
  it('labels amounts nicely', () => {
    expect(formatQty(0.6667)).toBe('⅔');
    expect(formatQty(1.5)).toBe('1½');
    expect(amountLabel(bar, 2, 'serving')).toBe('2 bar');
    expect(amountLabel(egg, 2, 'p0')).toBe('2 × 1 large');
  });
});

describe('barcodes', () => {
  it('validates GTIN check digits', () => {
    expect(isValidGtin('0049000028911')).toBe(true);
    expect(isValidGtin('0049000028912')).toBe(false);
  });
  it('normalizes UPC-A to 13 digits and expands UPC-E', () => {
    expect(normalizeGtin('049000028911', 'upc_a')).toBe('0049000028911');
    expect(upcEtoA('04252614')).toBe('042100005264');
    expect(normalizeGtin('04252614', 'upc_e')).toBe('0042100005264');
    expect(normalizeGtin('3017620422003', 'ean_13')).toBe('3017620422003');
  });
});

describe('profile & budget', () => {
  const p = { ...DEFAULT_PROFILE, sex: 'male' as const, age: 25, heightCm: 180, weightKg: 80, activity: 'moderate' as const };
  it('Mifflin-St Jeor BMR', () => {
    expect(bmr(p)).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 25 + 5);
  });
  it('budget applies the weekly pace and a safety floor', () => {
    const maintain = budgetFor({ ...p, plan: 'maintain' }).budget;
    const lose1 = budgetFor({ ...p, plan: 'lose', pace: 1 }).budget;
    expect(maintain - lose1).toBeGreaterThanOrEqual(490);
    expect(maintain - lose1).toBeLessThanOrEqual(510);
    const tiny = budgetFor({ ...p, sex: 'female', weightKg: lbToKg(110), heightCm: 150, age: 50, activity: 'sedentary', plan: 'lose', pace: 2 });
    expect(tiny.budget).toBe(1200);
    expect(tiny.clamped).toBe(true);
  });
  it('macro grams from a split', () => {
    expect(macroGrams(2000, [30, 40, 30])).toEqual({ protein: 150, carbs: 200, fat: 67 });
  });
});

describe('exercise', () => {
  it('active calories exclude resting burn', () => {
    expect(activeKcal(8, 80, 60)).toBeCloseTo(560);
    expect(activeKcal(1, 80, 60)).toBe(0);
  });
  it('estimated 1RM and best set', () => {
    expect(est1RM(225, 1)).toBe(225);
    expect(est1RM(200, 5)).toBeCloseTo(233.3, 1);
    expect(bestSet([{ reps: 10, weight: 135 }, { reps: 3, weight: 185 }])?.set.weight).toBe(185);
  });
});

describe('days, score, streak', () => {
  it('uses local calendar days', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(weekOf('2026-10-28')).toHaveLength(7);
    expect(monthGrid(2026, 9)).toHaveLength(42);
  });
  it('streak counts back from today (or yesterday)', () => {
    const days = new Set(['2026-10-25', '2026-10-26', '2026-10-27']);
    expect(streak(days, '2026-10-27')).toBe(3);
    expect(streak(days, '2026-10-28')).toBe(3);
    expect(streak(days, '2026-10-30')).toBe(0);
  });
  it('gains score rewards hitting the plan', () => {
    const t = { budget: 2000, protein: 150, fiberMin: 28, addedSugarMax: 50, sodiumMax: 2300 };
    expect(gainsScore({ kcal: 1980, protein: 150, fiber: 30, addedSugars: 20, sodium: 1800 }, t).score).toBe(100);
    expect(gainsScore({ kcal: 3200, protein: 40, fiber: 5 }, t).score).toBeLessThan(45);
  });
});
