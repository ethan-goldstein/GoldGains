import { useState, type ReactNode } from 'react';

export interface BarDatum {
  key: string;
  label: string;
  /** stacked segments bottom → top */
  parts: { value: number; color: string; name: string }[];
  /** optional per-bar reference value (e.g. that day's budget) */
  target?: number;
  tooltip?: ReactNode;
}

/**
 * Columns with a 4px rounded top, 2px surface gaps between stacked segments, a dashed target tick,
 * and a tap/hover tooltip. Single y-axis; values must share a unit.
 */
export function Bars({ data, height = 150, unit = '', showTarget = true }: { data: BarDatum[]; height?: number; unit?: string; showTarget?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(4, ...data.map((d) => Math.max(d.parts.reduce((a, p) => a + p.value, 0), d.target ?? 0)));
  const ticks = niceTicks(max);
  const act = data.find((d) => d.key === active);
  const gap = data.length > 40 ? 1 : data.length > 14 ? 2 : 3;

  return (
    <div className="relative">
      <div className="relative flex" style={{ height }}>
        <div className="num flex w-9 shrink-0 flex-col justify-between pr-1 text-right text-[10px] text-faint" aria-hidden="true">
          {[...ticks].reverse().map((t) => (
            <span key={t} className="leading-none">
              {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-line/50" style={{ bottom: `${(t / ticks.at(-1)!) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end" style={{ gap }} onPointerLeave={() => setActive(null)}>
            {data.map((d) => {
              const total = d.parts.reduce((a, p) => a + p.value, 0);
              const top = ticks.at(-1)!;
              return (
                <button
                  key={d.key}
                  className="relative flex h-full min-w-0 flex-1 flex-col justify-end"
                  onPointerEnter={() => setActive(d.key)}
                  onClick={() => setActive(active === d.key ? null : d.key)}
                  aria-label={`${d.label}: ${Math.round(total)}${unit}${d.target ? ` of ${Math.round(d.target)}` : ''}`}
                >
                  <div className={`flex w-full flex-col-reverse gap-[2px] transition-opacity ${active && active !== d.key ? 'opacity-45' : ''}`} style={{ height: `${(total / top) * 100}%` }}>
                    {d.parts.map((p, i) =>
                      p.value > 0 ? (
                        <div
                          key={p.name}
                          style={{ flexGrow: p.value, background: p.color }}
                          className={`min-h-[2px] w-full ${i === d.parts.length - 1 || d.parts.slice(i + 1).every((x) => x.value <= 0) ? 'rounded-t-[4px]' : ''}`}
                        />
                      ) : null,
                    )}
                  </div>
                  {showTarget && d.target ? (
                    <div className="absolute inset-x-[-1px] border-t-2 border-dashed border-gold/70" style={{ bottom: `${(d.target / top) * 100}%` }} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex pl-9">
        <div className="flex flex-1" style={{ gap }}>
          {data.map((d, i) => (
            <span key={d.key} className={`flex-1 truncate text-center text-[10px] ${d.key === active ? 'text-text' : 'text-faint'}`}>
              {data.length > 14 && i % Math.ceil(data.length / 7) !== 0 ? '' : d.label}
            </span>
          ))}
        </div>
      </div>
      {act?.tooltip ? (
        <div className="pointer-events-none absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-xl border border-line-strong bg-surface-3 px-3 py-2 text-[12px] shadow-xl">{act.tooltip}</div>
      ) : null}
    </div>
  );
}

/** 0 … top in at most 4 even steps of 1/2/2.5/5 × 10ⁿ, with the top just above the data. */
function niceTicks(max: number): number[] {
  const pow = 10 ** Math.floor(Math.log10(Math.max(1, max) / 4));
  let step = pow;
  for (const m of [1, 2, 2.5, 5, 10, 20]) {
    step = m * pow;
    if (Math.ceil(max / step) <= 4) break;
  }
  const n = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}
