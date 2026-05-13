// src/lib/exercises.ts
export interface ExercisePreset {
  name: string
  muscle_group: string
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  { name: 'Bench Press', muscle_group: 'Chest' },
  { name: 'Incline Bench Press', muscle_group: 'Chest' },
  { name: 'Dumbbell Flyes', muscle_group: 'Chest' },
  { name: 'Cable Crossover', muscle_group: 'Chest' },
  { name: 'Push-Ups', muscle_group: 'Chest' },
  { name: 'Deadlift', muscle_group: 'Back' },
  { name: 'Pull-Ups', muscle_group: 'Back' },
  { name: 'Barbell Rows', muscle_group: 'Back' },
  { name: 'Cable Rows', muscle_group: 'Back' },
  { name: 'Lat Pulldown', muscle_group: 'Back' },
  { name: 'Face Pulls', muscle_group: 'Back' },
  { name: 'Overhead Press', muscle_group: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders' },
  { name: 'Lateral Raises', muscle_group: 'Shoulders' },
  { name: 'Front Raises', muscle_group: 'Shoulders' },
  { name: 'Rear Delt Flyes', muscle_group: 'Shoulders' },
  { name: 'Barbell Curls', muscle_group: 'Arms' },
  { name: 'Dumbbell Curls', muscle_group: 'Arms' },
  { name: 'Hammer Curls', muscle_group: 'Arms' },
  { name: 'Tricep Pushdowns', muscle_group: 'Arms' },
  { name: 'Skull Crushers', muscle_group: 'Arms' },
  { name: 'Overhead Tricep Extension', muscle_group: 'Arms' },
  { name: 'Dips', muscle_group: 'Arms' },
  { name: 'Squat', muscle_group: 'Legs' },
  { name: 'Romanian Deadlift', muscle_group: 'Legs' },
  { name: 'Leg Press', muscle_group: 'Legs' },
  { name: 'Lunges', muscle_group: 'Legs' },
  { name: 'Leg Curls', muscle_group: 'Legs' },
  { name: 'Leg Extensions', muscle_group: 'Legs' },
  { name: 'Calf Raises', muscle_group: 'Legs' },
  { name: 'Hip Thrusts', muscle_group: 'Legs' },
  { name: 'Plank', muscle_group: 'Core' },
  { name: 'Crunches', muscle_group: 'Core' },
  { name: 'Leg Raises', muscle_group: 'Core' },
  { name: 'Russian Twists', muscle_group: 'Core' },
  { name: 'Cable Crunches', muscle_group: 'Core' },
]

export const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const
