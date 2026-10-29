import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useUI } from '@/app/store';
import { ACTIVITIES, ACTIVITY_BY_ID, activeKcal, KIND_LABEL, LIFTS, MUSCLES, type Activity, type ExerciseKind, type LiftLog, type Muscle } from '@/domain/exercise';
import { relativeLabel } from '@/domain/day';
import { useProfile, useSettings } from '@/db/hooks';
import { deleteExercise, restore, saveExercise } from '@/db/repo';
import { db, type Exercise } from '@/db/schema';
import { NumberField, Segmented } from '@/ui/controls';
import { IconClose, IconPlus, IconSearch, IconTrash, IconTrophy } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { isPR, lastLift, liftRecords, type LiftRecord } from './liftHistory';

// stable empty array so memo deps don't change while a query loads
const NONE: never[] = [];

type Mode = 'cardio' | 'strength';

export function ExerciseSheet({ exerciseId, activityId, strength, hasBack }: { exerciseId?: string; activityId?: string; strength?: boolean; hasBack: boolean }) {
  const { back, closeAll } = useUI();
  const existing = useLiveQuery(() => (exerciseId ? db.exercises.get(exerciseId) : undefined), [exerciseId]);
  const [mode, setMode] = useState<Mode>(strength ? 'strength' : 'cardio');
  const [activity, setActivity] = useState<Activity | undefined>(activityId ? ACTIVITY_BY_ID.get(activityId) : undefined);
  const [loaded, setLoaded] = useState(!exerciseId);

  useEffect(() => {
    if (existing && !loaded) {
      setMode(existing.kind === 'strength' ? 'strength' : 'cardio');
      if (existing.activityId) setActivity(ACTIVITY_BY_ID.get(existing.activityId));
      setLoaded(true);
    }
  }, [existing, loaded]);

  if (exerciseId && !loaded) return <Sheet title="" onClose={back}>{null}</Sheet>;

  const close = hasBack ? back : closeAll;
  const title = existing ? 'Edit workout' : mode === 'strength' ? 'Log a lift' : activity ? activity.name : 'Log exercise';

  return (
    <Sheet title={title} onClose={closeAll} onBack={hasBack ? back : activity && !existing && mode === 'cardio' ? () => setActivity(undefined) : undefined} tall>
      {!existing && !activity ? (
        <Segmented
          className="mb-4"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'cardio', label: 'Cardio & sports' },
            { value: 'strength', label: 'Strength' },
          ]}
        />
      ) : null}
      {mode === 'strength' ? (
        <StrengthForm existing={existing} onDone={close} />
      ) : activity ? (
        <CardioForm activity={activity} existing={existing} onDone={close} />
      ) : (
        <ActivityPicker onPick={setActivity} />
      )}
    </Sheet>
  );
}

// ── activity picker ─────────────────────────────────────────────────────────

function ActivityPicker({ onPick }: { onPick: (a: Activity) => void }) {
  const [q, setQ] = useState('');
  const recent = useLiveQuery(async () => {
    const rows = (await db.exercises.orderBy('createdAt').toArray()).slice(-30).reverse();
    const ids: string[] = [];
    for (const r of rows) if (r.activityId && r.kind !== 'strength' && !ids.includes(r.activityId)) ids.push(r.activityId);
    return ids.slice(0, 6).map((id) => ACTIVITY_BY_ID.get(id)).filter((a): a is Activity => !!a);
  }, []);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ACTIVITIES.filter((a) => a.kind !== 'strength' || a.id === 'crossfit' || a.id.startsWith('calisthenics')).filter((a) => !t || a.name.toLowerCase().includes(t));
  }, [q]);
  const groups = (['cardio', 'sport', 'strength', 'other'] as ExerciseKind[]).map((k) => ({ k, items: list.filter((a) => a.kind === k) })).filter((g) => g.items.length);

  return (
    <div>
      <label className="field mb-4 flex items-center gap-2">
        <IconSearch size={18} className="text-muted" />
        <input className="w-full bg-transparent outline-none placeholder:text-faint" placeholder="Search running, basketball, swim…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {!q && recent?.length ? (
        <div className="mb-4">
          <div className="eyebrow mb-2">Recent</div>
          <div className="flex flex-wrap gap-2">
            {recent.map((a) => (
              <button key={a.id} onClick={() => onPick(a)} className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 text-[14px]">
                <span aria-hidden="true">{a.icon}</span>
                {a.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {groups.map((g) => (
        <div key={g.k} className="mb-4">
          <div className="eyebrow mb-2">{KIND_LABEL[g.k]}</div>
          <ul className="card divide-y divide-line/70 overflow-hidden">
            {g.items.map((a) => (
              <li key={a.id}>
                <button onClick={() => onPick(a)} className="press flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-surface-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-lg" aria-hidden="true">
                    {a.icon}
                  </span>
                  <span className="flex-1 text-[15px]">{a.name}</span>
                  <span className="num text-[11px] text-faint">{a.met} MET</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── cardio / sports ─────────────────────────────────────────────────────────

const MINUTE_CHIPS = [15, 30, 45, 60, 90];

function CardioForm({ activity, existing, onDone }: { activity: Activity; existing?: Exercise; onDone: () => void }) {
  const date = useUI((s) => s.date);
  const profile = useProfile();
  const settings = useSettings();
  const [minutes, setMinutes] = useState<number | undefined>(existing?.minutes ?? 30);
  const [distance, setDistance] = useState<number | undefined>(existing?.distance?.value);
  const [manual, setManual] = useState<number | undefined>(existing?.kcalManual ? existing.kcal : undefined);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const estimate = Math.round(activeKcal(activity.met, profile.weightKg, minutes ?? 0));
  const kcal = manual ?? estimate;
  const dUnit = existing?.distance?.unit ?? settings.distanceUnit;
  const pace = distance && minutes ? minutes / distance : undefined;

  const save = async () => {
    if (!minutes) return;
    await saveExercise({
      ...(existing ? { id: existing.id, createdAt: existing.createdAt } : {}),
      date: existing?.date ?? date,
      kind: activity.kind,
      activityId: activity.id,
      name: activity.name,
      icon: activity.icon,
      minutes,
      ...(distance ? { distance: { value: distance, unit: dUnit } } : {}),
      kcal,
      kcalManual: manual !== undefined,
      ...(notes.trim() ? { notes: notes.trim().slice(0, 1000) } : {}),
    });
    toast(`${existing ? 'Updated' : 'Logged'} ${activity.name.split(',')[0]} · ${kcal} cal`);
    onDone();
  };

  return (
    <div className="space-y-5">
      <div className="card flex items-center gap-4 p-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-good/12 text-3xl" aria-hidden="true">
          {activity.icon}
        </span>
        <div className="flex-1">
          <div className="num text-[34px] leading-none font-bold text-good">{kcal}</div>
          <div className="mt-1 text-[12px] text-muted">{manual !== undefined ? 'active calories (from you)' : `active calories · ${relativeLabel(existing?.date ?? date)}`}</div>
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2">Duration</div>
        <NumberField value={minutes} onChange={setMinutes} suffix="min" integer autoFocus={!existing} ariaLabel="Minutes" max={1440} />
        <div className="mt-2 flex gap-2">
          {MINUTE_CHIPS.map((m) => (
            <button key={m} onClick={() => setMinutes(m)} className={`h-9 flex-1 rounded-full border text-[13px] font-semibold ${minutes === m ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {activity.distance ? (
        <div>
          <div className="eyebrow mb-2">Distance (optional)</div>
          <NumberField value={distance} onChange={setDistance} suffix={dUnit} placeholder="—" ariaLabel="Distance" />
          {pace && Number.isFinite(pace) ? (
            <p className="mt-1.5 text-[12px] text-muted">
              Pace {Math.floor(pace)}:{String(Math.round((pace % 1) * 60)).padStart(2, '0')} / {dUnit}
            </p>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="eyebrow mb-2">Calories from your watch (optional)</div>
        <NumberField value={manual} onChange={setManual} suffix="cal" placeholder={String(estimate)} integer ariaLabel="Calories burned" />
        <p className="mt-1.5 text-[11.5px] text-faint">
          Estimate: {activity.met} MET × {Math.round(profile.weightKg)} kg × time, counting only calories above resting (matches Apple Watch “Active”).
        </p>
      </div>

      <input className="field" placeholder="Notes (optional)" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex gap-2 pt-1">
        {existing ? <DeleteButton exercise={existing} onDone={onDone} /> : null}
        <button className="btn btn-gold flex-1" disabled={!minutes} onClick={() => void save()}>
          {existing ? 'Save' : 'Log workout'}
        </button>
      </div>
    </div>
  );
}

function DeleteButton({ exercise, onDone }: { exercise: Exercise; onDone: () => void }) {
  return (
    <button
      aria-label="Delete workout"
      className="btn btn-danger w-14 px-0"
      onClick={async () => {
        const row = await deleteExercise(exercise.id);
        onDone();
        if (row) toast(`Removed ${row.name}`, { action: { label: 'Undo', run: () => void restore('exercises', row) } });
      }}
    >
      <IconTrash size={20} />
    </button>
  );
}

// ── strength ────────────────────────────────────────────────────────────────

function StrengthForm({ existing, onDone }: { existing?: Exercise; onDone: () => void }) {
  const date = useUI((s) => s.date);
  const profile = useProfile();
  const settings = useSettings();
  const unit = settings.liftUnit;
  const [name, setName] = useState(existing?.name ?? 'Lift');
  const [minutes, setMinutes] = useState<number | undefined>(existing?.minutes ?? 60);
  const [hard, setHard] = useState(existing?.activityId !== 'lifting-moderate');
  const [lifts, setLifts] = useState<LiftLog[]>(existing?.lifts ?? []);
  const [picking, setPicking] = useState(!existing);
  const [manual, setManual] = useState<number | undefined>(existing?.kcalManual ? existing.kcal : undefined);
  const strengthRows = useLiveQuery(() => db.exercises.where('kind').equals('strength').toArray(), []) ?? NONE;
  const records = useMemo(() => liftRecords(strengthRows.filter((x) => x.id !== existing?.id), unit), [strengthRows, existing?.id, unit]);

  const activity = ACTIVITY_BY_ID.get(hard ? 'lifting' : 'lifting-moderate')!;
  const estimate = Math.round(activeKcal(activity.met, profile.weightKg, minutes ?? 0));
  const kcal = manual ?? estimate;
  const setCount = lifts.reduce((a, l) => a + l.sets.length, 0);

  const addLift = async (liftId: string, liftName: string) => {
    setPicking(false);
    const prev = await lastLift(liftId, existing?.id);
    const sets = prev ? prev.log.sets.map((s) => ({ reps: s.reps, weight: prev.log.unit === unit ? s.weight : 0 })) : [{ reps: 8, weight: 0 }];
    setLifts((ls) => [...ls, { liftId, name: liftName, unit, sets }]);
  };

  const update = (i: number, l: LiftLog) => setLifts((ls) => ls.map((x, j) => (j === i ? l : x)));

  const save = async () => {
    const cleaned = lifts.map((l) => ({ ...l, sets: l.sets.filter((s) => s.reps > 0) })).filter((l) => l.sets.length);
    await saveExercise({
      ...(existing ? { id: existing.id, createdAt: existing.createdAt } : {}),
      date: existing?.date ?? date,
      kind: 'strength',
      activityId: activity.id,
      name: name.trim() || 'Lift',
      icon: '🏋️',
      minutes: minutes ?? 0,
      kcal,
      kcalManual: manual !== undefined,
      lifts: cleaned,
    });
    const prs = cleaned.filter((l) => l.sets.some((s) => isPR(s.weight, s.reps, l.unit, records.get(l.liftId)))).length;
    toast(prs ? `Logged — ${prs} new PR${prs > 1 ? 's' : ''} 🏆` : `Logged ${name.trim() || 'lift'} · ${kcal} cal`);
    onDone();
  };

  if (picking) return <LiftPicker onPick={(id, n) => void addLift(id, n)} onCancel={lifts.length ? () => setPicking(false) : undefined} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Push day, Legs…" maxLength={60} aria-label="Workout name" />
        <NumberField value={minutes} onChange={setMinutes} suffix="min" integer ariaLabel="Minutes" />
      </div>
      <Segmented
        size="sm"
        value={hard ? 'hard' : 'moderate'}
        onChange={(v) => setHard(v === 'hard')}
        options={[
          { value: 'hard', label: 'Hard / heavy' },
          { value: 'moderate', label: 'Moderate' },
        ]}
      />

      {lifts.map((l, i) => (
        <LiftCard key={`${l.liftId}-${i}`} lift={l} record={records.get(l.liftId)} onChange={(x) => update(i, x)} onRemove={() => setLifts((ls) => ls.filter((_, j) => j !== i))} />
      ))}

      <button onClick={() => setPicking(true)} className="btn btn-ghost w-full border-dashed text-gold">
        <IconPlus size={18} /> Add exercise
      </button>

      <div className="card flex items-center gap-3 p-3.5">
        <div className="flex-1">
          <div className="num text-[24px] font-bold text-good">{kcal}</div>
          <div className="text-[11.5px] text-muted">
            active cal · {lifts.length} exercises · {setCount} sets
          </div>
        </div>
        <NumberField value={manual} onChange={setManual} placeholder={String(estimate)} suffix="cal" integer className="w-32" ariaLabel="Calories from your watch" />
      </div>

      <div className="flex gap-2">
        {existing ? <DeleteButton exercise={existing} onDone={onDone} /> : null}
        <button className="btn btn-gold flex-1" disabled={!lifts.length && !minutes} onClick={() => void save()}>
          {existing ? 'Save workout' : 'Finish workout'}
        </button>
      </div>
    </div>
  );
}

function LiftCard({ lift, record, onChange, onRemove }: { lift: LiftLog; record: LiftRecord | undefined; onChange: (l: LiftLog) => void; onRemove: () => void }) {
  const setSet = (i: number, patch: Partial<{ reps: number; weight: number }>) => onChange({ ...lift, sets: lift.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{lift.name}</div>
          {record ? (
            <div className="num text-[11.5px] text-muted">
              Best: {Math.round(record.best.weight)} {lift.unit} × {record.best.reps} · est. 1RM {Math.round(record.e1rm)}
            </div>
          ) : (
            <div className="text-[11.5px] text-faint">First time logging this — set the bar</div>
          )}
        </div>
        <button aria-label={`Remove ${lift.name}`} onClick={onRemove} className="grid size-8 place-items-center rounded-full text-faint active:bg-surface-2">
          <IconClose size={16} />
        </button>
      </div>
      <div className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-x-2 gap-y-1.5 px-3.5 pb-2 text-[11px] text-faint">
        <span>Set</span>
        <span>{lift.unit}</span>
        <span>Reps</span>
        <span />
        {lift.sets.map((s, i) => {
          const pr = isPR(s.weight, s.reps, lift.unit, record);
          return (
            <div key={i} className="contents">
              <span className={`num text-center text-[13px] font-semibold ${pr ? 'text-gold' : 'text-muted'}`}>{pr ? <IconTrophy size={15} className="inline" /> : i + 1}</span>
              <NumberField value={s.weight || undefined} onChange={(v) => setSet(i, { weight: v ?? 0 })} placeholder="0" className="min-h-[40px]! text-[15px]" ariaLabel={`Set ${i + 1} weight`} />
              <NumberField value={s.reps || undefined} onChange={(v) => setSet(i, { reps: Math.round(v ?? 0) })} placeholder="0" integer className="min-h-[40px]! text-[15px]" ariaLabel={`Set ${i + 1} reps`} />
              <button aria-label={`Remove set ${i + 1}`} onClick={() => onChange({ ...lift, sets: lift.sets.filter((_, j) => j !== i) })} className="text-faint">
                <IconClose size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          const last = lift.sets.at(-1);
          onChange({ ...lift, sets: [...lift.sets, { reps: last?.reps ?? 8, weight: last?.weight ?? 0 }] });
        }}
        className="w-full border-t border-line/70 py-2.5 text-[13px] font-semibold text-gold active:bg-surface-2"
      >
        + Add set
      </button>
    </div>
  );
}

function LiftPicker({ onPick, onCancel }: { onPick: (id: string, name: string) => void; onCancel?: () => void }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState<Muscle | 'All'>('All');
  const t = q.trim().toLowerCase();
  const list = LIFTS.filter((l) => (muscle === 'All' || l.muscle === muscle) && (!t || l.name.toLowerCase().includes(t)));
  return (
    <div>
      <div className="flex gap-2">
        <label className="field flex flex-1 items-center gap-2">
          <IconSearch size={18} className="text-muted" />
          <input className="w-full bg-transparent outline-none placeholder:text-faint" placeholder="Search exercises" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {onCancel ? (
          <button className="btn btn-ghost px-4" onClick={onCancel}>
            Done
          </button>
        ) : null}
      </div>
      <div className="no-scrollbar -mx-4 my-3 flex gap-2 overflow-x-auto px-4">
        {(['All', ...MUSCLES] as const).map((m) => (
          <button key={m} onClick={() => setMuscle(m)} className={`h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold ${m === muscle ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>
            {m}
          </button>
        ))}
      </div>
      <ul className="card divide-y divide-line/70 overflow-hidden">
        {list.map((l) => (
          <li key={l.id}>
            <button onClick={() => onPick(l.id, l.name)} className="press flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-surface-2">
              <span className="flex-1 text-[15px]">{l.name}</span>
              <span className="text-[11.5px] text-faint">{l.muscle}</span>
            </button>
          </li>
        ))}
        {t && !LIFTS.some((l) => l.name.toLowerCase() === t) ? (
          <li>
            <button onClick={() => onPick(`custom:${t}`, q.trim().slice(0, 60))} className="press flex w-full items-center gap-3 px-3.5 py-3 text-left text-gold active:bg-surface-2">
              <IconPlus size={16} /> Add “{q.trim().slice(0, 40)}”
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
