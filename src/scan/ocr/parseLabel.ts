// Turns OCR text from a US "Nutrition Facts" panel into nutrient amounts.
// Built to survive Tesseract's usual mistakes: O↔0, l/I/|↔1, S↔5, B↔8, "rng" for mg,
// a "g" read as 9 ("8g" → "89"), labels split across lines, and two-column panels.
// The printed %DV is used as a cross-check to pick between ambiguous readings.

import { NUTRIENTS, type NutrientKey, type Nutrients } from '@/domain/nutrients';
import { parseServingText } from '@/sources/off';

export interface ParsedLabel {
  nutrients: Nutrients;
  serving?: { qty: number; unit: string; grams?: number };
  servingsPerContainer?: number;
  /** keys the user should double-check (nutrient keys, 'serving', 'grams') */
  flagged: string[];
  warnings: string[];
  found: number;
}

type LabelUnit = 'g' | 'mg' | 'mcg';

interface Spec {
  key: NutrientKey;
  re: RegExp;
  /** skip a match when the text right after it matches this */
  notAfter?: RegExp;
  /** skip a match when the text right before it matches this */
  notBefore?: RegExp;
}

const V = String.raw`vit(?:amin|\.)?\s*`;

// Order matters only for readability; matching picks the earliest valid hit for each key.
const SPECS: Spec[] = [
  { key: 'satFat', re: /\bsat(?:urated|\.)?\s*fat\b/g },
  { key: 'transFat', re: /\btrans\s*fat\b/g },
  { key: 'polyFat', re: /\bpoly\s*-?\s*unsaturated(?:\s*fat)?\b/g },
  { key: 'monoFat', re: /\bmono\s*-?\s*unsaturated(?:\s*fat)?\b/g },
  { key: 'fat', re: /\b(?:tota[l1i]\s*)?fat\b/g, notBefore: /(sat(urated|\.)?|trans|unsaturated|from|per gram:?)\s*$/ },
  { key: 'cholesterol', re: /\bcho[l1i]est[eo]r[o0][l1i]\b/g },
  { key: 'sodium', re: /\bs?od[il1]um\b/g },
  { key: 'carbs', re: /\b(?:tota[l1i]\s*)?carb(?:[o0]hydrates?|s|\.)?/g, notBefore: /per gram:?\s*$/ },
  { key: 'fiber', re: /\b(?:dietary\s*)?fib(?:er|re)\b/g, notBefore: /(soluble|insoluble)\s*$/ },
  { key: 'sugarAlcohols', re: /\bsugar\s*a[l1]coho[l1]s?\b|\bpolyols\b/g },
  { key: 'sugars', re: /\b(?:tota[l1i]\s*)?sugars?\b/g, notAfter: /^\s*a[l1]coho/, notBefore: /(added|includes\s*[\d.]+\s*g?)\s*$/ },
  { key: 'addedSugars', re: /\badded\s*sugars?\b/g },
  { key: 'protein', re: /\bp?r[o0]te[il1]n\b/g, notBefore: /per gram:?.{0,20}$/ },
  { key: 'vitD', re: new RegExp(`\\b${V}d\\b`, 'g') },
  { key: 'vitA', re: new RegExp(`\\b${V}a\\b`, 'g') },
  { key: 'vitC', re: new RegExp(`\\b${V}c\\b`, 'g') },
  { key: 'vitB12', re: new RegExp(`\\b${V}b\\s*-?\\s*12\\b`, 'g') },
  { key: 'calcium', re: /\bca[l1i]c[il1]um\b/g },
  { key: 'iron', re: /\b[il1]r[o0]n\b/g },
  { key: 'potassium', re: /\bp[o0]tass[il1]um\b/g },
  { key: 'magnesium', re: /\bmagnes[il1]um\b/g },
  { key: 'zinc', re: /\bz[il1]nc\b/g },
  { key: 'folate', re: /\bfo[l1]ate\b|\bfo[l1]ic\s*acid\b/g },
  { key: 'caffeine', re: /\bcaffeine\b/g },
];

const CAL_RE = /\bca[l1i]{1,2}[o0]r[il1]es\b/g;
const CAL_SKIP_AFTER = /^\s*(from|per\s*gram|a\s*day|diet)/;

// ── text cleanup ────────────────────────────────────────────────────────────

const DIGITISH: Record<string, string> = { o: '0', O: '0', D: '0', l: '1', I: '1', i: '1', '|': '1', '!': '1', S: '5', s: '5', B: '8', Z: '2', z: '2' };

function fixNumber(raw: string): string {
  let t = raw.replace(/[oODlIi|!SsBZz]/g, (c) => DIGITISH[c] ?? c);
  // 1,200 → 1200 ; 0,5 → 0.5
  t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  return t;
}

export function normalizeOcr(raw: string): string {
  let t = raw.replace(/\r/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  // "Protein20g" → "Protein 20g" (only after a real word, so "S0mg" stays fixable)
  t = t.replace(/([a-z]{3,})(\d)/gi, '$1 $2');
  // unit misreads
  t = t.replace(/(\d|[oOlI|])\s?(?:rng|rnq|mq|nng)\b/g, '$1mg').replace(/(\d|[oOlI|])\s?(?:meg|mcq|rncg|µg|ug)\b/g, '$1mcg');
  // number-ish tokens directly before a unit: "Og", "lg", "1Omg", "S.5g"
  t = t.replace(/(^|[^a-z0-9])([0-9oODlIi|!SsBZz.,]{1,7})\s?(mcg|mg|g)\b/gi, (m, pre: string, num: string, unit: string) => {
    if (!/\d/.test(num) && !/^[oODlI|]$/.test(num)) return m; // a word, not a number
    return `${pre}${fixNumber(num)}${unit.toLowerCase()}`;
  });
  // percentages: "1O%" → "10%"
  t = t.replace(/(^|[^a-z0-9])([0-9oOlI|SB]{1,3})\s?%/g, (m, pre: string, num: string) => (/\d/.test(num) ? `${pre}${fixNumber(num)}%` : m));
  return t.toLowerCase().replace(/[ \t]+/g, ' ');
}

// ── matching ────────────────────────────────────────────────────────────────

interface Hit {
  key: NutrientKey | 'kcal';
  start: number;
  end: number;
}

function findHits(t: string): Hit[] {
  const hits: Hit[] = [];
  for (const m of t.matchAll(CAL_RE)) {
    const after = t.slice(m.index! + m[0].length, m.index! + m[0].length + 14);
    if (CAL_SKIP_AFTER.test(after)) continue;
    hits.push({ key: 'kcal', start: m.index!, end: m.index! + m[0].length });
  }
  for (const s of SPECS) {
    s.re.lastIndex = 0;
    for (const m of t.matchAll(s.re)) {
      const start = m.index!;
      const end = start + m[0].length;
      if (s.notAfter && s.notAfter.test(t.slice(end, end + 12))) continue;
      if (s.notBefore && s.notBefore.test(t.slice(Math.max(0, start - 24), start))) continue;
      hits.push({ key: s.key, start, end });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  // drop hits nested inside an earlier, longer hit ("total fat" inside "saturated fat" etc.)
  const out: Hit[] = [];
  for (const h of hits) {
    const prev = out.at(-1);
    if (prev && h.start < prev.end) continue;
    out.push(h);
  }
  return out;
}

const AMOUNT = /(<|less than)?\s*(\d+(?:\.\d+)?)\s*(mcg|mg|g)\b/;
const PCT = /(\d{1,3})\s*%/;
const BARE = /(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/;

const UNIT_OF = (k: NutrientKey): LabelUnit => {
  const u = NUTRIENTS[k].unit;
  return u === 'µg' ? 'mcg' : u === 'mg' ? 'mg' : 'g';
};

function convert(value: number, from: LabelUnit, to: LabelUnit): number {
  const f = { g: 1, mg: 1e-3, mcg: 1e-6 };
  return (value * f[from]) / f[to];
}

function pctMatches(amount: number, dv: number, printed: number): boolean {
  const pct = (amount / dv) * 100;
  return Math.abs(pct - printed) <= Math.max(2.5, printed * 0.3);
}

// ── main ────────────────────────────────────────────────────────────────────

export function parseLabel(raw: string, lowConfidence: Set<string> = new Set()): ParsedLabel {
  const t = normalizeOcr(raw);
  const out: ParsedLabel = { nutrients: {}, flagged: [], warnings: [], found: 0 };
  const flag = (k: string) => {
    if (!out.flagged.includes(k)) out.flagged.push(k);
  };

  // "Includes 10g Added Sugars" — the number comes before the label
  const inc = t.match(/\bincludes?\s*(<\s*)?(\d+(?:\.\d+)?)\s*g\s*(?:of\s*)?added\s*sugars?/);
  if (inc) {
    out.nutrients.addedSugars = inc[1] ? Number(inc[2]) / 2 : Number(inc[2]);
    if (inc[1]) flag('addedSugars');
  }

  const hits = findHits(t);
  const seen = new Set<string>();
  hits.forEach((h, i) => {
    if (seen.has(h.key)) return;
    const next = hits[i + 1];
    let windowEnd = Math.min(t.length, h.end + 90, next ? next.start : t.length);
    // don't run more than one line past the label
    const nl1 = t.indexOf('\n', h.end);
    const nl2 = nl1 >= 0 ? t.indexOf('\n', nl1 + 1) : -1;
    if (nl2 >= 0) windowEnd = Math.min(windowEnd, nl2);
    const win = t.slice(h.end, windowEnd);

    if (h.key === 'kcal') {
      const m = win.match(/(\d{1,4})/);
      if (m) {
        out.nutrients.kcal = Number(m[1]);
        seen.add('kcal');
        if (lowConfidence.has(m[1]!)) flag('kcal');
      }
      return;
    }

    const key = h.key;
    if (key === 'addedSugars' && out.nutrients.addedSugars !== undefined) return;
    const want = UNIT_OF(key);
    const dv = NUTRIENTS[key].dv;
    const am = win.match(AMOUNT);
    const pm = win.match(PCT);
    const printed = pm ? Number(pm[1]) : undefined;

    let value: number | undefined;
    let unsure = false;

    if (am && (!pm || am.index! <= pm.index!)) {
      value = convert(Number(am[2]), am[3] as LabelUnit, want);
      if (am[1]) {
        value /= 2; // "less than 1g" → 0.5 g
        unsure = true;
      }
      if (lowConfidence.has(am[2]!) || lowConfidence.has(`${am[2]}${am[3]}`)) unsure = true;
      // "8g" read as "89g"? if %DV disagrees, try dropping a trailing 9
      if (dv && printed !== undefined && !pctMatches(value, dv, printed) && /9$/.test(am[2]!) && am[2]!.length > 1) {
        const alt = convert(Number(am[2]!.slice(0, -1)), am[3] as LabelUnit, want);
        if (pctMatches(alt, dv, printed)) value = alt;
        else unsure = true;
      } else if (dv && printed !== undefined && !pctMatches(value, dv, printed)) {
        unsure = true;
      }
    } else {
      // no unit — a bare number (often "89" for "8g")
      const bare = win.match(BARE);
      if (bare && !(pm && bare.index === pm.index)) {
        const s = bare[1]!;
        const candidates = [Number(s)];
        if (/9$/.test(s) && s.length > 1) candidates.unshift(Number(s.slice(0, -1)));
        const pick = dv && printed !== undefined ? candidates.find((c) => pctMatches(convert(c, want, want), dv, printed)) : undefined;
        value = pick ?? candidates[0];
        unsure = true;
      } else if (dv && printed !== undefined) {
        // only a %DV is printed (common for vitamins): back out the amount
        value = (printed / 100) * dv;
        unsure = true;
      }
    }

    if (value === undefined || !Number.isFinite(value)) return;
    out.nutrients[key] = Math.round(value * 100) / 100;
    seen.add(key);
    if (unsure) flag(key);
  });

  // serving size
  const sm = t.match(/serving\s*size\s*[:-]?\s*([^\n]{1,60})/);
  if (sm) {
    const line = sm[1]!.trim();
    let g: { 1: string; 2: string } | null = line.match(/\(?\s*(\d+(?:\.\d+)?)\s*(g|ml)\s*\)?/) as { 1: string; 2: string } | null;
    if (!g) {
      // "(55g)" read as "(559)": a trailing 9 inside the parentheses is almost always the g
      const m9 = line.match(/\(\s*(\d+)9\s*\)/);
      if (m9) {
        g = { 1: m9[1]!, 2: 'g' };
        flag('grams');
      }
    }
    const head = line.split('(')[0]!.trim();
    const parsed = parseServingText(head.replace(/\s*\d+(?:\.\d+)?\s*(g|ml)\s*$/, '') || head);
    if (parsed && !/^(g|ml)$/.test(parsed.unit)) {
      out.serving = { qty: parsed.qty, unit: parsed.unit.replace(/[^a-z0-9 /.-]/gi, '').trim() || 'serving' };
      if (g) out.serving.grams = Number(g[1]);
    } else if (g) {
      out.serving = { qty: Number(g[1]), unit: g[2]!, grams: Number(g[1]) };
    }
    if (out.serving && g && lowConfidence.has(g[1])) flag('grams');
  }
  const spc = t.match(/(?:about\s*)?(\d+(?:\.\d+)?)\s*servings?\s*per\s*container/) ?? t.match(/servings?\s*per\s*container\s*(?:about\s*)?(\d+(?:\.\d+)?)/);
  if (spc) out.servingsPerContainer = Number(spc[1]);

  out.found = Object.keys(out.nutrients).length;
  return out;
}
