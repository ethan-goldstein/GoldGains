import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useUI } from '@/app/store';
import { amountLabel, nutrientsFor } from '@/domain/food';
import { deleteEntry, restore, updateEntry } from '@/db/repo';
import { db, MEAL_LABEL, MEALS, type MealKey } from '@/db/schema';
import { IconTrash } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { AmountPicker } from './AmountPicker';
import { NutrientPanel } from './NutrientPanel';

export function EntryEdit({ entryId }: { entryId: string }) {
  const back = useUI((s) => s.back);
  const entry = useLiveQuery(() => db.entries.get(entryId), [entryId]);
  const [amount, setAmount] = useState<number | undefined>();
  const [unit, setUnit] = useState('serving');
  const [meal, setMeal] = useState<MealKey>('breakfast');

  useEffect(() => {
    if (entry && amount === undefined) {
      setAmount(entry.amount);
      setUnit(entry.unit);
      setMeal(entry.meal);
    }
  }, [entry, amount]);

  if (!entry) return <Sheet title="" onClose={back}>{null}</Sheet>;
  const n = nutrientsFor(entry.food, amount ?? 0, unit);

  return (
    <Sheet
      title={entry.food.name}
      onClose={back}
      footer={
        <div className="flex gap-2">
          <button
            aria-label="Delete entry"
            className="btn btn-danger w-14 px-0"
            onClick={async () => {
              const row = await deleteEntry(entry.id);
              back();
              if (row) toast(`Removed ${row.food.name}`, { action: { label: 'Undo', run: () => void restore('entries', row) } });
            }}
          >
            <IconTrash size={20} />
          </button>
          <button
            className="btn btn-gold flex-1"
            disabled={!amount}
            onClick={async () => {
              if (!amount) return;
              await updateEntry(entry.id, { amount, unit, meal });
              back();
            }}
          >
            Save · <span className="num">{Math.round(n.kcal ?? 0)}</span> cal
          </button>
        </div>
      }
    >
      {entry.food.brand ? <div className="-mt-1 mb-3 text-[13px] text-muted">{entry.food.brand}</div> : null}
      <AmountPicker
        food={entry.food}
        amount={amount}
        unit={unit}
        onChange={(a, u) => {
          setAmount(a);
          setUnit(u);
        }}
      />
      <div className="mt-1.5 mb-4 text-[12px] text-faint">{amount ? amountLabel(entry.food, amount, unit) : 'Enter an amount'}</div>
      <NutrientPanel n={n} />
      <div className="mt-4">
        <div className="eyebrow mb-2">Meal</div>
        <div className="flex gap-2">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMeal(m)}
              className={`h-9 flex-1 rounded-full border text-[13px] font-semibold ${m === meal ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}
            >
              {MEAL_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
