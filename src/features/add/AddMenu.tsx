import { useState } from 'react';
import { useUI } from '@/app/store';
import { MEAL_LABEL, MEALS, type MealKey } from '@/db/schema';
import { IconBarcode, IconBolt, IconDrop, IconDumbbell, IconEdit, IconLabel, IconScale, IconSearch } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';

/** The center + button: everything you can log, one tap away. */
export function AddMenu() {
  const back = useUI((s) => s.back);
  const swap = useUI((s) => s.swap);
  const openScanner = useUI((s) => s.openScanner);
  const [meal, setMeal] = useState<MealKey>(useUI.getState().defaultMeal());

  const tiles = [
    { label: 'Search food', Icon: IconSearch, tone: 'gold', run: () => swap({ type: 'addFood', meal }) },
    { label: 'Scan barcode', Icon: IconBarcode, tone: 'gold', run: () => openScanner({ meal, mode: 'barcode' }) },
    { label: 'Scan label', Icon: IconLabel, tone: 'gold', run: () => openScanner({ meal, mode: 'label' }) },
    { label: 'Quick add', Icon: IconBolt, tone: 'gold', run: () => swap({ type: 'quickAdd', meal }) },
  ] as const;
  const more = [
    { label: 'Exercise', Icon: IconDumbbell, color: 'var(--color-good)', run: () => swap({ type: 'exercise' }) },
    { label: 'Weigh-in', Icon: IconScale, color: 'var(--color-gold)', run: () => swap({ type: 'weight' }) },
    { label: 'Water', Icon: IconDrop, color: 'var(--color-water)', run: () => swap({ type: 'water' }) },
    { label: 'New food', Icon: IconEdit, color: 'var(--color-muted)', run: () => swap({ type: 'createFood', meal }) },
  ];

  return (
    <Sheet title="Log" onClose={back}>
      <div className="eyebrow mb-2">Food goes to</div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
        {MEALS.map((m) => (
          <button
            key={m}
            onClick={() => setMeal(m)}
            className={`h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
              m === meal ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'
            }`}
            aria-pressed={m === meal}
          >
            {MEAL_LABEL[m]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <button key={t.label} onClick={t.run} className="press card flex h-[92px] flex-col items-start justify-between p-3.5 text-left active:bg-surface-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gold/12 text-gold">
              <t.Icon size={20} />
            </span>
            <span className="text-[15px] font-semibold">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {more.map((t) => (
          <button key={t.label} onClick={t.run} className="press card flex h-[84px] flex-col items-center justify-center gap-2 active:bg-surface-2">
            <span style={{ color: t.color }}>
              <t.Icon size={22} />
            </span>
            <span className="text-[12px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
