import { bestSet, est1RM, type LiftLog } from '@/domain/exercise';
import { db, type Exercise } from '@/db/schema';

export interface LiftRecord {
  liftId: string;
  name: string;
  unit: 'lb' | 'kg';
  e1rm: number;
  best: { reps: number; weight: number };
  date: string;
  sessions: number;
}

const KG_LB = 2.20462;
export const toUnit = (w: number, from: 'lb' | 'kg', to: 'lb' | 'kg') => (from === to ? w : from === 'kg' ? w * KG_LB : w / KG_LB);

/** Best estimated 1RM per lift across all strength sessions, in the user's unit. */
export function liftRecords(sessions: Exercise[], unit: 'lb' | 'kg'): Map<string, LiftRecord> {
  const map = new Map<string, LiftRecord>();
  for (const x of sessions) {
    for (const l of x.lifts ?? []) {
      const b = bestSet(l.sets);
      const key = l.liftId || l.name.toLowerCase();
      const cur = map.get(key);
      const e = b ? toUnit(b.e1rm, l.unit, unit) : 0;
      if (!cur) {
        map.set(key, {
          liftId: key,
          name: l.name,
          unit,
          e1rm: e,
          best: b ? { reps: b.set.reps, weight: toUnit(b.set.weight, l.unit, unit) } : { reps: 0, weight: 0 },
          date: x.date,
          sessions: 1,
        });
      } else {
        cur.sessions += 1;
        if (e > cur.e1rm && b) {
          cur.e1rm = e;
          cur.best = { reps: b.set.reps, weight: toUnit(b.set.weight, l.unit, unit) };
          cur.date = x.date;
        }
      }
    }
  }
  return map;
}

/** The most recent logged sets for a lift before `beforeDate` (for "last time" hints). */
export async function lastLift(liftKey: string, excludeId?: string): Promise<{ date: string; log: LiftLog } | undefined> {
  const rows = (await db.exercises.where('kind').equals('strength').sortBy('date')).reverse();
  for (const x of rows) {
    if (x.id === excludeId) continue;
    const l = x.lifts?.find((y) => (y.liftId || y.name.toLowerCase()) === liftKey);
    if (l && l.sets.length) return { date: x.date, log: l };
  }
  return undefined;
}

export function isPR(weight: number, reps: number, unit: 'lb' | 'kg', record: LiftRecord | undefined): boolean {
  if (!record || weight <= 0 || reps <= 0) return false;
  return toUnit(est1RM(weight, reps), unit, record.unit) > record.e1rm + 0.01;
}
