import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { DayKey } from '@/domain/day';
import { total, type Totals } from '@/domain/math';
import { DEFAULT_PROFILE, type Profile } from '@/domain/profile';
import { pickGoal } from './repo';
import { db, DEFAULT_SETTINGS, MEALS, type Entry, type Exercise, type Goals, type MealKey, type Settings } from './schema';

export function useSettings(): Settings {
  const row = useLiveQuery(() => db.kv.get('settings'), []);
  return useMemo(() => ({ ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) }), [row]);
}

/** undefined while loading, so screens can tell "not loaded" from "defaults" */
export function useSettingsLoaded(): Settings | undefined {
  const row = useLiveQuery(async () => (await db.kv.get('settings')) ?? null, []);
  return useMemo(() => (row === undefined ? undefined : { ...DEFAULT_SETTINGS, ...(row?.value as Partial<Settings> | undefined) }), [row]);
}

export function useProfile(): Profile {
  const row = useLiveQuery(() => db.kv.get('profile'), []);
  return useMemo(() => ({ ...DEFAULT_PROFILE, ...(row?.value as Partial<Profile> | undefined) }), [row]);
}

export function useAllGoals(): Goals[] {
  return useLiveQuery(() => db.goals.toArray(), []) ?? [];
}

export function useGoalFor(date: DayKey): Goals | undefined {
  const all = useAllGoals();
  return useMemo(() => pickGoal(all, date), [all, date]);
}

export interface DayData {
  entries: Entry[];
  byMeal: Record<MealKey, Entry[]>;
  mealTotals: Record<MealKey, Totals>;
  food: Totals;
  exercises: Exercise[];
  exerciseKcal: number;
  waterMl: number;
  loaded: boolean;
}

export function useDay(date: DayKey): DayData {
  const entries = useLiveQuery(() => db.entries.where('date').equals(date).sortBy('createdAt'), [date]);
  const exercises = useLiveQuery(() => db.exercises.where('date').equals(date).sortBy('createdAt'), [date]);
  const meta = useLiveQuery(() => db.days.get(date), [date]);
  return useMemo(() => {
    const list = entries ?? [];
    const byMeal = Object.fromEntries(MEALS.map((m) => [m, list.filter((e) => e.meal === m)])) as Record<MealKey, Entry[]>;
    const mealTotals = Object.fromEntries(MEALS.map((m) => [m, total(byMeal[m].map((e) => e.nutrients))])) as Record<MealKey, Totals>;
    const ex = exercises ?? [];
    return {
      entries: list,
      byMeal,
      mealTotals,
      food: total(list.map((e) => e.nutrients)),
      exercises: ex,
      exerciseKcal: ex.reduce((a, x) => a + x.kcal, 0),
      waterMl: meta?.waterMl ?? 0,
      loaded: entries !== undefined && exercises !== undefined,
    };
  }, [entries, exercises, meta]);
}

export interface DaySummary {
  date: DayKey;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  exerciseKcal: number;
  entries: number;
}

/** Per-day totals for a date range (inclusive), for the calendar and trends. */
export function useRange(from: DayKey, to: DayKey): Map<DayKey, DaySummary> | undefined {
  const entries = useLiveQuery(() => db.entries.where('date').between(from, to, true, true).toArray(), [from, to]);
  const exercises = useLiveQuery(() => db.exercises.where('date').between(from, to, true, true).toArray(), [from, to]);
  return useMemo(() => {
    if (!entries || !exercises) return undefined;
    const map = new Map<DayKey, DaySummary>();
    const get = (d: DayKey) => {
      let s = map.get(d);
      if (!s) {
        s = { date: d, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, exerciseKcal: 0, entries: 0 };
        map.set(d, s);
      }
      return s;
    };
    for (const e of entries) {
      const s = get(e.date);
      s.kcal += e.nutrients.kcal ?? 0;
      s.protein += e.nutrients.protein ?? 0;
      s.carbs += e.nutrients.carbs ?? 0;
      s.fat += e.nutrients.fat ?? 0;
      s.fiber += e.nutrients.fiber ?? 0;
      s.entries += 1;
    }
    for (const x of exercises) get(x.date).exerciseKcal += x.kcal;
    return map;
  }, [entries, exercises]);
}

/** Budget for a day: goal calories plus exercise when that setting is on. */
export function dayBudget(goal: Goals | undefined, exerciseKcal: number, settings: Settings): { base: number; budget: number } {
  const base = goal?.calories ?? 2000;
  return { base, budget: base + (settings.exerciseAddsToBudget ? exerciseKcal : 0) };
}
