import { useState } from 'react';
import { MACRO_COLOR, MACRO_LABEL, MACROS, type Macro } from '@/domain/nutrients';
import type { MacroSplit } from '@/domain/math';

interface Props {
  split: MacroSplit;
  size?: number;
  thickness?: number;
  /** tap a segment to focus it; the center then shows that macro */
  interactive?: boolean;
  /** hide the centre total (when the calories are shown right beside the donut) */
  bare?: boolean;
}

const GAP_PX = 2.5;

/** Protein / carbs / fat share of calories as a donut with 2px surface gaps between arcs. */
export function MacroDonut({ split, size = 168, thickness = 18, interactive = true, bare = false }: Props) {
  const [focus, setFocus] = useState<Macro | null>(null);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const empty = split.macroKcal <= 0;
  const segments = MACROS.filter((m) => split.pct[m] > 0);
  const gap = segments.length > 1 ? GAP_PX : 0;

  let offset = 0;
  const arcs = MACROS.map((m) => {
    const len = split.pct[m] * c;
    const arc = { m, len: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });

  const f = focus && split.pct[focus] > 0 ? focus : null;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={
          empty
            ? 'No macros logged yet'
            : MACROS.map((m) => `${MACRO_LABEL[m]} ${Math.round(split.pct[m] * 100)}%`).join(', ')
        }
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={thickness} />
        {!empty &&
          arcs.map(({ m, len, offset: o }) =>
            len > 0 ? (
              <circle
                key={m}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={MACRO_COLOR[m]}
                strokeWidth={f === m ? thickness + 4 : thickness}
                strokeDasharray={`${len} ${c}`}
                strokeDashoffset={-o}
                opacity={f && f !== m ? 0.35 : 1}
                style={{ transition: 'stroke-dasharray 600ms var(--ease-out-soft), stroke-dashoffset 600ms var(--ease-out-soft), opacity 200ms' }}
                onClick={interactive ? () => setFocus(focus === m ? null : m) : undefined}
                className={interactive ? 'cursor-pointer' : ''}
              />
            ) : null,
          )}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        {bare && !f ? null : empty ? (
          <div>
            <div className="num text-2xl font-semibold text-faint">0</div>
            <div className="text-[11px] text-faint">macro kcal</div>
          </div>
        ) : f ? (
          <div>
            <div className="num text-[26px] leading-none font-bold">{Math.round(split.pct[f] * 100)}%</div>
            <div className="mt-1 text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              {MACRO_LABEL[f]} · {Math.round(split.grams[f])} g
            </div>
          </div>
        ) : (
          <div>
            <div className="num text-[26px] leading-none font-bold">{Math.round(split.macroKcal).toLocaleString()}</div>
            <div className="mt-1 text-[11px] text-muted">kcal from macros</div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Thin horizontal stacked bar of the P/C/F split, for meal cards */
export function SplitBar({ split, height = 4 }: { split: MacroSplit; height?: number }) {
  if (split.macroKcal <= 0) return <div className="w-full rounded-full bg-surface-3" style={{ height }} />;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }} aria-hidden="true">
      {MACROS.map((m) =>
        split.pct[m] > 0 ? <div key={m} style={{ width: `${split.pct[m] * 100}%`, background: MACRO_COLOR[m] }} className="h-full first:rounded-l-full last:rounded-r-full" /> : null,
      )}
    </div>
  );
}
