import { useState } from 'react';
import { useUI } from '@/app/store';
import { addDays } from '@/domain/day';
import { useDay } from '@/db/hooks';
import { copyMeal, saveMealFromEntries } from '@/db/repo';
import { db, MEAL_LABEL, MEALS, type MealKey } from '@/db/schema';
import { IconCopy, IconStar, IconTrash, IconUtensils } from '@/ui/icons';
import { Row } from '@/ui/controls';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export function MealActions({ meal }: { meal: MealKey }) {
  const date = useUI((s) => s.date);
  const back = useUI((s) => s.back);
  const swap = useUI((s) => s.swap);
  const day = useDay(date);
  const entries = day.byMeal[meal];
  const yesterday = addDays(date, -1);

  return (
    <Sheet title={MEAL_LABEL[meal]} onClose={back}>
      <div className="card divide-y divide-line overflow-hidden">
        <Row
          onClick={async () => {
            const n = await copyMeal(yesterday, meal, date);
            back();
            toast(n ? `Copied ${n} item${n > 1 ? 's' : ''} from yesterday` : `Nothing logged for ${MEAL_LABEL[meal].toLowerCase()} yesterday`);
          }}
        >
          <IconCopy className="text-muted" />
          <span className="flex-1">Copy yesterday’s {MEAL_LABEL[meal].toLowerCase()}</span>
        </Row>
        <Row onClick={() => swap({ type: 'saveMeal', meal })}>
          <IconStar className="text-muted" />
          <span className={`flex-1 ${entries.length ? '' : 'text-faint'}`}>Save as a meal</span>
        </Row>
        <Row onClick={() => swap({ type: 'addFood', meal })}>
          <IconUtensils className="text-muted" />
          <span className="flex-1">Add from my meals</span>
        </Row>
        {MEALS.filter((m) => m !== meal).length && entries.length ? (
          <div className="px-4 py-3">
            <div className="eyebrow mb-2">Move all to</div>
            <div className="flex gap-2">
              {MEALS.filter((m) => m !== meal).map((m) => (
                <button
                  key={m}
                  className="btn btn-ghost min-h-10 flex-1 px-2 text-[13px]"
                  onClick={async () => {
                    await db.entries.bulkUpdate(entries.map((e) => ({ key: e.id, changes: { meal: m } })));
                    back();
                    toast(`Moved to ${MEAL_LABEL[m]}`);
                  }}
                >
                  {MEAL_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Row
          onClick={async () => {
            if (!entries.length) return back();
            const rows = [...entries];
            await db.entries.bulkDelete(rows.map((e) => e.id));
            back();
            toast(`Cleared ${MEAL_LABEL[meal].toLowerCase()}`, { action: { label: 'Undo', run: () => void db.entries.bulkPut(rows) } });
          }}
        >
          <IconTrash className="text-over" />
          <span className={`flex-1 ${entries.length ? 'text-over' : 'text-faint'}`}>Clear {MEAL_LABEL[meal].toLowerCase()}</span>
        </Row>
      </div>
    </Sheet>
  );
}

export function SaveMealSheet({ meal }: { meal: MealKey }) {
  const date = useUI((s) => s.date);
  const back = useUI((s) => s.back);
  const day = useDay(date);
  const entries = day.byMeal[meal];
  const [name, setName] = useState('');
  const kcal = entries.reduce((a, e) => a + (e.nutrients.kcal ?? 0), 0);

  return (
    <Sheet
      title="Save as a meal"
      onClose={back}
      footer={
        <button
          className="btn btn-gold w-full"
          disabled={!name.trim() || !entries.length}
          onClick={async () => {
            await saveMealFromEntries(name.trim(), entries);
            back();
            toast(`Saved “${name.trim()}”`);
          }}
        >
          Save meal
        </button>
      }
    >
      {entries.length ? (
        <>
          <input className="field" placeholder="Meal name, e.g. Post-lift shake" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
          <div className="mt-4 text-sm text-muted">
            {entries.length} item{entries.length > 1 ? 's' : ''} · <span className="num">{Math.round(kcal)}</span> cal
          </div>
          <ul className="mt-2 space-y-1 text-[14px]">
            {entries.map((e) => (
              <li key={e.id} className="truncate">
                {e.food.name}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-6 text-center text-muted">Log some foods in {MEAL_LABEL[meal].toLowerCase()} first, then save them as a meal you can add in one tap.</p>
      )}
    </Sheet>
  );
}
