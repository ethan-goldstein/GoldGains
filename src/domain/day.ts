// Days are keyed by the phone's local calendar date as 'YYYY-MM-DD'. Never use toISOString()
// for this: it is UTC and would file a 9 pm dinner under tomorrow.

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date = new Date()): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDay(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12); // noon dodges DST edges
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export const today = () => dayKey();

export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

/** Sunday-start week containing `key` */
export function weekOf(key: DayKey): DayKey[] {
  const d = parseDay(key);
  const start = addDays(key, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function range(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/** 6×7 grid of day keys for a month view, padded with neighbouring months */
export function monthGrid(year: number, month: number): DayKey[] {
  const first = new Date(year, month, 1, 12);
  const start = addDays(dayKey(first), -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function relativeLabel(key: DayKey): string {
  const diff = daysBetween(today(), key);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return parseDay(key).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export const shortDate = (key: DayKey) => parseDay(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const weekdayLetter = (key: DayKey) => parseDay(key).toLocaleDateString(undefined, { weekday: 'narrow' });
export const weekdayShort = (key: DayKey) => parseDay(key).toLocaleDateString(undefined, { weekday: 'short' });
