import { unitOptions, type FoodCore } from '@/domain/food';
import { NumberField } from '@/ui/controls';
import { IconChevronDown, IconMinus, IconPlus } from '@/ui/icons';

const QUICK = [0.5, 1, 1.5, 2];

/** Amount + unit picker. Steppers move by 1 for servings/portions and by sensible chunks for g/oz. */
export function AmountPicker({
  food,
  amount,
  unit,
  onChange,
}: {
  food: FoodCore;
  amount: number | undefined;
  unit: string;
  onChange: (amount: number | undefined, unit: string) => void;
}) {
  const opts = unitOptions(food);
  const isMass = unit === 'g' || unit === 'ml';
  const step = isMass ? 10 : unit === 'oz' || unit === 'floz' ? 0.5 : 0.5;
  const a = amount ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <button
          aria-label="Less"
          onClick={() => onChange(Math.max(step, Number((a - step).toFixed(2))), unit)}
          className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted active:bg-surface-3"
        >
          <IconMinus size={18} />
        </button>
        <NumberField value={amount} onChange={(v) => onChange(v, unit)} ariaLabel="Amount" className="w-24 flex-none text-lg font-semibold" />
        <button
          aria-label="More"
          onClick={() => onChange(Number((a + step).toFixed(2)), unit)}
          className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted active:bg-surface-3"
        >
          <IconPlus size={18} />
        </button>
        <div className="relative min-w-0 flex-1">
          <select
            aria-label="Unit"
            value={unit}
            onChange={(e) => {
              const next = e.target.value;
              // convert the amount so the portion stays the same size when switching units
              const from = opts.find((o) => o.key === unit);
              const to = opts.find((o) => o.key === next);
              if (from && to && amount) {
                const servings = amount * from.servingsPer;
                const conv = servings / to.servingsPer;
                const rounded = next === 'g' || next === 'ml' ? Math.round(conv) : Math.round(conv * 4) / 4 || Number(conv.toFixed(2));
                onChange(rounded, next);
              } else onChange(amount, next);
            }}
            className="field w-full appearance-none truncate pr-8"
          >
            {opts.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <IconChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
        </div>
      </div>
      {!isMass && unit !== 'oz' && unit !== 'floz' ? (
        <div className="flex gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => onChange(q, unit)}
              className={`h-9 flex-1 rounded-full border text-sm font-semibold ${amount === q ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}
            >
              {q === 0.5 ? '½' : q === 1.5 ? '1½' : q}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
