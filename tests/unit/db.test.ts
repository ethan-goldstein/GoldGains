import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup, resetAll } from '@/db/backup';
import { copyMeal, deleteEntry, ensureGoals, goalFor, logFood, pickGoal, saveFood, saveProfile, updateEntry } from '@/db/repo';
import { db, type Goals } from '@/db/schema';
import { DEFAULT_PROFILE } from '@/domain/profile';
import { today } from '@/domain/day';

beforeEach(async () => {
  await resetAll();
});

const bar = { name: 'Protein bar', serving: { qty: 1, unit: 'bar', grams: 60 }, nutrients: { kcal: 210, protein: 20, carbs: 23, fat: 7 } };

describe('food log', () => {
  it('logs, edits and deletes entries with a frozen copy of the food', async () => {
    const food = await saveFood({ source: 'custom', ...bar });
    const id = await logFood({ date: '2026-10-27', meal: 'snacks', food, foodId: food.id, amount: 2, unit: 'serving' });
    let e = await db.entries.get(id);
    expect(e?.nutrients.kcal).toBe(420);
    // editing the food later must not change the logged entry
    await saveFood({ ...food, nutrients: { kcal: 999 } });
    e = await db.entries.get(id);
    expect(e?.nutrients.kcal).toBe(420);
    await updateEntry(id, { amount: 30, unit: 'g' });
    expect((await db.entries.get(id))?.nutrients.protein).toBe(10);
    const f = await db.foods.get(food.id);
    expect(f?.useCount).toBe(1);
    expect(f?.lastUnit).toBe('serving');
    await deleteEntry(id);
    expect(await db.entries.count()).toBe(0);
  });

  it('dedupes foods by barcode', async () => {
    const a = await saveFood({ source: 'off', barcode: '0016000275287', ...bar });
    const b = await saveFood({ source: 'off', barcode: '0016000275287', ...bar, name: 'Renamed' });
    expect(a.id).toBe(b.id);
    expect(await db.foods.count()).toBe(1);
  });

  it('copies a meal to another day', async () => {
    await logFood({ date: '2026-10-26', meal: 'breakfast', food: bar, amount: 1, unit: 'serving' });
    await logFood({ date: '2026-10-26', meal: 'breakfast', food: bar, amount: 1, unit: 'serving' });
    expect(await copyMeal('2026-10-26', 'breakfast', '2026-10-27')).toBe(2);
    expect(await db.entries.where('date').equals('2026-10-27').count()).toBe(2);
  });
});

describe('goals over time', () => {
  it('picks the goal in force on each date', () => {
    const g = (effectiveFrom: string, calories: number) => ({ id: effectiveFrom, effectiveFrom, calories }) as Goals;
    const all = [g('2026-01-01', 2500), g('2026-06-01', 2200)];
    expect(pickGoal(all, '2026-03-01')?.calories).toBe(2500);
    expect(pickGoal(all, '2026-07-01')?.calories).toBe(2200);
    expect(pickGoal(all, '2025-12-01')?.calories).toBe(2500);
  });
  it('profile changes create goals from today on', async () => {
    await ensureGoals();
    await saveProfile({ ...DEFAULT_PROFILE, plan: 'lose', pace: 1 });
    const g = await goalFor(today());
    expect(g?.effectiveFrom).toBe(today());
    expect(g!.protein * 4 + g!.carbs * 4 + g!.fat * 9).toBeGreaterThan(g!.calories - 20);
  });
});

describe('backup', () => {
  it('round-trips everything', async () => {
    await ensureGoals();
    await logFood({ date: '2026-10-27', meal: 'lunch', food: bar, amount: 1, unit: 'serving' });
    const data = await exportBackup();
    await resetAll();
    const r = await importBackup(JSON.stringify(data), 'replace');
    expect(r.ok).toBe(true);
    expect(await db.entries.count()).toBe(1);
    expect(await db.goals.count()).toBe(1);
  });
  it('rejects malformed or hostile files without writing anything', async () => {
    await logFood({ date: '2026-10-27', meal: 'lunch', food: bar, amount: 1, unit: 'serving' });
    expect((await importBackup('not json', 'replace')).ok).toBe(false);
    expect((await importBackup(JSON.stringify({ app: 'other' }), 'replace')).ok).toBe(false);
    const bad = await exportBackup();
    (bad.tables.entries[0] as unknown as { date: string }).date = '<script>';
    expect((await importBackup(JSON.stringify(bad), 'replace')).ok).toBe(false);
    expect(await db.entries.count()).toBe(1);
  });
});
