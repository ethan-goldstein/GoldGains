// Validation schema for backup files, loaded only when a backup is imported (keeps zod out of the main bundle).
import { z } from 'zod';
import { NUTRIENT_KEYS } from '@/domain/nutrients';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().min(1).max(64);
const num = z.number();
const text = (max = 200) => z.string().max(max);

const nutrients = z.partialRecord(z.enum(NUTRIENT_KEYS), num.min(0).max(1e7));

const foodCore = z.object({
  name: text(),
  brand: text().optional(),
  serving: z.object({ qty: num.positive(), unit: text(60), grams: num.positive().optional() }),
  nutrients,
  portions: z.array(z.object({ label: text(80), grams: num.positive() })).max(60).optional(),
  baseUnit: z.enum(['g', 'ml']).optional(),
});

const food = foodCore.extend({
  id,
  source: z.enum(['custom', 'off', 'usda', 'quick']),
  barcode: z.string().regex(/^\d{6,14}$/).optional(),
  ref: text(60).optional(),
  imageUrl: z.url({ protocol: /^https$/ }).max(500).optional(),
  favorite: z.union([z.literal(0), z.literal(1)]),
  useCount: num.int().min(0),
  lastUsedAt: num.optional(),
  lastAmount: num.optional(),
  lastUnit: text(20).optional(),
  createdAt: num,
  updatedAt: num,
});

const meal = z.enum(['breakfast', 'lunch', 'dinner', 'snacks']);

const entry = z.object({
  id,
  date: day,
  meal,
  foodId: id.optional(),
  food: foodCore,
  amount: num.positive(),
  unit: text(20),
  nutrients,
  createdAt: num,
});

const liftLog = z.object({
  liftId: text(60),
  name: text(80),
  unit: z.enum(['lb', 'kg']),
  sets: z.array(z.object({ reps: num.min(0), weight: num.min(0), done: z.boolean().optional() })).max(100),
});

const exercise = z.object({
  id,
  date: day,
  kind: z.enum(['cardio', 'sport', 'strength', 'other']),
  activityId: text(60).optional(),
  name: text(120),
  icon: text(16),
  minutes: num.min(0).max(24 * 60),
  distance: z.object({ value: num.min(0), unit: z.enum(['mi', 'km']) }).optional(),
  kcal: num.min(0).max(20000),
  kcalManual: z.boolean(),
  lifts: z.array(liftLog).max(60).optional(),
  notes: text(1000).optional(),
  createdAt: num,
});

const savedMeal = z.object({
  id,
  name: text(120),
  items: z.array(z.object({ foodId: id.optional(), food: foodCore, amount: num.positive(), unit: text(20) })).max(100),
  createdAt: num,
  lastUsedAt: num.optional(),
});

const weight = z.object({ id, date: day, kg: num.min(20).max(400), createdAt: num });

const goals = z.object({
  id,
  effectiveFrom: day,
  calories: num.min(0).max(20000),
  caloriesOverride: num.min(0).max(20000).nullable(),
  split: z.tuple([num, num, num]),
  presetId: text(40),
  protein: num.min(0),
  carbs: num.min(0),
  fat: num.min(0),
  fiberMin: num.min(0),
  addedSugarMax: num.min(0),
  sodiumMax: num.min(0),
  satFatMax: num.min(0),
  waterMl: num.min(0),
  createdAt: num,
});

const dayMeta = z.object({ date: day, waterMl: num.min(0).max(20000), note: text(2000).optional() });

const profile = z.object({
  name: text(60).optional(),
  sex: z.enum(['male', 'female']),
  age: num.min(10).max(110),
  heightCm: num.min(90).max(250),
  weightKg: num.min(20).max(400),
  goalWeightKg: num.min(20).max(400).optional(),
  activity: z.enum(['sedentary', 'light', 'moderate', 'active', 'very']),
  plan: z.enum(['lose', 'maintain', 'gain']),
  pace: num.min(0).max(3),
  units: z.enum(['imperial', 'metric']),
});

const settings = z.object({
  exerciseAddsToBudget: z.boolean(),
  netCarbs: z.boolean(),
  offlineOnly: z.boolean(),
  onboarded: z.boolean(),
  lensDeviceId: text(200).optional(),
  lastBackupAt: num.optional(),
  liftUnit: z.enum(['lb', 'kg']),
  distanceUnit: z.enum(['mi', 'km']),
  waterUnit: z.enum(['oz', 'ml']),
});

const LIMIT = 200_000;

export const backupSchema = z.object({
  app: z.literal('goldgains'),
  version: z.literal(1),
  exportedAt: num,
  tables: z.object({
    foods: z.array(food).max(LIMIT),
    entries: z.array(entry).max(LIMIT),
    exercises: z.array(exercise).max(LIMIT),
    savedMeals: z.array(savedMeal).max(LIMIT),
    weights: z.array(weight).max(LIMIT),
    goals: z.array(goals).max(LIMIT),
    days: z.array(dayMeta).max(LIMIT),
    profile: profile.nullable(),
    settings: settings.partial().nullable(),
  }),
});

export type Backup = z.infer<typeof backupSchema>;
