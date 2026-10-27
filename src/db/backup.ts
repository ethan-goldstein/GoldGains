import { db } from './schema';

export type { Backup } from './backup-schema';
import type { Backup } from './backup-schema';

export async function exportBackup(): Promise<Backup> {
  const [foods, entries, exercises, savedMeals, weights, goalsRows, days, p, s] = await Promise.all([
    db.foods.toArray(),
    db.entries.toArray(),
    db.exercises.toArray(),
    db.savedMeals.toArray(),
    db.weights.toArray(),
    db.goals.toArray(),
    db.days.toArray(),
    db.kv.get('profile'),
    db.kv.get('settings'),
  ]);
  return {
    app: 'goldgains',
    version: 1,
    exportedAt: Date.now(),
    tables: {
      foods,
      entries,
      exercises,
      savedMeals,
      weights,
      goals: goalsRows,
      days,
      profile: (p?.value as Backup['tables']['profile']) ?? null,
      settings: (s?.value as Backup['tables']['settings']) ?? null,
    },
  };
}

export function backupFilename(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `goldgains-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  ok: boolean;
  message: string;
  counts?: Record<string, number>;
}

/** Validate untrusted backup JSON, then merge (by id) or replace. Nothing is written if validation fails. */
export async function importBackup(raw: string, mode: ImportMode): Promise<ImportResult> {
  if (raw.length > 80 * 1024 * 1024) return { ok: false, message: 'That file is too large to be a GoldGains backup.' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'That file isn’t valid JSON.' };
  }
  const { backupSchema } = await import('./backup-schema');
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `Not a valid GoldGains backup${issue ? ` (${issue.path.slice(0, 3).join('.')})` : ''}.` };
  }
  const t = parsed.data.tables;
  // keep this device's onboarding/lens state; everything else comes from the file
  const curSettings = await db.kv.get('settings');
  await db.transaction('rw', [db.foods, db.entries, db.exercises, db.savedMeals, db.weights, db.goals, db.days, db.kv], async () => {
    if (mode === 'replace') {
      await Promise.all([db.foods.clear(), db.entries.clear(), db.exercises.clear(), db.savedMeals.clear(), db.weights.clear(), db.goals.clear(), db.days.clear()]);
    }
    await db.foods.bulkPut(t.foods);
    await db.entries.bulkPut(t.entries);
    await db.exercises.bulkPut(t.exercises);
    await db.savedMeals.bulkPut(t.savedMeals);
    await db.weights.bulkPut(t.weights);
    await db.goals.bulkPut(t.goals);
    await db.days.bulkPut(t.days);
    if (t.profile) await db.kv.put({ key: 'profile', value: t.profile });
    if (t.settings) {
      const keep = (curSettings?.value ?? {}) as Record<string, unknown>;
      await db.kv.put({ key: 'settings', value: { ...keep, ...t.settings, onboarded: true, lensDeviceId: keep.lensDeviceId } as never });
    }
  });
  return {
    ok: true,
    message: mode === 'replace' ? 'Backup restored.' : 'Backup merged.',
    counts: { foods: t.foods.length, entries: t.entries.length, workouts: t.exercises.length, weights: t.weights.length },
  };
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', [db.foods, db.entries, db.exercises, db.savedMeals, db.weights, db.goals, db.days, db.kv], async () => {
    await Promise.all([db.foods.clear(), db.entries.clear(), db.exercises.clear(), db.savedMeals.clear(), db.weights.clear(), db.goals.clear(), db.days.clear(), db.kv.clear()]);
  });
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean | undefined> {
  if (!navigator.storage?.persist) return undefined;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return undefined;
  }
}
