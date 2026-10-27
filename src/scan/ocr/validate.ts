import { atwaterKcal } from '@/domain/math';
import type { NutrientKey } from '@/domain/nutrients';
import type { ParsedLabel } from './parseLabel';

/** Sanity checks on a parsed label. Adds warnings and flags; never changes values. */
export function validateLabel(p: ParsedLabel): ParsedLabel {
  const n = p.nutrients;
  const flagged = new Set(p.flagged);
  const warnings = [...p.warnings];
  const flag = (...keys: NutrientKey[]) => keys.forEach((k) => flagged.add(k));
  const gt = (a: number | undefined, b: number | undefined, slack = 0.5) => a !== undefined && b !== undefined && a > b + slack;

  if (p.found < 3) warnings.push('Only a few values were readable. Try a closer, flatter, well-lit photo of just the Nutrition Facts box.');
  if (n.kcal === undefined) {
    warnings.push('Calories weren’t found.');
    flagged.add('kcal');
  }
  if (gt((n.satFat ?? 0) + (n.transFat ?? 0), n.fat)) {
    warnings.push('Saturated + trans fat is more than total fat.');
    flag('satFat', 'fat');
  }
  if (gt(n.sugars, n.carbs)) {
    warnings.push('Sugars are more than total carbs.');
    flag('sugars', 'carbs');
  }
  if (gt(n.fiber, n.carbs)) {
    warnings.push('Fiber is more than total carbs.');
    flag('fiber', 'carbs');
  }
  if (gt(n.addedSugars, n.sugars)) {
    warnings.push('Added sugars are more than total sugars.');
    flag('addedSugars', 'sugars');
  }
  const grams = p.serving?.grams;
  if (grams) {
    const mass = (n.protein ?? 0) + (n.carbs ?? 0) + (n.fat ?? 0);
    if (mass > grams * 1.05 + 1) {
      warnings.push(`Macros add up to more than the ${grams} g serving.`);
      flag('protein', 'carbs', 'fat');
    }
  }
  if (n.kcal !== undefined && (n.protein !== undefined || n.carbs !== undefined || n.fat !== undefined)) {
    const implied = atwaterKcal(n);
    if (Math.abs(implied - n.kcal) > Math.max(15, n.kcal * 0.2)) {
      warnings.push(`Calories (${Math.round(n.kcal)}) don’t match the macros (~${Math.round(implied)}).`);
      flag('kcal');
    }
  }
  // FDA rounding: fat/carbs/protein above 5 g are whole numbers; sodium steps of 5/10 mg
  for (const k of ['fat', 'carbs', 'protein', 'satFat'] as const) {
    const v = n[k];
    if (v !== undefined && v >= 5 && Math.abs(v - Math.round(v)) > 0.01) flag(k);
  }
  if (n.sodium !== undefined && n.sodium > 140 && n.sodium % 10 !== 0) flag('sodium');

  return { ...p, flagged: [...flagged], warnings };
}
