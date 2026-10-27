import { useUI } from '@/app/store';
import { amountLabel } from '@/domain/food';
import { macroSplit, type Totals } from '@/domain/math';
import { deleteEntry, restore } from '@/db/repo';
import { MEAL_LABEL, type Entry, type MealKey } from '@/db/schema';
import { SplitBar } from '@/ui/charts/Donut';
import { IconBarcode, IconMore, IconPlus } from '@/ui/icons';
import { SwipeRow } from '@/ui/SwipeRow';
import { toast } from '@/ui/Toast';

const MEAL_ICON: Record<MealKey, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍿' };

export function MealCard({ meal, entries, totals, useNetCarbs }: { meal: MealKey; entries: Entry[]; totals: Totals; useNetCarbs: boolean }) {
  const open = useUI((s) => s.open);
  const openScanner = useUI((s) => s.openScanner);
  const kcal = totals.sum.kcal ?? 0;
  const split = macroSplit(totals.sum, useNetCarbs);

  const remove = async (e: Entry) => {
    const row = await deleteEntry(e.id);
    if (row) toast(`Removed ${e.food.name}`, { action: { label: 'Undo', run: () => void restore('entries', row) } });
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <span className="text-[19px]" aria-hidden="true">
          {MEAL_ICON[meal]}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight">{MEAL_LABEL[meal]}</h3>
          {entries.length > 0 ? (
            <div className="num text-[12px] text-muted">
              P {Math.round(split.grams.protein)} · C {Math.round(split.grams.carbs)} · F {Math.round(split.grams.fat)}
            </div>
          ) : null}
        </div>
        <div className="num text-[17px] font-semibold">{Math.round(kcal).toLocaleString()}</div>
        <button aria-label={`${MEAL_LABEL[meal]} options`} onClick={() => open({ type: 'mealActions', meal })} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
          <IconMore size={20} />
        </button>
      </div>
      {entries.length > 0 ? (
        <div className="px-4 pb-2">
          <SplitBar split={split} height={3} />
        </div>
      ) : null}
      {entries.length > 0 ? (
        <ul className="divide-y divide-line/70 border-t border-line/70">
          {entries.map((e) => (
            <li key={e.id}>
              <SwipeRow label={e.food.name} onTap={() => open({ type: 'entry', entryId: e.id })} onDelete={() => void remove(e)}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{e.food.name}</div>
                    <div className="truncate text-[12px] text-muted">
                      {e.food.brand ? `${e.food.brand} · ` : ''}
                      {amountLabel(e.food, e.amount, e.unit)}
                    </div>
                  </div>
                  <div className="num text-[15px] text-muted">{Math.round(e.nutrients.kcal ?? 0)}</div>
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex border-t border-line/70">
        <button onClick={() => open({ type: 'addFood', meal })} className="press flex min-h-[46px] flex-1 items-center justify-center gap-1.5 text-[14px] font-semibold text-gold active:bg-surface-2">
          <IconPlus size={18} strokeWidth={2.2} /> Add food
        </button>
        <div className="w-px bg-line/70" />
        <button
          onClick={() => openScanner({ meal, mode: 'barcode' })}
          aria-label={`Scan a barcode into ${MEAL_LABEL[meal]}`}
          className="press flex min-h-[46px] w-16 items-center justify-center text-muted active:bg-surface-2"
        >
          <IconBarcode size={20} />
        </button>
      </div>
    </section>
  );
}
