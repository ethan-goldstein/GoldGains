import { useState } from 'react';
import { healthyFats, macroSplit, netCarbs, fmt } from '@/domain/math';
import { MACRO_COLOR, MACRO_LABEL, MACROS, type Nutrients } from '@/domain/nutrients';
import type { Goals } from '@/db/schema';
import { MacroDonut } from '@/ui/charts/Donut';
import { ProgressBar } from '@/ui/charts/Progress';
import { Segmented } from '@/ui/controls';

/** The macro "portfolio": donut of the calorie split, grams vs target, and the carb/fat breakdown chips. */
export function MacroCard({ food, goal, useNetCarbs }: { food: Nutrients; goal: Goals | undefined; useNetCarbs: boolean }) {
  const [view, setView] = useState<'grams' | 'split'>('grams');
  const split = macroSplit(food, useNetCarbs);
  const target = { protein: goal?.protein ?? 0, carbs: goal?.carbs ?? 0, fat: goal?.fat ?? 0 };
  const targetPct = goal ? { protein: goal.split[0], carbs: goal.split[1], fat: goal.split[2] } : null;

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-tight">Macros</h3>
        <Segmented
          size="sm"
          className="w-[150px]"
          value={view}
          onChange={setView}
          options={[
            { value: 'grams', label: 'Grams' },
            { value: 'split', label: 'Split %' },
          ]}
        />
      </div>
      <div className="flex items-center gap-4">
        <MacroDonut split={split} size={136} thickness={15} />
        <div className="min-w-0 flex-1 space-y-3.5">
          {MACROS.map((m) => {
            const g = split.grams[m];
            const left = target[m] - g;
            return (
              <div key={m}>
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: MACRO_COLOR[m] }} />
                  <span className="text-[13px] font-semibold">{m === 'carbs' && useNetCarbs ? 'Net carbs' : MACRO_LABEL[m]}</span>
                  <span className="num ml-auto text-[13px]">
                    {view === 'grams' ? (
                      <>
                        <span className="font-semibold">{Math.round(g)}</span>
                        <span className="text-muted"> / {target[m]} g</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{Math.round(split.pct[m] * 100)}%</span>
                        {targetPct ? <span className="text-muted"> / {targetPct[m]}%</span> : null}
                      </>
                    )}
                  </span>
                </div>
                <ProgressBar
                  value={view === 'grams' ? g : split.pct[m] * 100}
                  target={view === 'grams' ? target[m] : (targetPct?.[m] ?? 100)}
                  color={MACRO_COLOR[m]}
                  height={5}
                />
                {view === 'grams' ? (
                  <div className="mt-1 text-[11px] text-muted">{left >= 0 ? `${Math.round(left)} g to go` : `${Math.round(-left)} g over`}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Chip label="Fiber" value={fmt(food.fiber ?? 0, { max: 0 })} unit="g" sub={goal ? `/ ${goal.fiberMin}` : undefined} color="var(--color-fiber)" />
        <Chip label="Sugar" value={fmt(food.sugars ?? 0, { max: 0 })} unit="g" sub={food.addedSugars !== undefined ? `${Math.round(food.addedSugars)} added` : undefined} color="var(--color-sugar)" />
        <Chip label={useNetCarbs ? 'Total carbs' : 'Net carbs'} value={fmt(useNetCarbs ? (food.carbs ?? 0) : netCarbs(food), { max: 0 })} unit="g" color="var(--color-carbs)" />
        <Chip label="Healthy fats" value={fmt(healthyFats(food) ?? 0, { max: 0 })} unit="g" color="var(--color-fat)" />
      </div>
    </section>
  );
}

function Chip({ label, value, unit, sub, color }: { label: string; value: string; unit: string; sub?: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
      <span className="h-6 w-[3px] shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{label}</span>
      <span className="num text-[16px] font-semibold">
        {value}
        <span className="ml-0.5 text-[11px] font-normal text-muted">{unit}</span>
      </span>
      {sub ? <span className="num text-[11px] text-faint">{sub}</span> : null}
    </div>
  );
}
