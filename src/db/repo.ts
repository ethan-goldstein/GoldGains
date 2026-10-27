import { addDays, today, type DayKey } from '@/domain/day';
import { nutrientsFor, pickCore, type Food, type FoodCore } from '@/domain/food';
import { DEFAULT_PROFILE, budgetFor, macroGrams, MACRO_PRESETS, type Profile } from '@/domain/profile';
import {
  db,
  DEFAULT_SETTINGS,
  uid,
  type Entry,
  type Exercise,
  type Goals,
  type MealKey,
  type SavedMeal,
  type Settings,
  type WeightLog,
} from './schema';

// ── settings & profile ──────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.kv.put({ key: 'settings', value: { ...cur, ...patch } });
}

export async function getProfile(): Promise<Profile> {
  const row = await db.kv.get('profile');
  return { ...DEFAULT_PROFILE, ...(row?.value as Partial<Profile> | undefined) };
}

/** Save personal info and re-derive today's goals (unless calories are manually overridden). */
export async function saveProfile(p: Profile): Promise<void> {
  await db.transaction('rw', db.kv, db.goals, async () => {
    await db.kv.put({ key: 'profile', value: p });
    const cur = await goalFor(today());
    await saveGoals(deriveGoals(p, cur));
  });
}

// ── goals ───────────────────────────────────────────────────────────────────

export function deriveGoals(p: Profile, prev?: Partial<Goals>): Omit<Goals, 'id' | 'effectiveFrom' | 'createdAt'> {
  const split = prev?.split ?? MACRO_PRESETS[0]!.split;
  const calories = prev?.caloriesOverride ?? budgetFor(p).budget;
  const g = macroGrams(calories, split);
  return {
    calories,
    caloriesOverride: prev?.caloriesOverride ?? null,
    split,
    presetId: prev?.presetId ?? MACRO_PRESETS[0]!.id,
    ...g,
    // Dietary Guidelines: 14 g fiber per 1,000 kcal; added sugar and sat fat under 10% of calories
    fiberMin: Math.round((calories / 1000) * 14),
    addedSugarMax: Math.round((calories * 0.1) / 4),
    satFatMax: Math.round((calories * 0.1) / 9),
    sodiumMax: prev?.sodiumMax ?? 2300,
    waterMl: prev?.waterMl ?? 2500,
  };
}

/** The goal record in force on `date` (latest effectiveFrom ≤ date; else the earliest one). */
export function pickGoal(all: Goals[], date: DayKey): Goals | undefined {
  let best: Goals | undefined;
  let earliest: Goals | undefined;
  for (const g of all) {
    if (!earliest || g.effectiveFrom < earliest.effectiveFrom) earliest = g;
    if (g.effectiveFrom <= date && (!best || g.effectiveFrom > best.effectiveFrom)) best = g;
  }
  return best ?? earliest;
}

export async function goalFor(date: DayKey): Promise<Goals | undefined> {
  return pickGoal(await db.goals.toArray(), date);
}

/** Goals changed today apply from today on; past days keep the goals they were logged against. */
export async function saveGoals(g: Omit<Goals, 'id' | 'effectiveFrom' | 'createdAt'>): Promise<void> {
  const d = today();
  const existing = await db.goals.where('effectiveFrom').equals(d).first();
  if (existing) await db.goals.put({ ...existing, ...g });
  else await db.goals.add({ ...g, id: uid(), effectiveFrom: d, createdAt: Date.now() });
}

export async function ensureGoals(): Promise<void> {
  if ((await db.goals.count()) > 0) return;
  const p = await getProfile();
  await db.goals.add({ ...deriveGoals(p), id: uid(), effectiveFrom: addDays(today(), -3650), createdAt: Date.now() });
}

// ── food log ────────────────────────────────────────────────────────────────

export async function logFood(args: {
  date: DayKey;
  meal: MealKey;
  food: FoodCore;
  foodId?: string;
  amount: number;
  unit: string;
}): Promise<string> {
  const core = pickCore(args.food);
  const entry: Entry = {
    id: uid(),
    date: args.date,
    meal: args.meal,
    food: core,
    amount: args.amount,
    unit: args.unit,
    nutrients: nutrientsFor(core, args.amount, args.unit),
    createdAt: Date.now(),
  };
  if (args.foodId) entry.foodId = args.foodId;
  await db.transaction('rw', db.entries, db.foods, async () => {
    await db.entries.add(entry);
    if (args.foodId) {
      await db.foods.where('id').equals(args.foodId).modify((f) => {
        f.useCount = (f.useCount ?? 0) + 1;
        f.lastUsedAt = Date.now();
        f.lastAmount = args.amount;
        f.lastUnit = args.unit;
      });
    }
  });
  return entry.id;
}

export async function updateEntry(id: string, patch: { amount?: number; unit?: string; meal?: MealKey; date?: DayKey }): Promise<void> {
  const e = await db.entries.get(id);
  if (!e) return;
  const next = { ...e, ...patch };
  next.nutrients = nutrientsFor(next.food, next.amount, next.unit);
  await db.entries.put(next);
}

export async function deleteEntry(id: string): Promise<Entry | undefined> {
  const e = await db.entries.get(id);
  if (e) await db.entries.delete(id);
  return e;
}

export async function restore<T extends { id: string }>(table: 'entries' | 'exercises', row: T): Promise<void> {
  await (db[table] as unknown as { put: (r: T) => Promise<unknown> }).put(row);
}

export async function copyMeal(fromDate: DayKey, meal: MealKey, toDate: DayKey, toMeal: MealKey = meal): Promise<number> {
  const rows = await db.entries.where('[date+meal]').equals([fromDate, meal]).toArray();
  const now = Date.now();
  await db.entries.bulkAdd(rows.map((r, i) => ({ ...r, id: uid(), date: toDate, meal: toMeal, createdAt: now + i })));
  return rows.length;
}

// ── foods ───────────────────────────────────────────────────────────────────

export async function saveFood(f: Omit<Food, 'id' | 'createdAt' | 'updatedAt' | 'favorite' | 'useCount'> & Partial<Food>): Promise<Food> {
  const now = Date.now();
  // one row per barcode / source ref so rescans and re-searches reuse it
  let existing: Food | undefined;
  if (f.id) existing = await db.foods.get(f.id);
  if (!existing && f.barcode) existing = await db.foods.where('barcode').equals(f.barcode).first();
  if (!existing && f.ref && f.source !== 'custom') existing = await db.foods.where('ref').equals(f.ref).filter((x) => x.source === f.source).first();
  const row: Food = {
    favorite: 0,
    useCount: 0,
    ...existing,
    ...f,
    id: existing?.id || f.id || uid(),
    createdAt: existing?.createdAt || f.createdAt || now,
    updatedAt: now,
  };
  if (existing) {
    row.favorite = existing.favorite;
    row.useCount = existing.useCount;
    if (existing.lastUsedAt) row.lastUsedAt = existing.lastUsedAt;
  }
  await db.foods.put(row);
  return row;
}

export async function toggleFavorite(id: string): Promise<void> {
  await db.foods.where('id').equals(id).modify((f) => {
    f.favorite = f.favorite ? 0 : 1;
  });
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

// ── saved meals ─────────────────────────────────────────────────────────────

export async function saveMealFromEntries(name: string, entries: Entry[]): Promise<void> {
  const meal: SavedMeal = {
    id: uid(),
    name,
    items: entries.map((e) => ({ ...(e.foodId ? { foodId: e.foodId } : {}), food: e.food, amount: e.amount, unit: e.unit })),
    createdAt: Date.now(),
  };
  await db.savedMeals.add(meal);
}

export async function logSavedMeal(m: SavedMeal, date: DayKey, meal: MealKey): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.entries, db.savedMeals, async () => {
    await db.entries.bulkAdd(
      m.items.map((it, i) => {
        const e: Entry = {
          id: uid(),
          date,
          meal,
          food: it.food,
          amount: it.amount,
          unit: it.unit,
          nutrients: nutrientsFor(it.food, it.amount, it.unit),
          createdAt: now + i,
        };
        if (it.foodId) e.foodId = it.foodId;
        return e;
      }),
    );
    await db.savedMeals.update(m.id, { lastUsedAt: now });
  });
}

// ── exercise ────────────────────────────────────────────────────────────────

export async function saveExercise(x: Omit<Exercise, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<void> {
  await db.exercises.put({ ...x, id: x.id ?? uid(), createdAt: x.createdAt ?? Date.now() });
}

export async function deleteExercise(id: string): Promise<Exercise | undefined> {
  const x = await db.exercises.get(id);
  if (x) await db.exercises.delete(id);
  return x;
}

// ── body weight ─────────────────────────────────────────────────────────────

export async function logWeight(date: DayKey, kg: number): Promise<void> {
  await db.transaction('rw', db.weights, db.kv, db.goals, async () => {
    const same = await db.weights.where('date').equals(date).first();
    const row: WeightLog = { id: same?.id ?? uid(), date, kg, createdAt: Date.now() };
    await db.weights.put(row);
    const latest = await db.weights.orderBy('date').last();
    if (latest && latest.id === row.id) {
      const p = await getProfile();
      await saveProfile({ ...p, weightKg: kg });
    }
  });
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weights.delete(id);
}

// ── water ───────────────────────────────────────────────────────────────────

export async function addWater(date: DayKey, deltaMl: number): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const d = await db.days.get(date);
    const next = Math.max(0, (d?.waterMl ?? 0) + deltaMl);
    await db.days.put({ ...(d ?? { date }), date, waterMl: next });
  });
}
