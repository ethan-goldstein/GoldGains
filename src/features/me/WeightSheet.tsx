import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useUI } from '@/app/store';
import { shortDate, today } from '@/domain/day';
import { kgToLb, lbToKg } from '@/domain/profile';
import { useProfile } from '@/db/hooks';
import { deleteWeight, logWeight } from '@/db/repo';
import { db } from '@/db/schema';
import { NumberField } from '@/ui/controls';
import { IconTrash } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export function WeightSheet() {
  const back = useUI((s) => s.back);
  const profile = useProfile();
  const imperial = profile.units === 'imperial';
  const toUnit = (kg: number) => (imperial ? kgToLb(kg) : kg);
  const [date, setDate] = useState(today());
  const [val, setVal] = useState<number | undefined>(Number(toUnit(profile.weightKg).toFixed(1)));
  const recent = useLiveQuery(async () => (await db.weights.orderBy('date').toArray()).slice(-8).reverse(), []) ?? [];

  return (
    <Sheet
      title="Weigh-in"
      onClose={back}
      footer={
        <button
          className="btn btn-gold w-full"
          disabled={!val || val < 40 || val > 900}
          onClick={async () => {
            if (!val) return;
            await logWeight(date, imperial ? lbToKg(val) : val);
            back();
            toast(`Logged ${val.toFixed(1)} ${imperial ? 'lb' : 'kg'}`);
          }}
        >
          Save weigh-in
        </button>
      }
    >
      <div className="flex gap-2">
        <NumberField value={val} onChange={setVal} suffix={imperial ? 'lb' : 'kg'} className="flex-1 text-2xl font-semibold" autoFocus ariaLabel="Weight" />
        <input type="date" className="field w-[150px]" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
      </div>
      <p className="mt-2 text-[12px] text-faint">Weigh in the morning, after the bathroom, before eating — same conditions each time.</p>
      {recent.length ? (
        <div className="mt-5">
          <div className="eyebrow mb-2">Recent</div>
          <ul className="card divide-y divide-line/70 overflow-hidden">
            {recent.map((w) => (
              <li key={w.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 text-[14px] text-muted">{shortDate(w.date)}</span>
                <span className="num font-semibold">
                  {toUnit(w.kg).toFixed(1)} {imperial ? 'lb' : 'kg'}
                </span>
                <button aria-label="Delete weigh-in" onClick={() => void deleteWeight(w.id)} className="text-faint">
                  <IconTrash size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Sheet>
  );
}
