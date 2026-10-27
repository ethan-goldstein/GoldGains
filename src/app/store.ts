import { create } from 'zustand';
import { today, type DayKey } from '@/domain/day';
import type { Food, FoodCore } from '@/domain/food';
import type { Nutrients } from '@/domain/nutrients';
import type { MealKey } from '@/db/schema';

/** Prefill for the custom-food form, e.g. from a label scan */
export interface FoodDraft {
  name?: string;
  brand?: string;
  barcode?: string;
  serving?: { qty: number; unit: string; grams?: number };
  nutrients?: Nutrients;
  /** fields the label reader wasn't sure about */
  flagged?: string[];
  warnings?: string[];
}

export type Sheet =
  | { type: 'addMenu' }
  | { type: 'addFood'; meal: MealKey }
  | { type: 'food'; meal: MealKey; food: Food | (FoodCore & { id?: undefined; source: 'usda' | 'off'; ref?: string; barcode?: string; imageUrl?: string }) }
  | { type: 'entry'; entryId: string }
  | { type: 'quickAdd'; meal: MealKey }
  | { type: 'createFood'; meal?: MealKey; draft?: FoodDraft; editId?: string }
  | { type: 'exercise'; exerciseId?: string; activityId?: string; strength?: boolean }
  | { type: 'weight' }
  | { type: 'water' }
  | { type: 'mealActions'; meal: MealKey }
  | { type: 'saveMeal'; meal: MealKey };

export interface ScannerState {
  meal: MealKey;
  mode: 'barcode' | 'label';
}

interface UI {
  date: DayKey;
  setDate: (d: DayKey) => void;
  sheets: (Sheet & { key: number })[];
  open: (s: Sheet) => void;
  /** replace the top sheet */
  swap: (s: Sheet) => void;
  back: () => void;
  closeAll: () => void;
  scanner: ScannerState | null;
  openScanner: (s: ScannerState) => void;
  closeScanner: () => void;
  /** the meal the add flow is filling, when opened from the center + */
  defaultMeal: () => MealKey;
}

let sheetSeq = 0;

export const useUI = create<UI>((set) => ({
  date: today(),
  setDate: (date) => set({ date }),
  sheets: [],
  open: (s) => set((st) => ({ sheets: [...st.sheets, { ...s, key: ++sheetSeq }] })),
  swap: (s) => set((st) => ({ sheets: [...st.sheets.slice(0, -1), { ...s, key: ++sheetSeq }] })),
  back: () => set((st) => ({ sheets: st.sheets.slice(0, -1) })),
  closeAll: () => set({ sheets: [] }),
  scanner: null,
  openScanner: (scanner) => set({ scanner, sheets: [] }),
  closeScanner: () => set({ scanner: null }),
  defaultMeal: () => mealForHour(new Date().getHours()),
}));

export function mealForHour(h: number): MealKey {
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snacks';
}
