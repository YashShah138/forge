# Workout Tracker Design

**Date:** 2026-05-13  
**Status:** Approved  
**Scope:** `/workouts` list page + `/workouts/new` + `/workouts/[id]` detail/edit page

---

## Overview

A post-session workout logger. The user fills in the full session (name, date, exercises, sets/reps/weight) after finishing at the gym, then saves once. No real-time tracking, no timers.

---

## UX Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Logging mode | After the fact | Simpler; realistic for how most people actually log |
| List layout | Compact rows | Dense history, exercise preview inline |
| Detail layout | Continuous form | One flowing page, no card separation between exercises |
| Overload hint | Line below exercise name | Always visible, compact, shows full last-session breakdown |
| Exercise entry | Searchable preset list | Pre-fills muscle group; custom escape hatch available |
| Persistence | Save on submit | One commit per session; clean state; no partial saves |

---

## Pages & Routing

### `/workouts`
Server component. Fetches all workouts for the user (`id`, `name`, `date`, plus set count via join). Renders a compact reverse-chronological list. "+ New Workout" button links to `/workouts/new`.

### `/workouts/new`
Server component shell. Renders `WorkoutForm` with empty initial state. No DB read.

### `/workouts/[id]`
Server component shell. Fetches:
- The workout row (`id`, `name`, `date`)
- All exercises for that workout (`id`, `name`, `muscle_group`, `order_index`)
- All sets for those exercises (`id`, `set_number`, `weight_lbs`, `reps`)
- Previous sets for each exercise name (for overload hints)

Passes hydrated data into `WorkoutForm`. Returns 404 if workout not found or not owned by the user.

### `/workouts/actions.ts`
Co-located server actions: `saveWorkout`, `updateWorkout`, `deleteWorkout`, `getPreviousSets`.

---

## State & Data Flow

`WorkoutForm` owns all in-memory state as a `WorkoutDraft`:

```ts
type SetDraft      = { id?: string; weight_lbs: string; reps: string }
type ExerciseDraft = { id?: string; name: string; muscle_group: string; sets: SetDraft[] }
type WorkoutDraft  = { id?: string; name: string; date: string; exercises: ExerciseDraft[] }
```

`id` fields are populated when editing an existing workout; absent on `/workouts/new`.

**All user interactions mutate local state only — no DB calls until Save.**

### Save on `/workouts/new` — `saveWorkout(draft)`
1. Auth check
2. Insert `workouts` row → get new `id`
3. Insert `exercises` rows with `order_index`
4. Insert `sets` rows per exercise
5. `redirect('/workouts/' + newId)`

### Save on `/workouts/[id]` — `updateWorkout(workoutId, draft)`
1. Auth check + ownership verify
2. Update `workouts` row (name, date)
3. Delete all `exercises` where `workout_id = workoutId` (cascades to `sets`)
4. Re-insert exercises + sets fresh
5. `revalidatePath('/workouts')` + `revalidatePath('/workouts/' + workoutId)`

### Delete — `deleteWorkout(workoutId)`
1. Auth check + ownership verify
2. Delete workout row (cascades to exercises → sets)
3. `redirect('/workouts')`

### Progressive overload lookup — `getPreviousSets(exerciseName)`
- On `/workouts/[id]`: fetched server-side at render time for all exercises in the session
- On `/workouts/new`: called as a server action when user picks an exercise from the picker
- Returns the sets from the most recent prior workout containing that exercise name

**Error handling:** Auth failures redirect. DB errors are returned as `{ error: string }` and shown inline near the Save button.

---

## Components

### `WorkoutForm` — `src/components/workouts/WorkoutForm.tsx`
Main client component. Owns `WorkoutDraft` state. Renders name/date inputs, exercise list, Save button (and Delete button when editing). Props:
- `initialData?: WorkoutDraft`
- `previousSets?: Record<string, SetDraft[]>`

### `ExerciseBlock` — `src/components/workouts/ExerciseBlock.tsx`
Renders one exercise within the form:
- Name + muscle group inputs (read-only display on view; editable on edit)
- Overload hint line: `Last: 135 × 10, 145 × 8 · May 8` in accent color
- Set table: rows of weight + reps inputs, delete (✕) per row
- "+ add set" link appends an empty `SetDraft`
- Remove exercise button

Receives `ExerciseDraft` + its `previousSets` entry as props; fires change/remove callbacks up to `WorkoutForm`.

### `ExercisePicker` — `src/components/workouts/ExercisePicker.tsx`
Triggered by "+ Add Exercise". A searchable dropdown/popover over a static preset list grouped by muscle group. Selecting a preset calls back with `{ name, muscle_group }` and triggers `getPreviousSets`. Has a "Custom" escape hatch for free-text entry. Fully client-side — no DB query for the list itself.

### `WorkoutRow` — `src/components/workouts/WorkoutRow.tsx`
One row in the `/workouts` list. Shows: workout name, relative date, exercise name preview (truncated), set count. Wraps in `<Link>` to `/workouts/[id]`.

---

## Preset Exercise List

Lives in `src/lib/exercises.ts` — a static array of `{ name: string; muscle_group: string }`, ~40 common exercises. No DB table. Groups: Chest, Back, Shoulders, Arms, Legs, Core.

---

## Database

Uses existing schema — no migrations needed:

```
workouts   → id, user_id, name, date, notes
exercises  → id, workout_id, name, muscle_group, order_index
sets       → id, exercise_id, set_number, weight_lbs, reps, completed
```

RLS already enforces user isolation on all three tables.

---

## What's Out of Scope

- Notes field on workouts (DB has it; UI skips it for now)
- `completed` flag on sets (DB has it; UI skips it)
- Rest timer
- Volume / tonnage stats
- Workout templates
