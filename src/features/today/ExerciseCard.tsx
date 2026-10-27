import { useUI } from '@/app/store';
import { deleteExercise, restore } from '@/db/repo';
import type { Exercise } from '@/db/schema';
import { IconPlus } from '@/ui/icons';
import { SwipeRow } from '@/ui/SwipeRow';
import { toast } from '@/ui/Toast';

export function ExerciseCard({ exercises, total, counts }: { exercises: Exercise[]; total: number; counts: boolean }) {
  const open = useUI((s) => s.open);
  const remove = async (x: Exercise) => {
    const row = await deleteExercise(x.id);
    if (row) toast(`Removed ${x.name}`, { action: { label: 'Undo', run: () => void restore('exercises', row) } });
  };
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <span className="text-[19px]" aria-hidden="true">
          🔥
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold tracking-tight">Exercise</h3>
          <div className="text-[12px] text-muted">{counts ? 'Adds to your calorie budget' : 'Not added to your budget'}</div>
        </div>
        <div className="num text-[17px] font-semibold text-good">{total > 0 ? `+${Math.round(total)}` : '0'}</div>
      </div>
      {exercises.length > 0 ? (
        <ul className="divide-y divide-line/70 border-t border-line/70">
          {exercises.map((x) => (
            <li key={x.id}>
              <SwipeRow label={x.name} onTap={() => open({ type: 'exercise', exerciseId: x.id })} onDelete={() => void remove(x)}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg" aria-hidden="true">
                    {x.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{x.name}</div>
                    <div className="truncate text-[12px] text-muted">
                      {x.minutes} min
                      {x.distance ? ` · ${x.distance.value} ${x.distance.unit}` : ''}
                      {x.lifts?.length ? ` · ${x.lifts.length} lift${x.lifts.length > 1 ? 's' : ''}, ${x.lifts.reduce((a, l) => a + l.sets.length, 0)} sets` : ''}
                    </div>
                  </div>
                  <div className="num text-[15px] text-muted">{Math.round(x.kcal)}</div>
                </div>
              </SwipeRow>
            </li>
          ))}
        </ul>
      ) : null}
      <button onClick={() => open({ type: 'exercise' })} className="press flex min-h-[46px] w-full items-center justify-center gap-1.5 border-t border-line/70 text-[14px] font-semibold text-gold active:bg-surface-2">
        <IconPlus size={18} strokeWidth={2.2} /> Add exercise
      </button>
    </section>
  );
}
