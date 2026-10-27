import Dexie, { type EntityTable } from 'dexie';
import type { DayKey } from '@/domain/day';
import type { ExerciseKind, LiftLog } from '@/domain/exercise';
import type { Food, FoodCore } from '@/domain/food';
import type { Nutrients } from '@/domain/nutrients';
import type { Profile } from '@/domain/profile';

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
export type MealKey = (typeof MEALS)[number];
export const MEAL_LABEL: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
};

export interface Entry {
  id: string;
  date: DayKey;
  meal: MealKey;
  foodId?: string;
  /** copy of the food at log time — editing or deleting the food never rewrites history */
  food: FoodCore;
  amount: number;
  unit: string;
  /** totals for this entry (food.nutrients × servings) */
  nutrients: Nutrients;
  createdAt: number;
}

export interface Exercise {
  id: string;
  date: DayKey;
  kind: ExerciseKind;
  activityId?: string;
  name: string;
  icon: string;
  minutes: number;
  distance?: { value: number; unit: 'mi' | 'km' };
  /** active calories */
  kcal: number;
  /** true when the user typed calories (e.g. from a watch) instead of the estimate */
  kcalManual: boolean;
  lifts?: LiftLog[];
  notes?: string;
  createdAt: number;
}

export interface SavedMealItem {
  foodId?: string;
  food: FoodCore;
  amount: number;
  unit: string;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
  createdAt: number;
  lastUsedAt?: number;
}

export interface WeightLog {
  id: string;
  date: DayKey;
  kg: number;
  createdAt: number;
}

export interface Goals {
  id: string;
  /** applies to this day and every day after, until a newer record */
  effectiveFrom: DayKey;
  calories: number;
  /** null = calculated from profile; number = user override */
  caloriesOverride: number | null;
  split: [number, number, number];
  presetId: string;
  protein: number;
  carbs: number;
  fat: number;
  fiberMin: number;
  addedSugarMax: number;
  sodiumMax: number;
  satFatMax: number;
  waterMl: number;
  createdAt: number;
}

export interface DayMeta {
  date: DayKey;
  waterMl: number;
  note?: string;
}

export interface Settings {
  exerciseAddsToBudget: boolean;
  netCarbs: boolean;
  offlineOnly: boolean;
  onboarded: boolean;
  lensDeviceId?: string;
  lastBackupAt?: number;
  liftUnit: 'lb' | 'kg';
  distanceUnit: 'mi' | 'km';
  waterUnit: 'oz' | 'ml';
}

export interface KV {
  key: 'profile' | 'settings';
  value: Profile | Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  exerciseAddsToBudget: true,
  netCarbs: false,
  offlineOnly: false,
  onboarded: false,
  liftUnit: 'lb',
  distanceUnit: 'mi',
  waterUnit: 'oz',
};

export class GoldGainsDB extends Dexie {
  foods!: EntityTable<Food, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  savedMeals!: EntityTable<SavedMeal, 'id'>;
  weights!: EntityTable<WeightLog, 'id'>;
  goals!: EntityTable<Goals, 'id'>;
  days!: EntityTable<DayMeta, 'date'>;
  kv!: EntityTable<KV, 'key'>;

  constructor(name = 'goldgains') {
    super(name);
    this.version(1).stores({
      foods: 'id, barcode, source, ref, favorite, lastUsedAt, useCount, name',
      entries: 'id, date, [date+meal], foodId, createdAt',
      exercises: 'id, date, kind, activityId, createdAt',
      savedMeals: 'id, name, lastUsedAt',
      weights: 'id, date',
      goals: 'id, effectiveFrom',
      days: 'date',
      kv: 'key',
    });
  }
}

export const db = new GoldGainsDB();

export const uid = () => crypto.randomUUID();
