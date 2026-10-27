import { addDays, type DayKey } from './day';
import type { Nutrients } from './nutrients';

export interface ScoreTargets {
  budget: number;
  protein: number;
  fiberMin: number;
  addedSugarMax: number;
  sodiumMax: number;
}

export interface ScorePart {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

/**
 * Gains Score (0–100): how well a day hit the plan. Calories within 10% of budget,
 * protein near target, enough fiber, added sugar and sodium under their limits.
 */
export function gainsScore(n: Nutrients, t: ScoreTargets): { score: number; grade: string; parts: ScorePart[] } {
  const kcal = n.kcal ?? 0;
  const parts: ScorePart[] = [];

  const off = t.budget > 0 ? Math.abs(kcal - t.budget) / t.budget : 1;
  const kcalPts = off <= 0.1 ? 35 : off >= 0.4 ? 0 : Math.round(35 * (1 - (off - 0.1) / 0.3));
  parts.push({ key: 'kcal', label: 'Calories on budget', points: kcalPts, max: 35, detail: `${Math.round(off * 100)}% from budget` });

  const pr = t.protein > 0 ? (n.protein ?? 0) / t.protein : 0;
  const prPts = Math.round(30 * Math.min(1, pr / 0.9));
  parts.push({ key: 'protein', label: 'Protein', points: prPts, max: 30, detail: `${Math.round(pr * 100)}% of target` });

  const fb = t.fiberMin > 0 ? (n.fiber ?? 0) / t.fiberMin : 0;
  const fbPts = Math.round(15 * Math.min(1, fb / 0.8));
  parts.push({ key: 'fiber', label: 'Fiber', points: fbPts, max: 15, detail: `${Math.round(fb * 100)}% of goal` });

  const sug = n.addedSugars;
  const sugPts = sug === undefined ? 10 : sug <= t.addedSugarMax ? 10 : Math.max(0, Math.round(10 * (1 - (sug - t.addedSugarMax) / t.addedSugarMax)));
  parts.push({ key: 'sugar', label: 'Added sugar in check', points: sugPts, max: 10, detail: sug === undefined ? 'not tracked today' : `${Math.round(sug)} / ${t.addedSugarMax} g` });

  const na = n.sodium;
  const naPts = na === undefined ? 10 : na <= t.sodiumMax ? 10 : Math.max(0, Math.round(10 * (1 - (na - t.sodiumMax) / t.sodiumMax)));
  parts.push({ key: 'sodium', label: 'Sodium in check', points: naPts, max: 10, detail: na === undefined ? 'not tracked today' : `${Math.round(na)} / ${t.sodiumMax} mg` });

  const score = parts.reduce((a, p) => a + p.points, 0);
  return { score, grade: grade(score), parts };
}

export function grade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 78) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** Consecutive logged days ending today (or yesterday, so an unlogged morning doesn't zero it). */
export function streak(loggedDays: Set<DayKey>, todayKey: DayKey): number {
  let d = loggedDays.has(todayKey) ? todayKey : addDays(todayKey, -1);
  let n = 0;
  while (loggedDays.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
