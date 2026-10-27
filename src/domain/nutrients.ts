// Single source of truth for every nutrient GoldGains tracks: label, unit, FDA Daily Value,
// color, and how it maps from Open Food Facts and USDA FoodData Central.

export const NUTRIENT_KEYS = [
  'kcal',
  'protein',
  'carbs',
  'fiber',
  'sugars',
  'addedSugars',
  'sugarAlcohols',
  'fat',
  'satFat',
  'transFat',
  'monoFat',
  'polyFat',
  'omega3',
  'cholesterol',
  'sodium',
  'potassium',
  'calcium',
  'iron',
  'magnesium',
  'zinc',
  'vitA',
  'vitC',
  'vitD',
  'vitB12',
  'folate',
  'caffeine',
  'alcohol',
] as const;

export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

/** Amounts for one food or one day. A missing key means "unknown", which is not the same as 0. */
export type Nutrients = Partial<Record<NutrientKey, number>>;

export type Unit = 'kcal' | 'g' | 'mg' | 'µg';
export type NutrientGroup = 'energy' | 'macro' | 'carb' | 'fat' | 'mineral' | 'vitamin' | 'other';

export interface NutrientDef {
  key: NutrientKey;
  label: string;
  short?: string;
  unit: Unit;
  group: NutrientGroup;
  /** FDA Daily Value for adults (2016 label rule) */
  dv?: number;
  /** nesting under its parent on the label, 0 = top level */
  indent?: 0 | 1 | 2;
  /** Open Food Facts nutriment key; OFF stores masses in grams */
  off?: string[];
  /** USDA nutrient ids in preference order */
  usda?: number[];
}

export const NUTRIENTS: Record<NutrientKey, NutrientDef> = {
  kcal: { key: 'kcal', label: 'Calories', short: 'Cal', unit: 'kcal', group: 'energy', off: ['energy-kcal'], usda: [1008, 2047, 2048] },
  protein: { key: 'protein', label: 'Protein', unit: 'g', group: 'macro', dv: 50, off: ['proteins'], usda: [1003] },
  carbs: { key: 'carbs', label: 'Total Carbs', short: 'Carbs', unit: 'g', group: 'macro', dv: 275, off: ['carbohydrates'], usda: [1005] },
  fiber: { key: 'fiber', label: 'Fiber', unit: 'g', group: 'carb', dv: 28, indent: 1, off: ['fiber'], usda: [1079] },
  sugars: { key: 'sugars', label: 'Total Sugars', short: 'Sugar', unit: 'g', group: 'carb', indent: 1, off: ['sugars'], usda: [2000, 1063] },
  addedSugars: { key: 'addedSugars', label: 'Added Sugars', unit: 'g', group: 'carb', dv: 50, indent: 2, off: ['added-sugars'] },
  sugarAlcohols: { key: 'sugarAlcohols', label: 'Sugar Alcohols', unit: 'g', group: 'carb', indent: 1, off: ['polyols'] },
  fat: { key: 'fat', label: 'Total Fat', short: 'Fat', unit: 'g', group: 'macro', dv: 78, off: ['fat'], usda: [1004] },
  satFat: { key: 'satFat', label: 'Saturated Fat', short: 'Sat Fat', unit: 'g', group: 'fat', dv: 20, indent: 1, off: ['saturated-fat'], usda: [1258] },
  transFat: { key: 'transFat', label: 'Trans Fat', unit: 'g', group: 'fat', indent: 1, off: ['trans-fat'], usda: [1257] },
  monoFat: { key: 'monoFat', label: 'Monounsaturated', short: 'Mono Fat', unit: 'g', group: 'fat', indent: 1, off: ['monounsaturated-fat'], usda: [1292] },
  polyFat: { key: 'polyFat', label: 'Polyunsaturated', short: 'Poly Fat', unit: 'g', group: 'fat', indent: 1, off: ['polyunsaturated-fat'], usda: [1293] },
  omega3: { key: 'omega3', label: 'Omega-3', unit: 'g', group: 'fat', indent: 2, off: ['omega-3-fat'] },
  cholesterol: { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', group: 'other', dv: 300, off: ['cholesterol'], usda: [1253] },
  sodium: { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'mineral', dv: 2300, off: ['sodium'], usda: [1093] },
  potassium: { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'mineral', dv: 4700, off: ['potassium'], usda: [1092] },
  calcium: { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'mineral', dv: 1300, off: ['calcium'], usda: [1087] },
  iron: { key: 'iron', label: 'Iron', unit: 'mg', group: 'mineral', dv: 18, off: ['iron'], usda: [1089] },
  magnesium: { key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'mineral', dv: 420, off: ['magnesium'], usda: [1090] },
  zinc: { key: 'zinc', label: 'Zinc', unit: 'mg', group: 'mineral', dv: 11, off: ['zinc'], usda: [1095] },
  vitA: { key: 'vitA', label: 'Vitamin A', short: 'Vit A', unit: 'µg', group: 'vitamin', dv: 900, off: ['vitamin-a'], usda: [1106] },
  vitC: { key: 'vitC', label: 'Vitamin C', short: 'Vit C', unit: 'mg', group: 'vitamin', dv: 90, off: ['vitamin-c'], usda: [1162] },
  vitD: { key: 'vitD', label: 'Vitamin D', short: 'Vit D', unit: 'µg', group: 'vitamin', dv: 20, off: ['vitamin-d'], usda: [1114] },
  vitB12: { key: 'vitB12', label: 'Vitamin B12', short: 'B12', unit: 'µg', group: 'vitamin', dv: 2.4, off: ['vitamin-b12'], usda: [1178] },
  folate: { key: 'folate', label: 'Folate', unit: 'µg', group: 'vitamin', dv: 400, off: ['vitamin-b9', 'folates'], usda: [1190] },
  caffeine: { key: 'caffeine', label: 'Caffeine', unit: 'mg', group: 'other', off: ['caffeine'], usda: [1057] },
  alcohol: { key: 'alcohol', label: 'Alcohol', unit: 'g', group: 'other', usda: [1018] },
};

/** grams → this nutrient's display unit, for sources (OFF) that store every mass in grams */
export function gramsToUnit(unit: Unit): number {
  switch (unit) {
    case 'mg':
      return 1_000;
    case 'µg':
      return 1_000_000;
    default:
      return 1;
  }
}

/** The order rows appear on the Nutrition details panel and the full label form. */
export const LABEL_ORDER: NutrientKey[] = [
  'kcal',
  'fat',
  'satFat',
  'transFat',
  'monoFat',
  'polyFat',
  'omega3',
  'cholesterol',
  'sodium',
  'carbs',
  'fiber',
  'sugars',
  'addedSugars',
  'sugarAlcohols',
  'protein',
  'vitD',
  'calcium',
  'iron',
  'potassium',
  'vitA',
  'vitC',
  'vitB12',
  'folate',
  'magnesium',
  'zinc',
  'caffeine',
  'alcohol',
];

export const MACROS = ['protein', 'carbs', 'fat'] as const;
export type Macro = (typeof MACROS)[number];

/** Atwater factors used for the calorie split */
export const KCAL_PER_G: Record<Macro, number> = { protein: 4, carbs: 4, fat: 9 };

export const MACRO_COLOR: Record<Macro, string> = {
  protein: 'var(--color-protein)',
  carbs: 'var(--color-carbs)',
  fat: 'var(--color-fat)',
};

export const MACRO_LABEL: Record<Macro, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
