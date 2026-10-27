import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { useUI } from '@/app/store';
import { addDays, dayKey, parseDay, relativeLabel, today, weekdayLetter, weekOf } from '@/domain/day';
import { streak } from '@/domain/score';
import { dayBudget, useAllGoals, useRange, useSettings } from '@/db/hooks';
import { pickGoal } from '@/db/repo';
import { db } from '@/db/schema';
import { MiniRing } from '@/ui/charts/Ring';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconFlame } from '@/ui/icons';

export function DayHeader({ onCalendar }: { onCalendar: () => void }) {
  const date = useUI((s) => s.date);
  const setDate = useUI((s) => s.setDate);
  const week = weekOf(date);
  const range = useRange(week[0]!, week[6]!);
  const goals = useAllGoals();
  const settings = useSettings();
  const loggedDays = useLiveQuery(async () => new Set((await db.entries.orderBy('date').uniqueKeys()) as string[]), []);
  const t = today();
  const streakN = useMemo(() => (loggedDays ? streak(loggedDays, t) : 0), [loggedDays, t]);
  const isToday = date === t;

  return (
    <header className="pt-safe sticky top-0 z-20 bg-black/85 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1">
          <button aria-label="Previous day" onClick={() => setDate(addDays(date, -1))} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
            <IconChevronLeft size={20} />
          </button>
          <button onClick={onCalendar} className="min-w-[132px] rounded-full px-2 py-1 text-center text-[15px] font-semibold tracking-tight active:bg-surface-2">
            {relativeLabel(date)}
          </button>
          <button aria-label="Next day" onClick={() => setDate(addDays(date, 1))} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
            <IconChevronRight size={20} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <div
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-semibold ${streakN > 0 ? 'bg-gold/12 text-gold' : 'bg-surface-2 text-faint'}`}
            aria-label={`${streakN}-day logging streak`}
          >
            <IconFlame size={16} />
            <span className="num">{streakN}</span>
          </div>
          <button aria-label="Open calendar" onClick={onCalendar} className="grid size-9 place-items-center rounded-full text-muted active:bg-surface-2">
            <IconCalendar size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 px-2 pb-2">
        {week.map((d) => {
          const s = range?.get(d);
          const g = pickGoal(goals, d);
          const { budget } = dayBudget(g, s?.exerciseKcal ?? 0, settings);
          const kcal = s?.kcal ?? 0;
          const sel = d === date;
          const future = d > t;
          return (
            <button key={d} onClick={() => setDate(d)} className="flex flex-col items-center gap-1 py-1" aria-label={parseDay(d).toDateString()} aria-pressed={sel}>
              <span className={`text-[11px] font-semibold ${sel ? 'text-gold' : d === t ? 'text-text' : 'text-faint'}`}>{weekdayLetter(d)}</span>
              <span className={`relative grid size-[34px] place-items-center rounded-full ${sel ? 'bg-surface-3' : ''}`}>
                {!future ? <MiniRing progress={budget ? kcal / budget : 0} over={kcal > budget * 1.02} size={34} stroke={3} /> : null}
                <span className={`num absolute text-[12px] font-semibold ${future ? 'text-faint' : sel ? 'text-text' : 'text-muted'}`}>{parseDay(d).getDate()}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!isToday ? (
        <button onClick={() => setDate(dayKey())} className="absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full border border-line bg-surface-3 px-3 py-1 text-xs font-semibold text-gold shadow-lg">
          Jump to today
        </button>
      ) : null}
    </header>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[9px] bg-[linear-gradient(145deg,var(--color-gold-bright),var(--color-gold)_50%,var(--color-gold-deep))] font-black text-[#1a1305]"
      style={{ width: size, height: size, fontSize: size * 0.42, letterSpacing: '-0.06em' }}
      aria-label="GoldGains"
    >
      GG
    </div>
  );
}
