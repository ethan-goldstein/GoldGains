import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useUI } from '@/app/store';
import { addDays, monthGrid, parseDay, range, shortDate, today, weekdayShort, type DayKey } from '@/domain/day';
import { kgToLb } from '@/domain/profile';
import { dayBudget, useAllGoals, useProfile, useRange, useSettings, type DaySummary } from '@/db/hooks';
import { pickGoal } from '@/db/repo';
import { db, type Goals, type Settings } from '@/db/schema';
import { Logo } from '@/features/today/DayHeader';
import { Legend } from '@/features/workouts/WorkoutsScreen';
import { Bars, type BarDatum } from '@/ui/charts/Bars';
import { LineChart } from '@/ui/charts/Line';
import { MiniRing } from '@/ui/charts/Ring';
import { Segmented } from '@/ui/controls';
import { IconCheck, IconChevronLeft, IconChevronRight, IconScale } from '@/ui/icons';

type Status = 'under' | 'over' | 'none';

function statusOf(s: DaySummary | undefined, goal: Goals | undefined, settings: Settings): { status: Status; kcal: number; budget: number } {
  const { budget } = dayBudget(goal, s?.exerciseKcal ?? 0, settings);
  if (!s || s.entries === 0) return { status: 'none', kcal: 0, budget };
  return { status: s.kcal <= budget ? 'under' : 'over', kcal: s.kcal, budget };
}

export function ProgressScreen() {
  return (
    <div className="pt-safe">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Logo size={34} />
        <h1 className="flex-1 text-[26px] font-bold tracking-tight">Progress</h1>
      </header>
      <div className="space-y-3 px-3">
        <CalendarCard />
        <TrendsCard />
        <WeightCard />
      </div>
    </div>
  );
}

// ── calendar ────────────────────────────────────────────────────────────────

function CalendarCard() {
  const t = today();
  const [, navigate] = useLocation();
  const setDate = useUI((s) => s.setDate);
  const selected = useUI((s) => s.date);
  const [ym, setYm] = useState(() => {
    const d = parseDay(selected);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const grid = monthGrid(ym.y, ym.m);
  const data = useRange(grid[0]!, grid[41]!);
  const goals = useAllGoals();
  const settings = useSettings();
  const title = new Date(ym.y, ym.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const inMonth = grid.filter((d) => parseDay(d).getMonth() === ym.m && d <= t);
  const statuses = inMonth.map((d) => statusOf(data?.get(d), pickGoal(goals, d), settings));
  const logged = statuses.filter((s) => s.status !== 'none');
  const under = logged.filter((s) => s.status === 'under').length;
  const avg = logged.length ? logged.reduce((a, s) => a + s.kcal, 0) / logged.length : 0;

  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <section className="card p-4">
      <div className="flex items-center">
        <button aria-label="Previous month" onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
          <IconChevronLeft size={20} />
        </button>
        <h3 className="flex-1 text-center text-[17px] font-semibold tracking-tight">{title}</h3>
        <button aria-label="Next month" onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
          <IconChevronRight size={20} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold text-faint">
        {grid.slice(0, 7).map((d) => (
          <span key={d}>{weekdayShort(d).slice(0, 1)}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {grid.map((d) => {
          const inM = parseDay(d).getMonth() === ym.m;
          const future = d > t;
          const st = statusOf(data?.get(d), pickGoal(goals, d), settings);
          return (
            <button
              key={d}
              disabled={future}
              onClick={() => {
                setDate(d);
                navigate('/');
              }}
              className={`relative flex flex-col items-center py-1 ${inM ? '' : 'opacity-30'} ${future ? 'opacity-25' : ''}`}
              aria-label={`${parseDay(d).toDateString()}: ${st.status === 'none' ? 'not logged' : `${Math.round(st.kcal)} of ${Math.round(st.budget)} calories, ${st.status} budget`}`}
            >
              <span className={`relative grid size-[38px] place-items-center rounded-full ${d === selected ? 'bg-surface-3' : ''}`}>
                {st.status !== 'none' ? <MiniRing progress={st.budget ? st.kcal / st.budget : 0} over={st.status === 'over'} size={38} stroke={3} /> : null}
                <span className={`num absolute text-[13px] font-semibold ${d === t ? 'text-gold' : st.status === 'none' ? 'text-faint' : 'text-text'}`}>{parseDay(d).getDate()}</span>
              </span>
              <span className="mt-0.5 h-3 text-[9px] leading-3">
                {st.status === 'under' ? <IconCheck size={11} className="text-gold" strokeWidth={3} /> : st.status === 'over' ? <span className="font-bold text-over">+</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <IconCheck size={12} className="text-gold" strokeWidth={3} /> Under budget
        </span>
        <span className="flex items-center gap-1">
          <span className="font-bold text-over">+</span> Over budget
        </span>
        <span>Faded: not logged</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="Days logged" value={`${logged.length}`} />
        <Mini label="Under budget" value={`${under}`} />
        <Mini label="Avg calories" value={logged.length ? Math.round(avg).toLocaleString() : '—'} />
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-2.5">
      <div className="num text-[18px] font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

// ── trends ──────────────────────────────────────────────────────────────────

type RangeKey = '7' | '30' | '90';

function TrendsCard() {
  const [r, setR] = useState<RangeKey>('7');
  const t = today();
  const from = addDays(t, -(Number(r) - 1));
  const days = useMemo(() => range(from, t), [from, t]);
  const data = useRange(from, t);
  const goals = useAllGoals();
  const settings = useSettings();

  const { calBars, macroBars, avg } = useMemo(() => {
    const calBars: BarDatum[] = [];
    const macroBars: BarDatum[] = [];
    let n = 0;
    const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, ex: 0 };
    for (const d of days) {
      const s = data?.get(d);
      const st = statusOf(s, pickGoal(goals, d), settings);
      const label = r === '7' ? weekdayShort(d).slice(0, 2) : String(parseDay(d).getDate());
      calBars.push({
        key: d,
        label,
        target: st.budget,
        parts: [{ value: st.kcal, color: st.status === 'over' ? 'var(--color-over)' : 'var(--color-gold)', name: 'Calories' }],
        tooltip: (
          <span className="num">
            {shortDate(d)} · {Math.round(st.kcal)} / {Math.round(st.budget)} cal
          </span>
        ),
      });
      macroBars.push({
        key: d,
        label,
        parts: [
          { value: (s?.protein ?? 0) * 4, color: 'var(--color-protein)', name: 'Protein' },
          { value: (s?.carbs ?? 0) * 4, color: 'var(--color-carbs)', name: 'Carbs' },
          { value: (s?.fat ?? 0) * 9, color: 'var(--color-fat)', name: 'Fat' },
        ],
        tooltip: (
          <span className="num">
            {shortDate(d)} · P {Math.round(s?.protein ?? 0)} · C {Math.round(s?.carbs ?? 0)} · F {Math.round(s?.fat ?? 0)} g
          </span>
        ),
      });
      if (s && s.entries > 0) {
        n++;
        sum.kcal += s.kcal;
        sum.protein += s.protein;
        sum.carbs += s.carbs;
        sum.fat += s.fat;
        sum.fiber += s.fiber;
        sum.ex += s.exerciseKcal;
      }
    }
    const avg = n ? { kcal: sum.kcal / n, protein: sum.protein / n, carbs: sum.carbs / n, fat: sum.fat / n, fiber: sum.fiber / n, ex: sum.ex / n, n } : null;
    return { calBars, macroBars, avg };
  }, [days, data, goals, settings, r]);

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-tight">Trends</h3>
        <Segmented
          size="sm"
          className="w-[170px]"
          value={r}
          onChange={setR}
          options={[
            { value: '7', label: '7D' },
            { value: '30', label: '30D' },
            { value: '90', label: '90D' },
          ]}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Mini label="Avg cal" value={avg ? Math.round(avg.kcal).toLocaleString() : '—'} />
        <Mini label="Protein" value={avg ? `${Math.round(avg.protein)}g` : '—'} />
        <Mini label="Fiber" value={avg ? `${Math.round(avg.fiber)}g` : '—'} />
        <Mini label="Burned" value={avg ? Math.round(avg.ex).toLocaleString() : '—'} />
      </div>
      <div className="mt-5">
        <div className="mb-2 text-[13px] font-semibold">Calories vs budget</div>
        <Bars data={calBars} height={140} unit=" cal" />
        <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted">
          <Legend color="var(--color-gold)" label="Under budget" />
          <Legend color="var(--color-over)" label="Over" />
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t-2 border-dashed border-gold/70" /> Budget
          </span>
        </div>
      </div>
      <div className="mt-6">
        <div className="mb-2 text-[13px] font-semibold">Calories by macro</div>
        <Bars data={macroBars} height={140} unit=" cal" showTarget={false} />
        <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted">
          <Legend color="var(--color-protein)" label="Protein" />
          <Legend color="var(--color-carbs)" label="Carbs" />
          <Legend color="var(--color-fat)" label="Fat" />
        </div>
        {avg ? (
          <p className="num mt-3 text-center text-[12px] text-muted">
            Average split over {avg.n} logged day{avg.n > 1 ? 's' : ''}: {pct(avg.protein * 4, avg)}% protein · {pct(avg.carbs * 4, avg)}% carbs · {pct(avg.fat * 9, avg)}% fat
          </p>
        ) : null}
      </div>
    </section>
  );
}

const pct = (k: number, a: { protein: number; carbs: number; fat: number }) => {
  const tot = a.protein * 4 + a.carbs * 4 + a.fat * 9;
  return tot ? Math.round((k / tot) * 100) : 0;
};

// ── weight ──────────────────────────────────────────────────────────────────

function WeightCard() {
  const open = useUI((s) => s.open);
  const profile = useProfile();
  const [r, setR] = useState<'30' | '90' | 'all'>('90');
  const since: DayKey = r === 'all' ? '0000-00-00' : addDays(today(), -Number(r));
  const rows = useLiveQuery(() => db.weights.where('date').aboveOrEqual(since).sortBy('date'), [since]) ?? [];
  const imperial = profile.units === 'imperial';
  const conv = (kg: number) => (imperial ? kgToLb(kg) : kg);
  const points = rows.map((w) => ({ x: parseDay(w.date).getTime(), y: conv(w.kg), label: shortDate(w.date) }));
  const change = points.length >= 2 ? points.at(-1)!.y - points[0]!.y : 0;
  const unit = imperial ? 'lb' : 'kg';

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-tight">Weight</h3>
        <Segmented
          size="sm"
          className="w-[170px]"
          value={r}
          onChange={setR}
          options={[
            { value: '30', label: '30D' },
            { value: '90', label: '90D' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>
      {points.length ? (
        <>
          <div className="mt-3 flex items-end gap-4">
            <div>
              <div className="num text-[28px] leading-none font-bold">{points.at(-1)!.y.toFixed(1)}</div>
              <div className="mt-1 text-[11px] text-muted">{unit} · latest</div>
            </div>
            {points.length >= 2 ? (
              <div className={`num pb-0.5 text-[14px] font-semibold ${change <= 0 === (profile.plan !== 'gain') ? 'text-good' : 'text-over'}`}>
                {change > 0 ? '+' : ''}
                {change.toFixed(1)} {unit}
              </div>
            ) : null}
          </div>
          <div className="mt-6">
            <LineChart points={points} goal={profile.goalWeightKg ? conv(profile.goalWeightKg) : undefined} unit={` ${unit}`} />
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-[14px] text-muted">No weigh-ins in this range yet.</p>
      )}
      <button className="btn btn-ghost mt-3 w-full" onClick={() => open({ type: 'weight' })}>
        <IconScale size={18} /> Log weigh-in
      </button>
    </section>
  );
}
