import { useState } from 'react';
import { fmt, macroSplit, netCarbs, healthyFats } from '@/domain/math';
import { LABEL_ORDER, MACRO_COLOR, MACRO_LABEL, MACROS, NUTRIENTS, type Nutrients } from '@/domain/nutrients';
import { MacroDonut } from '@/ui/charts/Donut';
import { IconChevronDown } from '@/ui/icons';

/** Calories + macro donut for a portion, with an expandable full label. */
export function NutrientPanel({ n }: { n: Nutrients }) {
  const [all, setAll] = useState(false);
  const split = macroSplit(n);
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <MacroDonut split={split} size={104} thickness={12} interactive={false} bare />
        <div className="min-w-0 flex-1">
          <div className="num text-[34px] leading-none font-bold">{Math.round(n.kcal ?? 0)}</div>
          <div className="mt-1 text-xs text-muted">calories</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MACROS.map((m) => (
              <div key={m}>
                <div className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: MACRO_COLOR[m] }} />
                  <span className="text-[11px] text-muted">{MACRO_LABEL[m]}</span>
                </div>
                <div className="num text-[16px] font-semibold">
                  {fmt(split.grams[m])}
                  <span className="text-[11px] font-normal text-muted"> g</span>
                </div>
                <div className="num text-[10.5px] text-faint">{Math.round(split.pct[m] * 100)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => setAll((a) => !a)} className="mt-3 flex w-full items-center justify-center gap-1 pt-1 text-[13px] text-muted" aria-expanded={all}>
        {all ? 'Hide' : 'Full nutrition label'}
        <IconChevronDown size={15} className={`transition-transform ${all ? 'rotate-180' : ''}`} />
      </button>
      {all ? (
        <div className="mt-2 divide-y divide-line/60 border-t border-line/60">
          {LABEL_ORDER.filter((k) => k !== 'kcal').map((k) => {
            const def = NUTRIENTS[k];
            const v = n[k];
            return (
              <div key={k} className="flex items-baseline justify-between py-1.5 text-[13.5px]" style={{ paddingLeft: (def.indent ?? 0) * 14 }}>
                <span className={def.indent ? 'text-muted' : 'font-medium'}>{def.label}</span>
                <span className="num">
                  {v === undefined ? <span className="text-faint">—</span> : `${fmt(v)} ${def.unit}`}
                  {v !== undefined && def.dv ? <span className="ml-2 inline-block w-10 text-right text-faint">{Math.round((v / def.dv) * 100)}%</span> : <span className="ml-2 inline-block w-10" />}
                </span>
              </div>
            );
          })}
          <div className="flex justify-between py-1.5 text-[13.5px]">
            <span className="font-medium">Net carbs</span>
            <span className="num pr-12">{fmt(netCarbs(n))} g</span>
          </div>
          <div className="flex justify-between py-1.5 text-[13.5px]">
            <span className="font-medium">Healthy fats</span>
            <span className="num pr-12">{healthyFats(n) === undefined ? '—' : `${fmt(healthyFats(n))} g`}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
