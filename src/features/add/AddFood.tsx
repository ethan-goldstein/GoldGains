import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useUI } from '@/app/store';
import { nutrientsFor, servingLabel, type Food } from '@/domain/food';
import { useSettings } from '@/db/hooks';
import { logSavedMeal } from '@/db/repo';
import { db, MEAL_LABEL, type MealKey, type SavedMeal } from '@/db/schema';
import { OffError, searchOff } from '@/sources/off';
import { loadGeneric, rank } from '@/sources/search';
import { Segmented, Empty } from '@/ui/controls';
import { IconBarcode, IconBolt, IconClose, IconEdit, IconLabel, IconSearch, IconStar, IconUtensils } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

// stable empty array so memo deps don't change while a query loads
const NONE: never[] = [];

type Tab = 'search' | 'recent' | 'favorites' | 'meals';

export function AddFood({ meal, hasBack }: { meal: MealKey; hasBack: boolean }) {
  const { back, closeAll, open, openScanner, date } = useUI();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>('search');
  const [q, setQ] = useState('');
  const [generic, setGeneric] = useState<Food[]>([]);
  const [off, setOff] = useState<{ q: string; foods: Food[] } | null>(null);
  const [offState, setOffState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [offMsg, setOffMsg] = useState('');

  const myFoods = useLiveQuery(() => db.foods.toArray(), []) ?? NONE;
  // sorted here rather than with a reverse query: Safari can fail those with "Unable to open cursor"
  const recents = useMemo(
    () =>
      myFoods
        .filter((f) => !!f.lastUsedAt)
        .sort((a, b) => b.lastUsedAt! - a.lastUsedAt!)
        .slice(0, 40),
    [myFoods],
  );
  const favorites = useLiveQuery(() => db.foods.where('favorite').equals(1).toArray(), []) ?? NONE;
  const savedMeals = useLiveQuery(() => db.savedMeals.orderBy('name').toArray(), []) ?? NONE;

  useEffect(() => {
    void loadGeneric().then(setGeneric);
  }, []);

  const local = useMemo(() => {
    if (!q.trim()) return [];
    // your own and cached foods first, then everyday USDA foods; hide USDA rows you've already saved
    const savedRefs = new Set(myFoods.filter((f) => f.ref).map((f) => f.ref));
    return rank([...myFoods, ...generic.filter((g) => !savedRefs.has(g.ref))], q, 40);
  }, [q, myFoods, generic]);

  const runOff = async () => {
    const term = q.trim();
    if (!term || settings.offlineOnly) return;
    setOffState('loading');
    try {
      const foods = await searchOff(term);
      setOff({ q: term, foods });
      setOffState('idle');
    } catch (e) {
      setOffState('error');
      setOffMsg(e instanceof OffError ? e.message : 'Search failed.');
    }
  };

  const pick = (food: Food) => open({ type: 'food', meal, food });

  const showOff = off && off.q === q.trim();

  return (
    <Sheet title={`Add to ${MEAL_LABEL[meal]}`} onClose={closeAll} onBack={hasBack ? back : undefined} tall>
      <form
        className="sticky top-0 z-10 -mx-4 bg-surface px-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          void runOff();
          (document.activeElement as HTMLElement | null)?.blur();
        }}
      >
        <div className="flex gap-2">
          <label className="field flex flex-1 items-center gap-2">
            <IconSearch size={18} className="shrink-0 text-muted" />
            <input
              type="search"
              enterKeyHint="search"
              className="w-full min-w-0 bg-transparent outline-none placeholder:text-faint"
              placeholder="Search foods, brands…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                if (tab !== 'search') setTab('search');
              }}
              autoComplete="off"
              autoCorrect="off"
              maxLength={120}
            />
            {q ? (
              <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="text-faint">
                <IconClose size={16} />
              </button>
            ) : null}
          </label>
          <button type="button" aria-label="Scan barcode" onClick={() => openScanner({ meal, mode: 'barcode' })} className="field grid w-12! place-items-center px-0! text-gold">
            <IconBarcode size={22} />
          </button>
        </div>
        {!q ? (
          <Segmented
            className="mt-3"
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'search', label: 'Quick' },
              { value: 'recent', label: 'Recent' },
              { value: 'favorites', label: 'Favorites' },
              { value: 'meals', label: 'Meals' },
            ]}
          />
        ) : null}
      </form>

      {q.trim() ? (
        <div className="space-y-4">
          <FoodList foods={local} onPick={pick} empty={null} />
          {!settings.offlineOnly ? (
            <div>
              {showOff ? (
                <>
                  <div className="eyebrow mb-2">Open Food Facts</div>
                  <FoodList foods={off.foods} onPick={pick} empty={<p className="py-3 text-sm text-muted">No packaged foods found for “{off.q}”.</p>} />
                </>
              ) : (
                <button onClick={() => void runOff()} disabled={offState === 'loading'} className="btn btn-ghost w-full text-[14px]">
                  {offState === 'loading' ? 'Searching packaged foods…' : `Search packaged foods for “${q.trim()}”`}
                </button>
              )}
              {offState === 'error' ? <p className="mt-2 text-center text-sm text-over">{offMsg}</p> : null}
            </div>
          ) : null}
          <QuickActions meal={meal} q={q} />
        </div>
      ) : tab === 'search' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <ActionTile Icon={IconBarcode} label="Scan barcode" onClick={() => openScanner({ meal, mode: 'barcode' })} />
            <ActionTile Icon={IconLabel} label="Scan label" onClick={() => openScanner({ meal, mode: 'label' })} />
            <ActionTile Icon={IconBolt} label="Quick add" onClick={() => open({ type: 'quickAdd', meal })} />
            <ActionTile Icon={IconEdit} label="Create food" onClick={() => open({ type: 'createFood', meal })} />
          </div>
          {recents.length ? (
            <div>
              <div className="eyebrow mb-2">Recent</div>
              <FoodList foods={recents.slice(0, 12)} onPick={pick} empty={null} />
            </div>
          ) : (
            <Empty icon={<IconSearch size={32} />} title="Search 300+ everyday foods">
              Or scan a barcode for packaged foods. Foods you log show up here for one-tap re-adding.
            </Empty>
          )}
        </div>
      ) : tab === 'recent' ? (
        <FoodList foods={recents} onPick={pick} empty={<Empty title="Nothing logged yet">Foods you add show up here.</Empty>} />
      ) : tab === 'favorites' ? (
        <FoodList
          foods={favorites}
          onPick={pick}
          empty={
            <Empty icon={<IconStar size={30} />} title="No favorites yet">
              Tap the star on any food to pin it here.
            </Empty>
          }
        />
      ) : (
        <MealList
          meals={savedMeals}
          onPick={async (m) => {
            await logSavedMeal(m, date, meal);
            closeAll();
            toast(`Added “${m.name}” to ${MEAL_LABEL[meal]}`);
          }}
        />
      )}
    </Sheet>
  );
}

function QuickActions({ meal, q }: { meal: MealKey; q: string }) {
  const open = useUI((s) => s.open);
  return (
    <div className="flex gap-2 pt-1">
      <button className="btn btn-ghost flex-1 text-[13px]" onClick={() => open({ type: 'quickAdd', meal })}>
        <IconBolt size={16} /> Quick add
      </button>
      <button className="btn btn-ghost flex-1 text-[13px]" onClick={() => open({ type: 'createFood', meal, draft: { name: q.trim() } })}>
        <IconEdit size={16} /> Create “{q.trim().slice(0, 14)}”
      </button>
    </div>
  );
}

function ActionTile({ Icon, label, onClick }: { Icon: typeof IconBarcode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press flex min-h-[54px] items-center gap-3 rounded-2xl border border-line bg-surface-2 px-3.5 text-left active:bg-surface-3">
      <span className="text-gold">
        <Icon size={20} />
      </span>
      <span className="text-[14px] font-semibold">{label}</span>
    </button>
  );
}

const SOURCE_TAG: Record<Food['source'], string> = { custom: 'My food', off: 'Packaged', usda: 'USDA', quick: 'Quick' };

export function FoodList({ foods, onPick, empty }: { foods: Food[]; onPick: (f: Food) => void; empty: React.ReactNode }) {
  if (!foods.length) return <>{empty}</>;
  return (
    <ul className="card divide-y divide-line/70 overflow-hidden">
      {foods.map((f) => (
        <li key={`${f.source}-${f.id || f.ref || f.name}`}>
          <button onClick={() => onPick(f)} className="press flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-surface-2">
            {f.imageUrl ? (
              <img src={f.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-lg bg-surface-3 object-cover" />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-[11px] font-bold text-faint">{f.name.slice(0, 2).toUpperCase()}</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[15px]">{f.name}</span>
                {f.favorite ? <IconStar filled size={12} className="shrink-0 text-gold" /> : null}
              </div>
              <div className="truncate text-[12px] text-muted">
                {f.brand ? `${f.brand} · ` : ''}
                {f.source === 'usda' && f.portions?.[0] ? f.portions[0].label : servingLabel(f.serving, f.baseUnit)}
                <span className="text-faint"> · {SOURCE_TAG[f.source]}</span>
              </div>
            </div>
            <div className="num text-right text-[14px] text-muted">
              {Math.round(f.source === 'usda' && f.portions?.[0] ? ((f.nutrients.kcal ?? 0) * f.portions[0].grams) / 100 : (f.nutrients.kcal ?? 0))}
              <div className="text-[10.5px] text-faint">cal</div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MealList({ meals, onPick }: { meals: SavedMeal[]; onPick: (m: SavedMeal) => void }) {
  if (!meals.length)
    return (
      <Empty icon={<IconUtensils size={30} />} title="No saved meals">
        Log a meal, then use its ••• menu → “Save as a meal” to re-add it in one tap.
      </Empty>
    );
  return (
    <ul className="card divide-y divide-line/70 overflow-hidden">
      {meals.map((m) => {
        const kcal = m.items.reduce((a, it) => a + (nutrientsFor(it.food, it.amount, it.unit).kcal ?? 0), 0);
        return (
          <li key={m.id}>
            <button onClick={() => onPick(m)} className="press flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2">
              <span className="grid size-10 place-items-center rounded-lg bg-gold/12 text-gold">
                <IconUtensils size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px]">{m.name}</div>
                <div className="truncate text-[12px] text-muted">{m.items.map((i) => i.food.name).join(', ')}</div>
              </div>
              {kcal > 0 ? <div className="num text-[14px] text-muted">{Math.round(kcal)}</div> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
