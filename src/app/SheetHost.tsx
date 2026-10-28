import { useEffect } from 'react';
import { AddMenu } from '@/features/add/AddMenu';
import { AddFood } from '@/features/add/AddFood';
import { FoodDetail } from '@/features/add/FoodDetail';
import { EntryEdit } from '@/features/add/EntryEdit';
import { QuickAdd } from '@/features/add/QuickAdd';
import { CreateFood } from '@/features/add/CreateFood';
import { ExerciseSheet } from '@/features/workouts/ExerciseSheet';
import { WeightSheet } from '@/features/me/WeightSheet';
import { ShareSheet } from '@/features/me/ShareSheet';
import { WaterSheet } from '@/features/today/WaterSheet';
import { MealActions, SaveMealSheet } from '@/features/today/MealActions';
import { useUI, type Sheet } from './store';

/**
 * Renders the sheet stack. Lower sheets stay mounted (hidden) so going back keeps
 * their state — e.g. the search you typed before opening a food.
 */
export function SheetHost() {
  const sheets = useUI((s) => s.sheets);
  const back = useUI((s) => s.back);
  const open = sheets.length > 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && back();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, back]);

  return (
    <>
      {sheets.map((s, i) => (
        <div key={s.key} hidden={i !== sheets.length - 1}>
          <SheetView sheet={s} hasBack={i > 0} />
        </div>
      ))}
    </>
  );
}

function SheetView({ sheet, hasBack }: { sheet: Sheet; hasBack: boolean }) {
  switch (sheet.type) {
    case 'addMenu':
      return <AddMenu />;
    case 'addFood':
      return <AddFood meal={sheet.meal} hasBack={hasBack} />;
    case 'food':
      return <FoodDetail meal={sheet.meal} food={sheet.food} hasBack={hasBack} />;
    case 'entry':
      return <EntryEdit entryId={sheet.entryId} />;
    case 'quickAdd':
      return <QuickAdd meal={sheet.meal} hasBack={hasBack} />;
    case 'createFood':
      return <CreateFood meal={sheet.meal} draft={sheet.draft} editId={sheet.editId} hasBack={hasBack} />;
    case 'exercise':
      return <ExerciseSheet exerciseId={sheet.exerciseId} activityId={sheet.activityId} strength={sheet.strength} hasBack={hasBack} />;
    case 'weight':
      return <WeightSheet />;
    case 'water':
      return <WaterSheet />;
    case 'share':
      return <ShareSheet />;
    case 'mealActions':
      return <MealActions meal={sheet.meal} />;
    case 'saveMeal':
      return <SaveMealSheet meal={sheet.meal} />;
  }
}
