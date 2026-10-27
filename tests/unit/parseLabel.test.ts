import { describe, expect, it } from 'vitest';
import { normalizeOcr, parseLabel } from '@/scan/ocr/parseLabel';
import { validateLabel } from '@/scan/ocr/validate';

// OCR text fixtures: what Tesseract returns for real label layouts, including its usual mistakes.

const CLEAN = `Nutrition Facts
8 servings per container
Serving size 2/3 cup (55g)
Amount per serving
Calories 230
% Daily Value*
Total Fat 8g 10%
Saturated Fat 1g 5%
Trans Fat 0g
Cholesterol 0mg 0%
Sodium 160mg 7%
Total Carbohydrate 37g 13%
Dietary Fiber 4g 14%
Total Sugars 12g
Includes 10g Added Sugars 20%
Protein 3g
Vitamin D 2mcg 10%
Calcium 260mg 20%
Iron 8mg 45%
Potassium 240mg 6%
* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.`;

const NOISY = `Nutritlon Facts
About 8 servings per contalner
Serving size 2/3 cup (55g)
Calories
230
Total Fat 89 10%
Saturated Fat lg 5%
Trans Fat Og
Cholesterol Omg 0%
Sodium 160rng 7%
Total Carbohydrate 37g 13%
Dietary Fiber 4g 14%
Total Sugars 12g
Includes 1Og Added Sugars 20%
Protein 3g
Vitamin D 2meg 10%
Calcium 260mg 20%
Iron 8mg 45%
Potassium 240mg 6%`;

const PROTEIN_BAR = `Nutrition Facts
12 servings per container
Serving size 1 bar (60g)
Calories 210
Total Fat 7g 9%
  Saturated Fat 3.5g 18%
  Trans Fat 0g
Cholesterol 5mg 2%
Sodium 200mg 9%
Total Carbohydrate 23g 8%
  Dietary Fiber 10g 36%
  Total Sugars 1g
    Includes 0g Added Sugars 0%
  Sugar Alcohol 6g
Protein 20g 40%
Calcium 130mg 10%
Iron 1mg 6%
Potassium 160mg 4%`;

// two columns: per serving and per container
const DUAL = `Nutrition Facts
2 servings per container
Serving size 1 cup (240mL)
Calories 140 280
Total Fat 3g 4% 6g 8%
Saturated Fat 2g 10% 4g 20%
Sodium 120mg 5% 240mg 10%
Total Carbohydrate 18g 7% 36g 13%
Dietary Fiber 0g 0% 0g 0%
Total Sugars 17g 34g
Includes 0g Added Sugars 0% 0g 0%
Protein 10g 20g`;

const OLD_STYLE = `Nutrition Facts
Serving Size 28g
Amount Per Serving
Calories 160 Calories from Fat 90
Total Fat 10g 15%
Saturated Fat 1.5g 8%
Polyunsaturated Fat 3g
Monounsaturated Fat 5.5g
Cholesterol 0mg 0%
Sodium 170mg 7%
Total Carbohydrate 15g 5%
Dietary Fiber 1g 4%
Sugars 0g
Protein 2g
Calories per gram: Fat 9 Carbohydrate 4 Protein 4`;

describe('normalizeOcr', () => {
  it('fixes letter-for-digit swaps only in amounts', () => {
    const t = normalizeOcr('Trans Fat Og\nSaturated Fat lg 5%\nSodium 1O5rng\nVitamin D 2meg\nSugar 1O%');
    expect(t).toContain('trans fat 0g');
    expect(t).toContain('saturated fat 1g');
    expect(t).toContain('sodium 105mg');
    expect(t).toContain('vitamin d 2mcg');
    expect(t).toContain('sugar 10%');
  });
  it('leaves ordinary words alone', () => {
    expect(normalizeOcr('Serving size big bag')).toContain('serving size big bag');
  });
});

describe('parseLabel', () => {
  it('reads a clean modern label', () => {
    const p = parseLabel(CLEAN);
    expect(p.nutrients).toMatchObject({
      kcal: 230,
      fat: 8,
      satFat: 1,
      transFat: 0,
      cholesterol: 0,
      sodium: 160,
      carbs: 37,
      fiber: 4,
      sugars: 12,
      addedSugars: 10,
      protein: 3,
      vitD: 2,
      calcium: 260,
      iron: 8,
      potassium: 240,
    });
    expect(p.serving).toEqual({ qty: 2 / 3, unit: 'cup', grams: 55 });
    expect(p.servingsPerContainer).toBe(8);
    expect(p.flagged).toEqual([]);
  });

  it('recovers values from typical OCR mistakes', () => {
    const p = parseLabel(NOISY);
    expect(p.nutrients.kcal).toBe(230);
    // "89 10%" → 8 g, resolved by the printed %DV (8/78 ≈ 10%)
    expect(p.nutrients.fat).toBe(8);
    expect(p.nutrients.satFat).toBe(1);
    expect(p.nutrients.transFat).toBe(0);
    expect(p.nutrients.sodium).toBe(160);
    expect(p.nutrients.addedSugars).toBe(10);
    expect(p.nutrients.vitD).toBe(2);
    expect(p.flagged).toContain('fat');
  });

  it('separates sugar alcohols from sugars and handles 0g added sugars', () => {
    const p = parseLabel(PROTEIN_BAR);
    expect(p.nutrients).toMatchObject({ kcal: 210, fat: 7, satFat: 3.5, carbs: 23, fiber: 10, sugars: 1, addedSugars: 0, sugarAlcohols: 6, protein: 20 });
    expect(p.serving).toEqual({ qty: 1, unit: 'bar', grams: 60 });
  });

  it('takes the per-serving column on dual-column labels', () => {
    const p = parseLabel(DUAL);
    expect(p.nutrients).toMatchObject({ kcal: 140, fat: 3, satFat: 2, sodium: 120, carbs: 18, sugars: 17, protein: 10 });
    expect(p.serving?.grams).toBe(240);
  });

  it('reads older labels and ignores "Calories from Fat" and the per-gram footnote', () => {
    const p = parseLabel(OLD_STYLE);
    expect(p.nutrients).toMatchObject({ kcal: 160, fat: 10, satFat: 1.5, polyFat: 3, monoFat: 5.5, sodium: 170, carbs: 15, fiber: 1, sugars: 0, protein: 2 });
    expect(p.serving).toEqual({ qty: 28, unit: 'g', grams: 28 });
  });

  it('backs out an amount from %DV when only the percent is printed', () => {
    const p = parseLabel('Calories 100\nProtein 5g\nIron 10%');
    expect(p.nutrients.iron).toBeCloseTo(1.8);
    expect(p.flagged).toContain('iron');
  });

  it('reads "(559)" in the serving size as 55 g and flags it', () => {
    const p = parseLabel('Serving size 2/3 cup (559)\nCalories 230');
    expect(p.serving).toEqual({ qty: 2 / 3, unit: 'cup', grams: 55 });
    expect(p.flagged).toContain('grams');
  });

  it('survives a clipped first letter and missing spaces', () => {
    const p = parseLabel('Calories 210\n[otal Fat 7g 9%\nSaturated Fat 3.59 18%\nodium 200mg 9%\nrotein 20g 40%\nTotal Sugars1g');
    expect(p.nutrients).toMatchObject({ fat: 7, satFat: 3.5, sodium: 200, protein: 20, sugars: 1 });
  });

  it('converts units when the label uses a different one', () => {
    expect(parseLabel('Calories 10\nSodium 0.2g 9%').nutrients.sodium).toBe(200);
  });
});

describe('validateLabel', () => {
  it('passes a consistent label', () => {
    const v = validateLabel(parseLabel(CLEAN));
    expect(v.warnings).toEqual([]);
  });
  it('flags impossible combinations and calorie mismatches', () => {
    const v = validateLabel(parseLabel('Calories 900\nTotal Fat 2g\nSaturated Fat 5g\nTotal Carbohydrate 10g\nTotal Sugars 14g\nProtein 3g'));
    expect(v.flagged).toEqual(expect.arrayContaining(['satFat', 'sugars', 'kcal']));
    expect(v.warnings.length).toBeGreaterThanOrEqual(3);
  });
  it('warns when almost nothing was readable', () => {
    expect(validateLabel(parseLabel('blurry nonsense calories')).warnings[0]).toMatch(/closer/);
  });
});
