import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useUI, type FoodDraft } from '@/app/store';
import { atwaterKcal } from '@/domain/math';
import { LABEL_ORDER, NUTRIENTS, type NutrientKey, type Nutrients } from '@/domain/nutrients';
import { deleteFood, saveFood } from '@/db/repo';
import { db, type MealKey } from '@/db/schema';
import { NumberField } from '@/ui/controls';
import { IconTrash, IconWarn } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

const CORE: NutrientKey[] = ['kcal', 'protein', 'carbs', 'fat'];

/** The full-label form: used for custom foods, label scans, and unknown barcodes. */
export function CreateFood({ meal, draft, editId, hasBack }: { meal?: MealKey; draft?: FoodDraft; editId?: string; hasBack: boolean }) {
  const { back, closeAll, swap } = useUI();
  const editing = useLiveQuery(() => (editId ? db.foods.get(editId) : undefined), [editId]);
  const [name, setName] = useState(draft?.name ?? '');
  const [brand, setBrand] = useState(draft?.brand ?? '');
  const [qty, setQty] = useState<number | undefined>(draft?.serving?.qty ?? 1);
  const [unit, setUnit] = useState(draft?.serving?.unit ?? 'serving');
  const [grams, setGrams] = useState<number | undefined>(draft?.serving?.grams);
  const [n, setN] = useState<Nutrients>(draft?.nutrients ?? {});
  const [showAll, setShowAll] = useState(!!draft?.nutrients && Object.keys(draft.nutrients).length > 4);
  const [flagged, setFlagged] = useState<Set<string>>(new Set(draft?.flagged ?? []));
  const [loaded, setLoaded] = useState(!editId);

  useEffect(() => {
    if (editing && !loaded) {
      setName(editing.name);
      setBrand(editing.brand ?? '');
      setQty(editing.serving.qty);
      setUnit(editing.serving.unit);
      setGrams(editing.serving.grams);
      setN(editing.nutrients);
      setShowAll(true);
      setLoaded(true);
    }
  }, [editing, loaded]);

  const set = (k: NutrientKey, v: number | undefined) => {
    setN((cur) => {
      const next = { ...cur };
      if (v === undefined) delete next[k];
      else next[k] = v;
      return next;
    });
    if (flagged.has(k)) setFlagged((f) => new Set([...f].filter((x) => x !== k)));
  };

  const implied = atwaterKcal(n);
  const kcal = n.kcal;
  const mismatch = kcal !== undefined && implied > 0 && Math.abs(kcal - implied) > Math.max(15, kcal * 0.2);
  const valid = name.trim().length > 0 && kcal !== undefined && (qty ?? 0) > 0 && unit.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    const isMass = /^(g|grams?|ml)$/i.test(unit.trim());
    const u = isMass ? unit.trim().toLowerCase().replace(/^grams?$/, 'g') : unit.trim();
    const row = await saveFood({
      ...(editing ?? {}),
      ...(editId ? { id: editId } : {}),
      source: 'custom',
      name: name.trim().slice(0, 120),
      ...(brand.trim() ? { brand: brand.trim().slice(0, 60) } : { brand: undefined }),
      ...(draft?.barcode || editing?.barcode ? { barcode: draft?.barcode ?? editing?.barcode } : {}),
      serving: { qty: qty!, unit: u.slice(0, 40), ...(isMass ? { grams: qty } : grams ? { grams } : {}) },
      nutrients: n,
      ...(u === 'ml' ? { baseUnit: 'ml' as const } : {}),
    });
    toast(editId ? 'Food updated' : `Saved ${row.name}`);
    if (meal && !editId) swap({ type: 'food', meal, food: row });
    else if (hasBack) back();
    else closeAll();
  };

  const rows = showAll ? LABEL_ORDER : CORE;

  return (
    <Sheet
      title={editId ? 'Edit food' : draft?.flagged ? 'Check the label' : 'Create food'}
      onClose={closeAll}
      onBack={hasBack ? back : undefined}
      tall
      footer={
        <div className="flex gap-2">
          {editId ? (
            <button
              aria-label="Delete food"
              className="btn btn-danger w-14 px-0"
              onClick={async () => {
                await deleteFood(editId);
                toast('Food deleted (past logs keep their copy)');
                closeAll();
              }}
            >
              <IconTrash size={20} />
            </button>
          ) : null}
          <button className="btn btn-gold flex-1" disabled={!valid} onClick={() => void save()}>
            {editId ? 'Save changes' : meal ? 'Save & choose amount' : 'Save food'}
          </button>
        </div>
      }
    >
      {draft?.warnings?.length || flagged.size ? (
        <div className="mb-4 flex gap-3 rounded-2xl border border-over/30 bg-over/10 p-3 text-[13px]">
          <IconWarn size={18} className="mt-0.5 shrink-0 text-over" />
          <div>
            <p className="font-semibold text-text">Double-check the highlighted fields</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
              {(draft?.warnings ?? []).map((w) => (
                <li key={w}>{w}</li>
              ))}
              {flagged.size ? <li>The scan wasn’t sure about {flagged.size} value{flagged.size > 1 ? 's' : ''}.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <input className="field" placeholder="Food name *" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} aria-label="Food name" />
        <input className="field" placeholder="Brand (optional)" value={brand} maxLength={60} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" />
        {draft?.barcode ? <div className="num px-1 text-[12px] text-faint">Barcode {draft.barcode} — next scan will find this food instantly</div> : null}
      </div>

      <div className="mt-5">
        <div className="eyebrow mb-2">Serving size</div>
        <div className="grid grid-cols-[88px_1fr_120px] gap-2">
          <NumberField value={qty} onChange={setQty} ariaLabel="Serving amount" highlight={flagged.has('serving')} />
          <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cup, bar, g…" maxLength={40} aria-label="Serving unit" />
          {/^(g|grams?|ml)$/i.test(unit.trim()) ? (
            <div className="field flex items-center justify-center text-[13px] text-faint">by weight</div>
          ) : (
            <NumberField value={grams} onChange={setGrams} suffix="g" placeholder="weight" ariaLabel="Serving weight in grams" highlight={flagged.has('grams')} />
          )}
        </div>
        <p className="mt-1.5 px-1 text-[11.5px] text-faint">Add the gram weight from the label to log by g or oz later.</p>
      </div>

      <div className="mt-5">
        <div className="eyebrow mb-2">Nutrition per serving</div>
        <div className="card divide-y divide-line/70 overflow-hidden">
          {rows.map((k) => {
            const def = NUTRIENTS[k];
            return (
              <label key={k} className="flex items-center gap-3 px-3.5 py-1.5" style={{ paddingLeft: 14 + (def.indent ?? 0) * 14 }}>
                <span className={`flex-1 text-[14px] ${def.indent ? 'text-muted' : 'font-medium'}`}>
                  {def.label}
                  {k === 'kcal' ? ' *' : ''}
                </span>
                <NumberField
                  value={n[k]}
                  onChange={(v) => set(k, v)}
                  suffix={def.unit === 'kcal' ? 'cal' : def.unit}
                  placeholder="—"
                  className="w-32 min-h-[42px]!"
                  ariaLabel={def.label}
                  highlight={flagged.has(k)}
                />
              </label>
            );
          })}
        </div>
        <button onClick={() => setShowAll((s) => !s)} className="mt-2 w-full py-2 text-[13px] font-semibold text-gold">
          {showAll ? 'Show fewer' : 'Add fiber, sugars, sodium, vitamins…'}
        </button>
        {mismatch ? (
          <p className="mt-1 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-[12.5px] text-muted">
            <IconWarn size={16} className="mt-0.5 shrink-0 text-over" />
            The macros add up to about {Math.round(implied)} cal, but calories say {Math.round(kcal!)}. Worth a second look.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
