import type { Food, Portion } from '@/domain/food';
import type { Nutrients } from '@/domain/nutrients';

interface GenericRow {
  id: string;
  n: string;
  a?: string;
  p: [string, number][];
  v: Nutrients;
}

let generic: Food[] | null = null;

/** USDA everyday foods, bundled with the app and loaded on first search. */
export async function loadGeneric(): Promise<Food[]> {
  if (generic) return generic;
  const rows = (await import('@/data/generic-foods.json')).default as unknown as GenericRow[];
  generic = rows.map((r) => {
    const portions: Portion[] = r.p.map(([label, grams]) => ({ label, grams }));
    const f: Food & { aliases?: string } = {
      id: r.id,
      source: 'usda',
      ref: r.id,
      name: r.n,
      serving: { qty: 100, unit: 'g', grams: 100 },
      nutrients: r.v,
      portions,
      favorite: 0,
      useCount: 0,
      createdAt: 0,
      updatedAt: 0,
    };
    if (r.a) f.aliases = r.a;
    return f;
  });
  return generic;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Rank foods for a query. Every query word must prefix-match some word in the name,
 * brand or aliases; earlier and whole-word hits score higher, as do foods you use.
 */
export function rank<T extends Food & { aliases?: string }>(foods: T[], query: string, limit = 40): T[] {
  const q = norm(query);
  if (!q) return [];
  const terms = q.split(' ');
  const scored: { f: T; s: number }[] = [];
  for (const f of foods) {
    const name = norm(f.name);
    const hay = `${name} ${norm(f.brand ?? '')} ${norm(f.aliases ?? '')}`;
    const words = hay.split(' ');
    let s = 0;
    let ok = true;
    for (const t of terms) {
      let best = 0;
      for (let i = 0; i < words.length; i++) {
        const w = words[i]!;
        if (w === t) best = Math.max(best, i < name.split(' ').length ? 10 - Math.min(i, 5) : 4);
        else if (w.startsWith(t)) best = Math.max(best, i < name.split(' ').length ? 6 - Math.min(i, 4) : 2);
      }
      if (!best) {
        ok = false;
        break;
      }
      s += best;
    }
    if (!ok) continue;
    if (name.startsWith(q)) s += 8;
    s += Math.min(6, (f.useCount ?? 0) * 1.5) + (f.favorite ? 4 : 0);
    s -= name.length / 40;
    scored.push({ f, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.f);
}
