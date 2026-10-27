import { useState } from 'react';
import { useUI } from '@/app/store';
import { logFood } from '@/db/repo';
import { MEAL_LABEL, type MealKey } from '@/db/schema';
import type { Nutrients } from '@/domain/nutrients';
import { MACRO_COLOR } from '@/domain/nutrients';
import { NumberField } from '@/ui/controls';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

/** Just the numbers — for restaurant meals or anything you already know the macros for. */
export function QuickAdd({ meal, hasBack }: { meal: MealKey; hasBack: boolean }) {
  const { back, closeAll, date } = useUI();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState<number | undefined>();
  const [p, setP] = useState<number | undefined>();
  const [c, setC] = useState<number | undefined>();
  const [f, setF] = useState<number | undefined>();
  const fromMacros = 4 * (p ?? 0) + 4 * (c ?? 0) + 9 * (f ?? 0);
  const cal = kcal ?? (fromMacros > 0 ? Math.round(fromMacros) : undefined);

  const save = async () => {
    if (!cal) return;
    const nutrients: Nutrients = { kcal: cal };
    if (p !== undefined) nutrients.protein = p;
    if (c !== undefined) nutrients.carbs = c;
    if (f !== undefined) nutrients.fat = f;
    await logFood({ date, meal, food: { name: name.trim() || 'Quick add', serving: { qty: 1, unit: 'serving' }, nutrients }, amount: 1, unit: 'serving' });
    closeAll();
    toast(`Added ${Math.round(cal)} cal to ${MEAL_LABEL[meal]}`);
  };

  return (
    <Sheet
      title="Quick add"
      onClose={closeAll}
      onBack={hasBack ? back : undefined}
      footer={
        <button className="btn btn-gold w-full" disabled={!cal} onClick={() => void save()}>
          Add to {MEAL_LABEL[meal]}
        </button>
      }
    >
      <input className="field mb-4" placeholder="Name (optional), e.g. Chipotle bowl" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <div className="card p-4">
        <label className="flex items-center gap-3">
          <span className="flex-1 font-semibold">Calories</span>
          <NumberField value={kcal} onChange={setKcal} placeholder={fromMacros > 0 ? String(Math.round(fromMacros)) : '0'} suffix="cal" className="w-40" autoFocus integer />
        </label>
        <div className="mt-4 space-y-3">
          {(
            [
              ['Protein', p, setP, 'protein'],
              ['Carbs', c, setC, 'carbs'],
              ['Fat', f, setF, 'fat'],
            ] as const
          ).map(([label, val, set, key]) => (
            <label key={label} className="flex items-center gap-3">
              <span className="size-2.5 rounded-full" style={{ background: MACRO_COLOR[key] }} />
              <span className="flex-1">{label}</span>
              <NumberField value={val} onChange={set} placeholder="0" suffix="g" className="w-40" />
            </label>
          ))}
        </div>
        {kcal === undefined && fromMacros > 0 ? <p className="mt-3 text-[12px] text-muted">Calories will be {Math.round(fromMacros)} from your macros.</p> : null}
        {kcal !== undefined && fromMacros > 0 && Math.abs(kcal - fromMacros) > Math.max(25, kcal * 0.2) ? (
          <p className="mt-3 text-[12px] text-over">Heads up: these macros add up to {Math.round(fromMacros)} cal.</p>
        ) : null}
      </div>
    </Sheet>
  );
}
