// Personal info → calorie budget and macro targets (Mifflin-St Jeor).

export type Sex = 'male' | 'female';
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very';
export type Plan = 'lose' | 'maintain' | 'gain';
export type UnitSystem = 'imperial' | 'metric';

export interface Profile {
  name?: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg?: number;
  activity: Activity;
  plan: Plan;
  /** lb per week toward the goal */
  pace: number;
  units: UnitSystem;
}

export const ACTIVITY: Record<Activity, { label: string; detail: string; factor: number }> = {
  sedentary: { label: 'Sedentary', detail: 'Desk job, little movement', factor: 1.2 },
  light: { label: 'Lightly active', detail: 'On your feet some, or 1–3 workouts a week', factor: 1.375 },
  moderate: { label: 'Active', detail: 'On your feet a lot, or 3–5 workouts a week', factor: 1.55 },
  active: { label: 'Very active', detail: 'Training 6–7 days a week', factor: 1.725 },
  very: { label: 'Athlete', detail: 'Two-a-days or a physical job plus training', factor: 1.9 },
};

export const LOSE_PACES = [0.5, 1, 1.5, 2] as const;
export const GAIN_PACES = [0.25, 0.5, 0.75, 1] as const;

export const KCAL_PER_LB = 3500;
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'activity'>): number {
  return bmr(p) * ACTIVITY[p.activity].factor;
}

/** Floor below which we warn: common clinical minimums without supervision */
export const minBudget = (sex: Sex) => (sex === 'male' ? 1500 : 1200);

export interface BudgetResult {
  bmr: number;
  tdee: number;
  budget: number;
  /** true when the requested pace pushed the budget under the safe floor */
  clamped: boolean;
}

export function budgetFor(p: Profile): BudgetResult {
  const b = bmr(p);
  const t = tdee(p);
  const daily = (p.pace * KCAL_PER_LB) / 7;
  let budget = p.plan === 'lose' ? t - daily : p.plan === 'gain' ? t + daily : t;
  let clamped = false;
  if (p.plan === 'lose' && budget < minBudget(p.sex)) {
    budget = minBudget(p.sex);
    clamped = true;
  }
  return { bmr: b, tdee: t, budget: Math.round(budget / 10) * 10, clamped };
}

/** Weeks to reach the goal weight at the chosen pace */
export function weeksToGoal(p: Profile): number | undefined {
  if (!p.goalWeightKg || p.plan === 'maintain' || p.pace <= 0) return undefined;
  const diffLb = Math.abs(kgToLb(p.weightKg - p.goalWeightKg));
  return diffLb / p.pace;
}

export interface MacroPreset {
  id: string;
  label: string;
  detail: string;
  /** protein / carbs / fat share of calories, sums to 100 */
  split: [number, number, number];
}

export const MACRO_PRESETS: MacroPreset[] = [
  { id: 'balanced', label: 'Balanced', detail: 'Solid default for most goals', split: [30, 40, 30] },
  { id: 'high-protein', label: 'High protein', detail: 'Lean gains and cutting', split: [40, 35, 25] },
  { id: 'performance', label: 'Performance', detail: 'Fuel for heavy training and sports', split: [25, 50, 25] },
  { id: 'low-carb', label: 'Low carb', detail: 'Fewer carbs, more fat', split: [35, 20, 45] },
  { id: 'keto', label: 'Keto', detail: 'Very low carb', split: [25, 5, 70] },
];

export function macroGrams(kcal: number, split: [number, number, number]): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((kcal * split[0]) / 100 / 4),
    carbs: Math.round((kcal * split[1]) / 100 / 4),
    fat: Math.round((kcal * split[2]) / 100 / 9),
  };
}

export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const totalIn = Math.round(cm / CM_PER_IN);
  return `${Math.floor(totalIn / 12)}′ ${totalIn % 12}″`;
}

export function formatWeight(kg: number, units: UnitSystem, digits = 1): string {
  return units === 'metric' ? `${kg.toFixed(digits)} kg` : `${kgToLb(kg).toFixed(digits)} lb`;
}

export const DEFAULT_PROFILE: Profile = {
  sex: 'male',
  age: 22,
  heightCm: 178,
  weightKg: lbToKg(175),
  activity: 'moderate',
  plan: 'maintain',
  pace: 1,
  units: 'imperial',
};
