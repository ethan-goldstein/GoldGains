import { useState } from 'react';
import { gainsScore } from '@/domain/score';
import type { Nutrients } from '@/domain/nutrients';
import type { Goals } from '@/db/schema';
import { Ring } from '@/ui/charts/Ring';

interface Props {
  food: Nutrients;
  exerciseKcal: number;
  base: number;
  budget: number;
  exerciseCounts: boolean;
  goal: Goals | undefined;
  hasEntries: boolean;
  /** today, before most of the budget is eaten: score is "so far", no letter grade yet */
  inProgress: boolean;
}

/** Lose It!-style budget math with a gold ring: Budget − Food + Exercise = Left */
export function BudgetHero({ food, exerciseKcal, base, budget, exerciseCounts, goal, hasEntries, inProgress }: Props) {
  const [showScore, setShowScore] = useState(false);
  const eaten = food.kcal ?? 0;
  const left = budget - eaten;
  const over = left < 0;
  const score = goal
    ? gainsScore(food, {
        budget,
        protein: goal.protein,
        fiberMin: goal.fiberMin,
        addedSugarMax: goal.addedSugarMax,
        sodiumMax: goal.sodiumMax,
      })
    : undefined;

  return (
    <section className="card relative overflow-hidden px-4 pt-5 pb-4">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <Ring progress={budget > 0 ? eaten / budget : 0} size={208} stroke={15} label={`${Math.abs(Math.round(left))} calories ${over ? 'over' : 'left'}`}>
          <div className="text-center">
            <div className={`num text-[46px] leading-none font-bold tracking-tight ${over ? 'text-over' : ''}`}>{Math.abs(Math.round(left)).toLocaleString()}</div>
            <div className={`mt-1.5 text-[13px] font-medium ${over ? 'text-over' : 'text-muted'}`}>{over ? 'calories over' : 'calories left'}</div>
            {score && hasEntries ? (
              <button
                onClick={() => setShowScore((s) => !s)}
                className="pointer-events-auto mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[12px] font-semibold text-gold"
                aria-expanded={showScore}
              >
                Gains score <span className="num">{score.score}</span>
                {inProgress ? <span className="font-normal text-gold/70">so far</span> : <span className="rounded bg-gold px-1 text-[10px] text-black">{score.grade}</span>}
              </button>
            ) : null}
          </div>
        </Ring>
      </div>

      {showScore && score ? (
        <div className="animate-pop-in relative mt-4 space-y-2 rounded-2xl bg-surface-2 p-3">
          {score.parts.map((p) => (
            <div key={p.key} className="flex items-center gap-3 text-[13px]">
              <span className="flex-1">{p.label}</span>
              <span className="text-muted">{p.detail}</span>
              <span className="num w-12 text-right font-semibold">
                {p.points}/{p.max}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative mt-5 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-center text-center">
        <Stat label="Budget" value={base} />
        <Op>−</Op>
        <Stat label="Food" value={eaten} />
        <Op>+</Op>
        <Stat label="Exercise" value={exerciseKcal} muted={!exerciseCounts} accent="var(--color-good)" />
        <Op>=</Op>
        <Stat label={over ? 'Over' : 'Left'} value={Math.abs(left)} accent={over ? 'var(--color-over)' : 'var(--color-gold)'} />
      </div>
    </section>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: number; accent?: string; muted?: boolean }) {
  return (
    <div className={muted ? 'opacity-40' : ''}>
      <div className="num text-[17px] font-semibold" style={accent ? { color: accent } : undefined}>
        {Math.round(value).toLocaleString()}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

const Op = ({ children }: { children: string }) => <div className="px-0.5 text-sm text-faint">{children}</div>;
