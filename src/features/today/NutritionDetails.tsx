import { useState } from 'react';
import { fmt, healthyFats, netCarbs, type Totals } from '@/domain/math';
import { LABEL_ORDER, NUTRIENTS, type NutrientKey } from '@/domain/nutrients';
import type { Goals } from '@/db/schema';
import { ProgressBar } from '@/ui/charts/Progress';
import { IconChevronDown } from '@/ui/icons';

type Kind = 'target' | 'limit' | 'min';

/** What a day's nutrient is measured against, and whether more is better. */
export function nutrientTarget(k: NutrientKey, goal: Goals | undefined): { value: number; kind: Kind } | undefined {
  if (goal) {
    switch (k) {
      case 'kcal':
        return { value: goal.calories, kind: 'target' };
      case 'protein':
        return { value: goal.protein, kind: 'target' };
      case 'carbs':
        return { value: goal.carbs, kind: 'target' };
      case 'fat':
        return { value: goal.fat, kind: 'target' };
      case 'fiber':
        return { value: goal.fiberMin, kind: 'min' };
      case 'addedSugars':
        return { value: goal.addedSugarMax, kind: 'limit' };
      case 'sodium':
        return { value: goal.sodiumMax, kind: 'limit' };
      case 'satFat':
        return { value: goal.satFatMax, kind: 'limit' };
    }
  }
  const def = NUTRIENTS[k];
  if (!def.dv) return undefined;
  if (k === 'cholesterol') return { value: def.dv, kind: 'limit' };
  return { value: def.dv, kind: 'min' };
}

const LIMIT_COLOR = 'var(--color-muted)';
const MIN_COLOR = 'var(--color-fiber)';

export function NutritionDetails({ totals, goal }: { totals: Totals; goal: Goals | undefined }) {
  const [open, setOpen] = useState(false);
  const { sum, partial } = totals;
  const rows = LABEL_ORDER.filter((k) => k !== 'kcal' && (open || ['fiber', 'sugars', 'addedSugars', 'sugarAlcohols', 'satFat', 'sodium'].includes(k)));

  return (
    <section className="card p-4">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h3 className="text-[17px] font-semibold tracking-tight">Nutrition details</h3>
        <span className="flex items-center gap-1 text-[13px] text-muted">
          {open ? 'Less' : 'All nutrients'}
          <IconChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div className="mt-3 space-y-3">
        {open ? (
          <div className="grid grid-cols-2 gap-2">
            <Derived label="Net carbs" value={`${fmt(netCarbs(sum))} g`} hint="carbs − fiber − sugar alcohols" />
            <Derived label="Healthy fats" value={`${fmt(healthyFats(sum) ?? 0)} g`} hint="mono + polyunsaturated" />
          </div>
        ) : null}
        {rows.map((k) => {
          const def = NUTRIENTS[k];
          const val = sum[k];
          const t = nutrientTarget(k, goal);
          const unit = def.unit === 'kcal' ? '' : ` ${def.unit}`;
          const isPartial = partial.has(k) && val !== undefined;
          return (
            <div key={k} style={{ paddingLeft: (def.indent ?? 0) * 12 }}>
              <div className="mb-1 flex items-baseline gap-2 text-[13.5px]">
                <span className={def.indent ? 'text-muted' : 'font-medium'}>{def.label}</span>
                {t?.kind === 'limit' ? <span className="text-[10.5px] text-faint">limit</span> : null}
                <span className="num ml-auto">
                  {val === undefined ? (
                    <span className="text-faint">—</span>
                  ) : (
                    <>
                      {isPartial ? <span className="text-faint" title="Some foods don't list this nutrient">≥ </span> : null}
                      <span className="font-semibold">{fmt(val)}</span>
                      <span className="text-muted">{unit}</span>
                    </>
                  )}
                  {t ? (
                    <span className="text-faint">
                      {' '}
                      / {fmt(t.value)}
                      {unit}
                    </span>
                  ) : null}
                </span>
              </div>
              {t ? <ProgressBar value={val ?? 0} target={t.value} kind={t.kind} color={t.kind === 'limit' ? LIMIT_COLOR : t.kind === 'min' ? MIN_COLOR : 'var(--color-gold)'} height={4} /> : null}
            </div>
          );
        })}
        {open && partial.size > 0 ? <p className="pt-1 text-[11.5px] text-faint">“≥” means some foods you logged don’t list that nutrient, so the real total is at least this.</p> : null}
      </div>
    </section>
  );
}

function Derived({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="num text-[18px] font-semibold">{value}</div>
      <div className="text-[10.5px] text-faint">{hint}</div>
    </div>
  );
}
