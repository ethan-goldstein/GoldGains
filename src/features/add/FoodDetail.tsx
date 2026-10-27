import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useUI, type Sheet as SheetState } from '@/app/store';
import { amountLabel, defaultUnit, nutrientsFor, servingLabel, type Food } from '@/domain/food';
import { logFood, saveFood, toggleFavorite } from '@/db/repo';
import { db, MEAL_LABEL, MEALS, type MealKey } from '@/db/schema';
import { IconEdit, IconStar } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { AmountPicker } from './AmountPicker';
import { NutrientPanel } from './NutrientPanel';

type FoodArg = Extract<SheetState, { type: 'food' }>['food'];

const SOURCE_NOTE: Record<string, string> = {
  usda: 'USDA FoodData Central',
  off: 'Open Food Facts',
  custom: 'Your food',
  quick: 'Quick add',
};

export function FoodDetail({ meal: initialMeal, food, hasBack }: { meal: MealKey; food: FoodArg; hasBack: boolean }) {
  const { back, closeAll, open, date } = useUI();
  // live row once this food is in the database, so the star and edits reflect immediately
  const [rowId, setRowId] = useState<string | undefined>(food.id || undefined);
  const saved = useLiveQuery(() => (rowId ? db.foods.get(rowId) : undefined), [rowId]);
  useEffect(() => {
    if (!rowId && food.barcode) void db.foods.where('barcode').equals(food.barcode).first().then((r) => r && setRowId(r.id));
  }, [rowId, food.barcode]);
  const f = (saved ?? food) as Food;
  const init = defaultUnit(f);
  const [amount, setAmount] = useState<number | undefined>(init.amount);
  const [unit, setUnit] = useState(init.unit);
  const [meal, setMeal] = useState<MealKey>(initialMeal);
  const [busy, setBusy] = useState(false);
  const n = nutrientsFor(f, amount ?? 0, unit);

  const ensureSaved = async (): Promise<Food> => {
    if (saved) return saved;
    const row = await saveFood(f);
    setRowId(row.id);
    return row;
  };

  const add = async () => {
    if (!amount || busy) return;
    setBusy(true);
    try {
      const row = await ensureSaved();
      await logFood({ date, meal, food: row, foodId: row.id, amount, unit });
      closeAll();
      toast(`Added ${f.name} · ${Math.round(n.kcal ?? 0)} cal`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={f.name}
      onClose={closeAll}
      onBack={hasBack ? back : undefined}
      right={
        <button
          aria-label={f.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={async () => {
            const row = await ensureSaved();
            await toggleFavorite(row.id);
          }}
          className={`grid size-9 place-items-center rounded-full ${f.favorite ? 'text-gold' : 'text-muted'}`}
        >
          <IconStar filled={!!f.favorite} size={20} />
        </button>
      }
      footer={
        <button className="btn btn-gold w-full text-[16px]" disabled={!amount || busy} onClick={() => void add()}>
          Add to {MEAL_LABEL[meal]} · <span className="num">{Math.round(n.kcal ?? 0)}</span> cal
        </button>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        {f.imageUrl ? <img src={f.imageUrl} alt="" referrerPolicy="no-referrer" className="size-14 rounded-xl bg-surface-3 object-cover" /> : null}
        <div className="min-w-0 text-[13px] text-muted">
          {f.brand ? <div className="truncate font-medium text-text">{f.brand}</div> : null}
          <div>
            {f.source === 'usda' ? 'Per 100 g' : `Serving: ${servingLabel(f.serving, f.baseUnit)}`} · {SOURCE_NOTE[f.source] ?? ''}
          </div>
        </div>
        {f.source === 'custom' && saved ? (
          <button onClick={() => open({ type: 'createFood', editId: f.id })} className="ml-auto flex items-center gap-1 text-[13px] text-gold">
            <IconEdit size={15} /> Edit
          </button>
        ) : null}
      </div>

      <AmountPicker
        food={f}
        amount={amount}
        unit={unit}
        onChange={(a, u) => {
          setAmount(a);
          setUnit(u);
        }}
      />
      <div className="mt-1.5 mb-4 text-[12px] text-faint">{amount ? amountLabel(f, amount, unit) : 'Enter an amount'}</div>

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
      {f.source === 'off' ? (
        <p className="mt-4 text-[11px] text-faint">Product data © Open Food Facts contributors (ODbL). Check it against the package — community data can be off.</p>
      ) : null}
    </Sheet>
  );
}
