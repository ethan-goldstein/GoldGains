// Activity library with MET values from the Compendium of Physical Activities (Ainsworth et al.,
// 2011 / 2024 update). Calories are "active" calories — (MET − 1) × kg × hours — the same thing
// an Apple Watch reports, so the resting burn already in your budget isn't counted twice.

export type ExerciseKind = 'cardio' | 'sport' | 'strength' | 'other';

export interface Activity {
  id: string;
  name: string;
  kind: ExerciseKind;
  met: number;
  /** activities where distance is worth asking for */
  distance?: boolean;
  icon: string;
}

export const ACTIVITIES: Activity[] = [
  // cardio
  { id: 'walk-easy', name: 'Walking, easy (2.5 mph)', kind: 'cardio', met: 3.0, distance: true, icon: '🚶' },
  { id: 'walk', name: 'Walking, moderate (3 mph)', kind: 'cardio', met: 3.5, distance: true, icon: '🚶' },
  { id: 'walk-brisk', name: 'Walking, brisk (4 mph)', kind: 'cardio', met: 5.0, distance: true, icon: '🚶' },
  { id: 'walk-incline', name: 'Incline treadmill walk', kind: 'cardio', met: 6.0, distance: true, icon: '⛰️' },
  { id: 'hike', name: 'Hiking', kind: 'cardio', met: 6.0, distance: true, icon: '🥾' },
  { id: 'run-12', name: 'Running, 12 min/mi', kind: 'cardio', met: 8.3, distance: true, icon: '🏃' },
  { id: 'run-10', name: 'Running, 10 min/mi', kind: 'cardio', met: 9.8, distance: true, icon: '🏃' },
  { id: 'run-9', name: 'Running, 9 min/mi', kind: 'cardio', met: 10.5, distance: true, icon: '🏃' },
  { id: 'run-8', name: 'Running, 8 min/mi', kind: 'cardio', met: 11.8, distance: true, icon: '🏃' },
  { id: 'run-7', name: 'Running, 7 min/mi', kind: 'cardio', met: 12.3, distance: true, icon: '🏃' },
  { id: 'run-6', name: 'Running, 6 min/mi', kind: 'cardio', met: 14.5, distance: true, icon: '🏃' },
  { id: 'sprints', name: 'Sprints / intervals', kind: 'cardio', met: 12.0, icon: '⚡' },
  { id: 'bike-easy', name: 'Cycling, leisure', kind: 'cardio', met: 4.0, distance: true, icon: '🚴' },
  { id: 'bike', name: 'Cycling, 12–14 mph', kind: 'cardio', met: 8.0, distance: true, icon: '🚴' },
  { id: 'bike-fast', name: 'Cycling, 14–16 mph', kind: 'cardio', met: 10.0, distance: true, icon: '🚴' },
  { id: 'spin', name: 'Spin class / stationary, hard', kind: 'cardio', met: 8.5, icon: '🚴' },
  { id: 'stationary', name: 'Stationary bike, moderate', kind: 'cardio', met: 6.8, icon: '🚴' },
  { id: 'elliptical', name: 'Elliptical', kind: 'cardio', met: 5.0, icon: '〰️' },
  { id: 'stairs', name: 'Stair climber', kind: 'cardio', met: 9.0, icon: '🪜' },
  { id: 'row', name: 'Rowing machine, moderate', kind: 'cardio', met: 7.0, distance: true, icon: '🚣' },
  { id: 'row-hard', name: 'Rowing machine, hard', kind: 'cardio', met: 8.5, distance: true, icon: '🚣' },
  { id: 'swim', name: 'Swimming laps, moderate', kind: 'cardio', met: 5.8, distance: true, icon: '🏊' },
  { id: 'swim-hard', name: 'Swimming laps, hard', kind: 'cardio', met: 9.8, distance: true, icon: '🏊' },
  { id: 'jump-rope', name: 'Jump rope', kind: 'cardio', met: 11.8, icon: '🪢' },
  { id: 'hiit', name: 'HIIT / circuit training', kind: 'cardio', met: 8.0, icon: '🔥' },
  { id: 'aerobics', name: 'Aerobics / cardio class', kind: 'cardio', met: 7.3, icon: '💃' },
  { id: 'dance', name: 'Dancing', kind: 'cardio', met: 5.0, icon: '🕺' },
  // sports
  { id: 'basketball', name: 'Basketball, game', kind: 'sport', met: 8.0, icon: '🏀' },
  { id: 'basketball-shoot', name: 'Basketball, shooting around', kind: 'sport', met: 4.5, icon: '🏀' },
  { id: 'soccer', name: 'Soccer, game', kind: 'sport', met: 10.0, icon: '⚽' },
  { id: 'soccer-casual', name: 'Soccer, casual', kind: 'sport', met: 7.0, icon: '⚽' },
  { id: 'baseball', name: 'Baseball / softball', kind: 'sport', met: 5.0, icon: '⚾' },
  { id: 'baseball-practice', name: 'Baseball practice / drills', kind: 'sport', met: 4.0, icon: '⚾' },
  { id: 'football', name: 'Football, game', kind: 'sport', met: 8.0, icon: '🏈' },
  { id: 'flag-football', name: 'Flag / touch football', kind: 'sport', met: 8.0, icon: '🏈' },
  { id: 'tennis', name: 'Tennis, singles', kind: 'sport', met: 8.0, icon: '🎾' },
  { id: 'tennis-doubles', name: 'Tennis, doubles', kind: 'sport', met: 6.0, icon: '🎾' },
  { id: 'pickleball', name: 'Pickleball', kind: 'sport', met: 4.5, icon: '🏓' },
  { id: 'volleyball', name: 'Volleyball', kind: 'sport', met: 4.0, icon: '🏐' },
  { id: 'beach-volleyball', name: 'Beach volleyball', kind: 'sport', met: 8.0, icon: '🏐' },
  { id: 'golf', name: 'Golf, walking', kind: 'sport', met: 4.3, icon: '⛳' },
  { id: 'golf-cart', name: 'Golf, with cart', kind: 'sport', met: 3.5, icon: '⛳' },
  { id: 'hockey', name: 'Ice hockey', kind: 'sport', met: 8.0, icon: '🏒' },
  { id: 'lacrosse', name: 'Lacrosse', kind: 'sport', met: 8.0, icon: '🥍' },
  { id: 'rugby', name: 'Rugby', kind: 'sport', met: 8.3, icon: '🏉' },
  { id: 'boxing', name: 'Boxing, sparring', kind: 'sport', met: 7.8, icon: '🥊' },
  { id: 'boxing-bag', name: 'Boxing, heavy bag', kind: 'sport', met: 5.5, icon: '🥊' },
  { id: 'martial-arts', name: 'Martial arts / BJJ / MMA', kind: 'sport', met: 10.3, icon: '🥋' },
  { id: 'wrestling', name: 'Wrestling', kind: 'sport', met: 6.0, icon: '🤼' },
  { id: 'racquetball', name: 'Racquetball', kind: 'sport', met: 7.0, icon: '🎾' },
  { id: 'squash', name: 'Squash', kind: 'sport', met: 7.3, icon: '🎾' },
  { id: 'badminton', name: 'Badminton', kind: 'sport', met: 5.5, icon: '🏸' },
  { id: 'table-tennis', name: 'Table tennis', kind: 'sport', met: 4.0, icon: '🏓' },
  { id: 'ultimate', name: 'Ultimate frisbee', kind: 'sport', met: 8.0, icon: '🥏' },
  { id: 'climbing', name: 'Rock climbing / bouldering', kind: 'sport', met: 8.0, icon: '🧗' },
  { id: 'ski', name: 'Skiing, downhill', kind: 'sport', met: 5.3, icon: '⛷️' },
  { id: 'snowboard', name: 'Snowboarding', kind: 'sport', met: 5.3, icon: '🏂' },
  { id: 'surf', name: 'Surfing', kind: 'sport', met: 3.0, icon: '🏄' },
  { id: 'skate', name: 'Skateboarding', kind: 'sport', met: 5.0, icon: '🛹' },
  // strength & mobility
  { id: 'lifting', name: 'Weight lifting, hard', kind: 'strength', met: 6.0, icon: '🏋️' },
  { id: 'lifting-moderate', name: 'Weight lifting, moderate', kind: 'strength', met: 3.5, icon: '🏋️' },
  { id: 'calisthenics', name: 'Calisthenics, hard', kind: 'strength', met: 8.0, icon: '🤸' },
  { id: 'calisthenics-light', name: 'Calisthenics, light', kind: 'strength', met: 3.8, icon: '🤸' },
  { id: 'crossfit', name: 'CrossFit / WOD', kind: 'strength', met: 8.0, icon: '🔥' },
  { id: 'yoga', name: 'Yoga', kind: 'other', met: 2.5, icon: '🧘' },
  { id: 'power-yoga', name: 'Power yoga', kind: 'other', met: 4.0, icon: '🧘' },
  { id: 'pilates', name: 'Pilates', kind: 'other', met: 3.0, icon: '🧘' },
  { id: 'stretch', name: 'Stretching / mobility', kind: 'other', met: 2.3, icon: '🙆' },
  { id: 'yard', name: 'Yard work', kind: 'other', met: 4.0, icon: '🌿' },
  { id: 'cleaning', name: 'House cleaning', kind: 'other', met: 3.3, icon: '🧹' },
];

export const ACTIVITY_BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

export const KIND_LABEL: Record<ExerciseKind, string> = {
  cardio: 'Cardio',
  sport: 'Sports',
  strength: 'Strength',
  other: 'Mobility & more',
};

/** Active calories for a session */
export function activeKcal(met: number, weightKg: number, minutes: number): number {
  return Math.max(0, (met - 1) * weightKg * (minutes / 60));
}

// ── Strength ────────────────────────────────────────────────────────────────

export type Muscle = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';

export interface Lift {
  id: string;
  name: string;
  muscle: Muscle;
  /** bodyweight moves log reps (and optional added weight) */
  bodyweight?: boolean;
}

export const LIFTS: Lift[] = [
  { id: 'bench', name: 'Bench Press', muscle: 'Chest' },
  { id: 'incline-bench', name: 'Incline Bench Press', muscle: 'Chest' },
  { id: 'db-bench', name: 'Dumbbell Bench Press', muscle: 'Chest' },
  { id: 'incline-db', name: 'Incline Dumbbell Press', muscle: 'Chest' },
  { id: 'chest-fly', name: 'Chest Fly', muscle: 'Chest' },
  { id: 'cable-cross', name: 'Cable Crossover', muscle: 'Chest' },
  { id: 'pushup', name: 'Push-up', muscle: 'Chest', bodyweight: true },
  { id: 'dips', name: 'Dips', muscle: 'Chest', bodyweight: true },
  { id: 'deadlift', name: 'Deadlift', muscle: 'Back' },
  { id: 'pullup', name: 'Pull-up', muscle: 'Back', bodyweight: true },
  { id: 'chinup', name: 'Chin-up', muscle: 'Back', bodyweight: true },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'Back' },
  { id: 'bb-row', name: 'Barbell Row', muscle: 'Back' },
  { id: 'db-row', name: 'Dumbbell Row', muscle: 'Back' },
  { id: 'cable-row', name: 'Seated Cable Row', muscle: 'Back' },
  { id: 'tbar-row', name: 'T-Bar Row', muscle: 'Back' },
  { id: 'shrug', name: 'Shrugs', muscle: 'Back' },
  { id: 'squat', name: 'Back Squat', muscle: 'Legs' },
  { id: 'front-squat', name: 'Front Squat', muscle: 'Legs' },
  { id: 'rdl', name: 'Romanian Deadlift', muscle: 'Legs' },
  { id: 'leg-press', name: 'Leg Press', muscle: 'Legs' },
  { id: 'lunge', name: 'Lunges', muscle: 'Legs' },
  { id: 'split-squat', name: 'Bulgarian Split Squat', muscle: 'Legs' },
  { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'Legs' },
  { id: 'leg-ext', name: 'Leg Extension', muscle: 'Legs' },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'Legs' },
  { id: 'calf-raise', name: 'Calf Raise', muscle: 'Legs' },
  { id: 'ohp', name: 'Overhead Press', muscle: 'Shoulders' },
  { id: 'db-press', name: 'Dumbbell Shoulder Press', muscle: 'Shoulders' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'Shoulders' },
  { id: 'rear-delt', name: 'Rear Delt Fly', muscle: 'Shoulders' },
  { id: 'face-pull', name: 'Face Pull', muscle: 'Shoulders' },
  { id: 'bb-curl', name: 'Barbell Curl', muscle: 'Arms' },
  { id: 'db-curl', name: 'Dumbbell Curl', muscle: 'Arms' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'Arms' },
  { id: 'preacher', name: 'Preacher Curl', muscle: 'Arms' },
  { id: 'pushdown', name: 'Tricep Pushdown', muscle: 'Arms' },
  { id: 'skull', name: 'Skull Crusher', muscle: 'Arms' },
  { id: 'oh-tricep', name: 'Overhead Tricep Extension', muscle: 'Arms' },
  { id: 'close-bench', name: 'Close-Grip Bench', muscle: 'Arms' },
  { id: 'plank', name: 'Plank (seconds as reps)', muscle: 'Core', bodyweight: true },
  { id: 'crunch', name: 'Crunch', muscle: 'Core', bodyweight: true },
  { id: 'leg-raise', name: 'Hanging Leg Raise', muscle: 'Core', bodyweight: true },
  { id: 'ab-wheel', name: 'Ab Wheel', muscle: 'Core', bodyweight: true },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'Core' },
  { id: 'russian-twist', name: 'Russian Twist', muscle: 'Core' },
];

export const LIFT_BY_ID = new Map(LIFTS.map((l) => [l.id, l]));
export const MUSCLES: Muscle[] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export interface LiftSet {
  reps: number;
  /** in the user's unit at time of logging; see LiftLog.unit */
  weight: number;
  done?: boolean;
}

export interface LiftLog {
  liftId: string;
  name: string;
  unit: 'lb' | 'kg';
  sets: LiftSet[];
}

/** Epley estimated one-rep max */
export function est1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function bestSet(sets: LiftSet[]): { set: LiftSet; e1rm: number } | undefined {
  let best: { set: LiftSet; e1rm: number } | undefined;
  for (const s of sets) {
    const e = est1RM(s.weight, s.reps);
    if (!best || e > best.e1rm) best = { set: s, e1rm: e };
  }
  return best;
}

export function volume(sets: LiftSet[]): number {
  return sets.reduce((acc, s) => acc + s.reps * s.weight, 0);
}
