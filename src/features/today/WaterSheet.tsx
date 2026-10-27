import { useUI } from '@/app/store';
import { addWater } from '@/db/repo';
import { useDay, useGoalFor, useSettings } from '@/db/hooks';
import { ProgressBar } from '@/ui/charts/Progress';
import { IconDrop, IconMinus, IconPlus } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';

const OZ_ML = 29.5735;

export function waterLabel(ml: number, unit: 'oz' | 'ml') {
  return unit === 'oz' ? `${Math.round(ml / OZ_ML)} oz` : `${Math.round(ml)} ml`;
}

/** Inline water tracker on Today */
export function WaterCard() {
  const date = useUI((s) => s.date);
  const day = useDay(date);
  const goal = useGoalFor(date);
  const settings = useSettings();
  const step = settings.waterUnit === 'oz' ? 8 * OZ_ML : 250;
  const target = goal?.waterMl ?? 2500;
  const glasses = Math.round(target / step);
  const filled = Math.round(day.waterMl / step);
  return (
    <section className="card px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="text-water">
          <IconDrop size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight">Water</h3>
          <div className="num text-[12px] text-muted">
            {waterLabel(day.waterMl, settings.waterUnit)} of {waterLabel(target, settings.waterUnit)}
          </div>
        </div>
        <button aria-label="Remove a glass" onClick={() => void addWater(date, -step)} className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted active:bg-surface-3">
          <IconMinus size={18} />
        </button>
        <button aria-label="Add a glass" onClick={() => void addWater(date, step)} className="grid size-10 place-items-center rounded-full bg-water/15 text-water active:bg-water/25">
          <IconPlus size={18} strokeWidth={2.2} />
        </button>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.max(1, glasses) }, (_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i < filled ? 'bg-water' : 'bg-surface-3'}`} />
        ))}
      </div>
    </section>
  );
}

export function WaterSheet() {
  const date = useUI((s) => s.date);
  const back = useUI((s) => s.back);
  const day = useDay(date);
  const goal = useGoalFor(date);
  const settings = useSettings();
  const amounts = settings.waterUnit === 'oz' ? [8, 12, 16, 20, 32].map((oz) => ({ label: `${oz} oz`, ml: oz * OZ_ML })) : [200, 250, 330, 500, 750].map((ml) => ({ label: `${ml} ml`, ml }));
  const target = goal?.waterMl ?? 2500;
  return (
    <Sheet title="Water" onClose={back}>
      <div className="py-2 text-center">
        <div className="num text-4xl font-bold text-water">{waterLabel(day.waterMl, settings.waterUnit)}</div>
        <div className="mt-1 text-sm text-muted">of {waterLabel(target, settings.waterUnit)} goal</div>
        <div className="mx-auto mt-4 max-w-xs">
          <ProgressBar value={day.waterMl} target={target} color="var(--color-water)" height={8} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {amounts.map((a) => (
          <button key={a.label} onClick={() => void addWater(date, a.ml)} className="btn btn-ghost">
            + {a.label}
          </button>
        ))}
        <button onClick={() => void addWater(date, -amounts[0]!.ml)} className="btn btn-ghost text-muted">
          − {amounts[0]!.label}
        </button>
      </div>
    </Sheet>
  );
}
