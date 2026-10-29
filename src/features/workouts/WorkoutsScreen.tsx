import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useUI } from '@/app/store';
import { addDays, relativeLabel, today, weekdayShort, weekOf } from '@/domain/day';
import { useSettings } from '@/db/hooks';
import { db, type Exercise } from '@/db/schema';
import { ScreenHeader } from '@/ui/Brand';
import { Bars } from '@/ui/charts/Bars';
import { Empty } from '@/ui/controls';
import { IconDumbbell, IconFlame, IconTimer, IconTrophy } from '@/ui/icons';
import { liftRecords } from './liftHistory';

// stable empty array so memo deps don't change while a query loads
const NONE: never[] = [];

export function WorkoutsScreen() {
  const open = useUI((s) => s.open);
  const setDate = useUI((s) => s.setDate);
  const settings = useSettings();
  const t = today();
  const week = weekOf(t);
  const since = addDays(t, -90);
  // newest first, reversed in JS: Safari can fail reverse queries with "Unable to open cursor"
  const rows = useLiveQuery(async () => (await db.exercises.where('date').aboveOrEqual(since).sortBy('date')).reverse(), [since]) ?? NONE;
  const strength = useLiveQuery(() => db.exercises.where('kind').equals('strength').toArray(), []) ?? NONE;
  const records = useMemo(() => [...liftRecords(strength, settings.liftUnit).values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, 8), [strength, settings.liftUnit]);

  const thisWeek = rows.filter((r) => r.date >= week[0]! && r.date <= week[6]!);
  const mins = thisWeek.reduce((a, r) => a + r.minutes, 0);
  const kcal = thisWeek.reduce((a, r) => a + r.kcal, 0);
  const activeDays = new Set(thisWeek.map((r) => r.date)).size;

  const byDay = week.map((d) => {
    const ds = thisWeek.filter((r) => r.date === d);
    const cardio = ds.filter((r) => r.kind !== 'strength').reduce((a, r) => a + r.minutes, 0);
    const lift = ds.filter((r) => r.kind === 'strength').reduce((a, r) => a + r.minutes, 0);
    return {
      key: d,
      label: weekdayShort(d).slice(0, 2),
      parts: [
        { value: lift, color: 'var(--color-chart-strength)', name: 'Strength' },
        { value: cardio, color: 'var(--color-chart-cardio)', name: 'Cardio & sports' },
      ],
      tooltip: (
        <span className="num">
          {weekdayShort(d)} · {lift + cardio} min
        </span>
      ),
    };
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Exercise[]>();
    for (const r of rows.slice(0, 60)) {
      const list = m.get(r.date) ?? [];
      list.push(r);
      m.set(r.date, list);
    }
    return [...m.entries()];
  }, [rows]);

  return (
    <div className="pt-safe">
      <ScreenHeader title="Workouts" />
      <div className="space-y-3 px-3">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              setDate(t);
              open({ type: 'exercise' });
            }}
            className="press card flex h-[88px] flex-col justify-between p-3.5 text-left active:bg-surface-2"
          >
            <span className="text-2xl" aria-hidden="true">
              🏃
            </span>
            <span className="text-[15px] font-semibold">Cardio & sports</span>
          </button>
          <button
            onClick={() => {
              setDate(t);
              open({ type: 'exercise', strength: true });
            }}
            className="press card flex h-[88px] flex-col justify-between border-gold/30 bg-[linear-gradient(160deg,rgba(242,193,78,0.14),transparent_60%)] p-3.5 text-left"
          >
            <span className="text-2xl" aria-hidden="true">
              🏋️
            </span>
            <span className="text-[15px] font-semibold">Start a lift</span>
          </button>
        </div>

        <section className="card p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[17px] font-semibold tracking-tight">This week</h3>
            <span className="text-[12px] text-muted">{activeDays} / 7 active days</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Tile Icon={IconTimer} value={`${mins}`} unit="min" label="Active time" />
            <Tile Icon={IconFlame} value={Math.round(kcal).toLocaleString()} unit="cal" label="Burned" />
            <Tile Icon={IconDumbbell} value={`${thisWeek.length}`} unit="" label="Sessions" />
          </div>
          <div className="mt-4">
            <Bars data={byDay} height={110} unit=" min" showTarget={false} />
            <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted">
              <Legend color="var(--color-chart-strength)" label="Strength" />
              <Legend color="var(--color-chart-cardio)" label="Cardio & sports" />
            </div>
          </div>
        </section>

        {records.length ? (
          <section className="card p-4">
            <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
              <IconTrophy size={18} className="text-gold" /> Personal records
            </h3>
            <ul className="mt-3 divide-y divide-line/70">
              {records.map((r) => (
                <li key={r.liftId} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px]">{r.name}</div>
                    <div className="num text-[11.5px] text-muted">
                      {Math.round(r.best.weight)} {r.unit} × {r.best.reps} · {relativeLabel(r.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[17px] font-semibold text-gold">{Math.round(r.e1rm)}</div>
                    <div className="text-[10.5px] text-faint">est. 1RM {r.unit}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="px-1 pt-2 pb-2 text-[17px] font-semibold tracking-tight">History</h3>
          {grouped.length ? (
            <div className="space-y-3">
              {grouped.map(([d, list]) => (
                <div key={d}>
                  <div className="eyebrow mb-1.5 px-1">{relativeLabel(d)}</div>
                  <ul className="card divide-y divide-line/70 overflow-hidden">
                    {list.map((x) => (
                      <li key={x.id}>
                        <button onClick={() => open({ type: 'exercise', exerciseId: x.id })} className="press flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-surface-2">
                          <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-lg" aria-hidden="true">
                            {x.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px]">{x.name}</div>
                            <div className="truncate text-[12px] text-muted">
                              {x.minutes} min
                              {x.distance ? ` · ${x.distance.value} ${x.distance.unit}` : ''}
                              {x.lifts?.length ? ` · ${x.lifts.map((l) => l.name).join(', ')}` : ''}
                            </div>
                          </div>
                          <div className="num text-[14px] text-good">+{Math.round(x.kcal)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty icon={<IconDumbbell size={34} />} title="No workouts yet">
                Log a run, a game, or a lift. Calories you burn add to that day’s budget.
              </Empty>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({ Icon, value, unit, label }: { Icon: typeof IconTimer; value: string; unit: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <Icon size={16} className="text-muted" />
      <div className="num mt-1 text-[20px] font-semibold">
        {value}
        <span className="ml-0.5 text-[11px] font-normal text-muted">{unit}</span>
      </div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}
