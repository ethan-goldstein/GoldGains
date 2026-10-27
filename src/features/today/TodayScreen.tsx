import { useLocation } from 'wouter';
import { useUI } from '@/app/store';
import { today } from '@/domain/day';
import { dayBudget, useDay, useGoalFor, useSettings } from '@/db/hooks';
import { MEALS } from '@/db/schema';
import { BudgetHero } from './BudgetHero';
import { DayHeader } from './DayHeader';
import { ExerciseCard } from './ExerciseCard';
import { MacroCard } from './MacroCard';
import { MealCard } from './MealCard';
import { NutritionDetails } from './NutritionDetails';
import { WaterCard } from './WaterSheet';

export function TodayScreen() {
  const date = useUI((s) => s.date);
  const [, navigate] = useLocation();
  const day = useDay(date);
  const goal = useGoalFor(date);
  const settings = useSettings();
  const { base, budget } = dayBudget(goal, day.exerciseKcal, settings);

  return (
    <>
      <DayHeader onCalendar={() => navigate('/progress')} />
      <div className="space-y-3 px-3 pt-2">
        <BudgetHero
          food={day.food.sum}
          exerciseKcal={day.exerciseKcal}
          base={base}
          budget={budget}
          exerciseCounts={settings.exerciseAddsToBudget}
          goal={goal}
          hasEntries={day.entries.length > 0}
          inProgress={date === today() && (day.food.sum.kcal ?? 0) < budget * 0.75}
        />
        <MacroCard food={day.food.sum} goal={goal} useNetCarbs={settings.netCarbs} />
        {MEALS.map((m) => (
          <MealCard key={m} meal={m} entries={day.byMeal[m]} totals={day.mealTotals[m]} useNetCarbs={settings.netCarbs} />
        ))}
        <ExerciseCard exercises={day.exercises} total={day.exerciseKcal} counts={settings.exerciseAddsToBudget} />
        <WaterCard />
        <NutritionDetails totals={day.food} goal={goal} />
      </div>
    </>
  );
}
