# Workout Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the workout tracker — a list of past sessions at `/workouts`, a new-session form at `/workouts/new`, and a detail/edit form at `/workouts/[id]`.

**Architecture:** All workout data lives in local React state inside a `WorkoutForm` client component; a single server action commits everything at once on Save. The list and detail pages are server components that fetch data and pass it as props. Progressive overload hints are pre-fetched server-side on the detail page and fetched on demand (server action) on the new page when an exercise is picked.

**Tech Stack:** Next.js 15 App Router, Supabase (server + client), TypeScript, Tailwind CSS + CSS tokens.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/exercises.ts` | Static preset exercise list (~40 exercises) |
| Create | `src/components/workouts/WorkoutRow.tsx` | One row in the /workouts list |
| Modify | `src/app/(app)/workouts/page.tsx` | List page — server component |
| Create | `src/app/(app)/workouts/actions.ts` | Server actions: save, update, delete, getPreviousSets |
| Create | `src/components/workouts/ExercisePicker.tsx` | Searchable exercise picker dropdown |
| Create | `src/components/workouts/ExerciseBlock.tsx` | One exercise in the form with set table |
| Create | `src/components/workouts/WorkoutForm.tsx` | Main client form component |
| Create | `src/app/(app)/workouts/new/page.tsx` | New workout page shell |
| Create | `src/app/(app)/workouts/[id]/page.tsx` | Detail/edit page shell |

---

## Task 1: Exercise preset list

**Files:**
- Create: `src/lib/exercises.ts`

- [ ] **Step 1: Create the file**

```ts
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/exercises.ts
git commit -m "feat: add exercise preset list"
```

---

## Task 2: WorkoutRow component

**Files:**
- Create: `src/components/workouts/WorkoutRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/workouts/WorkoutRow.tsx
import Link from 'next/link'

function getRelativeDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const workoutDate = new Date(`${dateStr}T00:00:00`)
  workoutDate.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - workoutDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 6) return `${diffDays} days ago`
  const sameYear = workoutDate.getFullYear() === today.getFullYear()
  return workoutDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

interface WorkoutRowProps {
  id: string
  name: string
  date: string
  exerciseNames: string[]
  setCount: number
}

export default function WorkoutRow({ id, name, date, exerciseNames, setCount }: WorkoutRowProps) {
  const preview = exerciseNames.slice(0, 3).join(' · ')
  const overflow = exerciseNames.length > 3 ? ` +${exerciseNames.length - 3}` : ''

  return (
    <Link
      href={`/workouts/${id}`}
      className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 transition-colors"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {name}
        </div>
        {exerciseNames.length > 0 && (
          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {preview}{overflow}
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0 ml-4">
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {getRelativeDate(date)}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {setCount} {setCount === 1 ? 'set' : 'sets'}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workouts/WorkoutRow.tsx
git commit -m "feat: add WorkoutRow list component"
```

---

## Task 3: Workouts list page

**Files:**
- Modify: `src/app/(app)/workouts/page.tsx`

- [ ] **Step 1: Replace the stub with the real page**

```tsx
// src/app/(app)/workouts/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import WorkoutRow from '@/components/workouts/WorkoutRow'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('id, name, date, exercises(name, sets(id))')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) console.error('workouts query failed:', error.message)

  const rows = (workouts ?? []).map(w => ({
    id: w.id as string,
    name: w.name as string,
    date: w.date as string,
    exerciseNames: ((w.exercises ?? []) as any[]).map(e => e.name as string),
    setCount: ((w.exercises ?? []) as any[]).reduce(
      (sum: number, e: any) => sum + ((e.sets as any[])?.length ?? 0),
      0
    ),
  }))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1
          className="text-xl font-medium tracking-wide uppercase"
          style={{ color: 'var(--text-primary)' }}
        >
          Workouts
        </h1>
        <Link
          href="/workouts/new"
          className="px-3 py-1.5 rounded-md text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#09090b' }}
        >
          + New
        </Link>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No workouts yet.{' '}
            <Link href="/workouts/new" style={{ color: 'var(--accent)' }}>
              Log your first one.
            </Link>
          </div>
        ) : (
          rows.map(row => <WorkoutRow key={row.id} {...row} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/workouts/page.tsx
git commit -m "feat: implement workouts list page"
```

---

## Task 4: Server actions

**Files:**
- Create: `src/app/(app)/workouts/actions.ts`

- [ ] **Step 1: Create the file**

```ts
// src/app/(app)/workouts/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SetDraft = { id?: string; weight_lbs: string; reps: string }
export type ExerciseDraft = { id?: string; name: string; muscle_group: string; sets: SetDraft[] }
export type WorkoutDraft = { id?: string; name: string; date: string; exercises: ExerciseDraft[] }

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function saveWorkout(draft: WorkoutDraft) {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: workout, error: wErr } = await supabase
    .from('workouts')
    .insert({ user_id: user.id, name: draft.name.trim(), date: draft.date })
    .select('id')
    .single()

  if (wErr || !workout) return { error: wErr?.message ?? 'Failed to save workout' }

  for (let i = 0; i < draft.exercises.length; i++) {
    const ex = draft.exercises[i]
    const { data: exercise, error: exErr } = await supabase
      .from('exercises')
      .insert({
        workout_id: workout.id,
        name: ex.name.trim(),
        muscle_group: ex.muscle_group.trim(),
        order_index: i,
      })
      .select('id')
      .single()

    if (exErr || !exercise) return { error: exErr?.message ?? 'Failed to save exercise' }

    const sets = ex.sets
      .filter(s => s.weight_lbs !== '' && s.reps !== '')
      .map((s, idx) => ({
        exercise_id: exercise.id,
        set_number: idx + 1,
        weight_lbs: parseFloat(s.weight_lbs),
        reps: parseInt(s.reps, 10),
        completed: true,
      }))

    if (sets.length > 0) {
      const { error: sErr } = await supabase.from('sets').insert(sets)
      if (sErr) return { error: sErr.message }
    }
  }

  redirect(`/workouts/${workout.id}`)
}

export async function updateWorkout(workoutId: string, draft: WorkoutDraft) {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: existing } = await supabase
    .from('workouts')
    .select('user_id')
    .eq('id', workoutId)
    .single()

  if (!existing || existing.user_id !== user.id) return { error: 'Workout not found' }

  // Delete existing sets then exercises (explicit, no reliance on DB cascade)
  const { data: existingExercises } = await supabase
    .from('exercises')
    .select('id')
    .eq('workout_id', workoutId)

  if (existingExercises?.length) {
    const ids = existingExercises.map(e => e.id)
    await supabase.from('sets').delete().in('exercise_id', ids)
    await supabase.from('exercises').delete().eq('workout_id', workoutId)
  }

  const { error: wErr } = await supabase
    .from('workouts')
    .update({ name: draft.name.trim(), date: draft.date })
    .eq('id', workoutId)

  if (wErr) return { error: wErr.message }

  for (let i = 0; i < draft.exercises.length; i++) {
    const ex = draft.exercises[i]
    const { data: exercise, error: exErr } = await supabase
      .from('exercises')
      .insert({
        workout_id: workoutId,
        name: ex.name.trim(),
        muscle_group: ex.muscle_group.trim(),
        order_index: i,
      })
      .select('id')
      .single()

    if (exErr || !exercise) return { error: exErr?.message ?? 'Failed to save exercise' }

    const sets = ex.sets
      .filter(s => s.weight_lbs !== '' && s.reps !== '')
      .map((s, idx) => ({
        exercise_id: exercise.id,
        set_number: idx + 1,
        weight_lbs: parseFloat(s.weight_lbs),
        reps: parseInt(s.reps, 10),
        completed: true,
      }))

    if (sets.length > 0) {
      const { error: sErr } = await supabase.from('sets').insert(sets)
      if (sErr) return { error: sErr.message }
    }
  }

  revalidatePath('/workouts')
  revalidatePath(`/workouts/${workoutId}`)
  redirect(`/workouts/${workoutId}`)
}

export async function deleteWorkout(workoutId: string) {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: existing } = await supabase
    .from('workouts')
    .select('user_id')
    .eq('id', workoutId)
    .single()

  if (!existing || existing.user_id !== user.id) return { error: 'Workout not found' }

  const { data: exercises } = await supabase
    .from('exercises')
    .select('id')
    .eq('workout_id', workoutId)

  if (exercises?.length) {
    await supabase.from('sets').delete().in('exercise_id', exercises.map(e => e.id))
    await supabase.from('exercises').delete().eq('workout_id', workoutId)
  }

  await supabase.from('workouts').delete().eq('id', workoutId)

  revalidatePath('/workouts')
  redirect('/workouts')
}

export async function getPreviousSets(
  exerciseName: string,
  excludeWorkoutId?: string
): Promise<SetDraft[] | null> {
  const { supabase, user } = await getAuthenticatedUser()

  let query = supabase
    .from('workouts')
    .select('id, exercises!inner(id, name)')
    .eq('user_id', user.id)
    .eq('exercises.name', exerciseName)
    .order('date', { ascending: false })
    .limit(1)

  if (excludeWorkoutId) {
    query = query.neq('id', excludeWorkoutId)
  }

  const { data: workouts } = await query
  if (!workouts?.length) return null

  const exerciseId = (workouts[0].exercises as any[])[0]?.id
  if (!exerciseId) return null

  const { data: sets } = await supabase
    .from('sets')
    .select('set_number, weight_lbs, reps')
    .eq('exercise_id', exerciseId)
    .order('set_number', { ascending: true })

  if (!sets?.length) return null
  return sets.map(s => ({ weight_lbs: String(s.weight_lbs ?? ''), reps: String(s.reps ?? '') }))
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/workouts/actions.ts
git commit -m "feat: add workout server actions (save, update, delete, getPreviousSets)"
```

---

## Task 5: ExercisePicker component

**Files:**
- Create: `src/components/workouts/ExercisePicker.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/workouts/ExercisePicker.tsx
'use client'

import { useState } from 'react'
import { EXERCISE_PRESETS, MUSCLE_GROUPS } from '@/lib/exercises'

interface ExercisePickerProps {
  onSelect: (name: string, muscle_group: string) => void
  onClose: () => void
}

export default function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const filtered = EXERCISE_PRESETS.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = MUSCLE_GROUPS.map(group => ({
    group,
    exercises: filtered.filter(e => e.muscle_group === group),
  })).filter(g => g.exercises.length > 0)

  function handleSelect(name: string, muscle_group: string) {
    onSelect(name, muscle_group)
    onClose()
  }

  function handleCustomSubmit() {
    if (!customName.trim()) return
    onSelect(customName.trim(), customMuscle.trim() || 'Other')
    onClose()
  }

  return (
    <div
      className="rounded-lg border mt-2"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {!showCustom ? (
        <>
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              className="w-full bg-transparent text-sm outline-none px-2 py-1"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search exercises..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            {grouped.map(({ group, exercises }) => (
              <div key={group}>
                <div
                  className="px-3 py-1 text-xs uppercase tracking-widest sticky top-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
                >
                  {group}
                </div>
                {exercises.map(ex => (
                  <button
                    key={ex.name}
                    type="button"
                    className="w-full text-left px-4 py-1.5 text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--active-nav-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => handleSelect(ex.name, ex.muscle_group)}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                No matches.
              </div>
            )}
          </div>
          <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs rounded"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setShowCustom(true)}
            >
              + Custom exercise
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 flex flex-col gap-2">
          <input
            autoFocus
            className="w-full bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Exercise name"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          />
          <input
            className="w-full bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Muscle group (optional)"
            value={customMuscle}
            onChange={e => setCustomMuscle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 py-1.5 rounded-md text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#09090b' }}
              onClick={handleCustomSubmit}
            >
              Add
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 rounded-md text-sm border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => setShowCustom(false)}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workouts/ExercisePicker.tsx
git commit -m "feat: add ExercisePicker with searchable preset list"
```

---

## Task 6: ExerciseBlock component

**Files:**
- Create: `src/components/workouts/ExerciseBlock.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/workouts/ExerciseBlock.tsx
'use client'

import type { ExerciseDraft, SetDraft } from '@/app/(app)/workouts/actions'

interface ExerciseBlockProps {
  exercise: ExerciseDraft
  index: number
  previousSets: SetDraft[] | null
  onChange: (index: number, updated: ExerciseDraft) => void
  onRemove: (index: number) => void
}

export default function ExerciseBlock({
  exercise,
  index,
  previousSets,
  onChange,
  onRemove,
}: ExerciseBlockProps) {
  function updateSet(si: number, field: 'weight_lbs' | 'reps', value: string) {
    const sets = exercise.sets.map((s, i) => (i === si ? { ...s, [field]: value } : s))
    onChange(index, { ...exercise, sets })
  }

  function addSet() {
    onChange(index, { ...exercise, sets: [...exercise.sets, { weight_lbs: '', reps: '' }] })
  }

  function removeSet(si: number) {
    if (exercise.sets.length <= 1) return
    onChange(index, { ...exercise, sets: exercise.sets.filter((_, i) => i !== si) })
  }

  const hint = previousSets?.length
    ? `Last: ${previousSets.map(s => `${s.weight_lbs} × ${s.reps}`).join(', ')}`
    : null

  return (
    <div className="mb-5">
      <div className="flex gap-2 mb-1">
        <input
          className="flex-1 bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          placeholder="Exercise name"
          value={exercise.name}
          onChange={e => onChange(index, { ...exercise, name: e.target.value })}
        />
        <input
          className="w-28 bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          placeholder="Muscle group"
          value={exercise.muscle_group}
          onChange={e => onChange(index, { ...exercise, muscle_group: e.target.value })}
        />
        <button
          type="button"
          className="px-2 text-sm flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => onRemove(index)}
          aria-label="Remove exercise"
        >
          ✕
        </button>
      </div>

      {hint && (
        <div className="text-xs mb-2 px-1" style={{ color: 'var(--accent)' }}>
          {hint}
        </div>
      )}

      <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div
          className="grid text-xs px-3 py-1 border-b"
          style={{
            gridTemplateColumns: '20px 1fr 1fr 24px',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <span>#</span>
          <span>LBS</span>
          <span>REPS</span>
          <span />
        </div>
        {exercise.sets.map((set, si) => (
          <div
            key={si}
            className="grid items-center px-3 py-1.5 border-b last:border-b-0"
            style={{ gridTemplateColumns: '20px 1fr 1fr 24px', borderColor: 'var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {si + 1}
            </span>
            <input
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
              placeholder="—"
              value={set.weight_lbs}
              onChange={e => updateSet(si, 'weight_lbs', e.target.value)}
              inputMode="decimal"
            />
            <input
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
              placeholder="—"
              value={set.reps}
              onChange={e => updateSet(si, 'reps', e.target.value)}
              inputMode="numeric"
            />
            <button
              type="button"
              className="text-xs justify-self-end"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => removeSet(si)}
              aria-label="Remove set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-xs mt-1.5 ml-1"
        style={{ color: 'var(--accent)' }}
        onClick={addSet}
      >
        + add set
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workouts/ExerciseBlock.tsx
git commit -m "feat: add ExerciseBlock with set table and overload hint"
```

---

## Task 7: WorkoutForm component

**Files:**
- Create: `src/components/workouts/WorkoutForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/workouts/WorkoutForm.tsx
'use client'

import { useState, useTransition } from 'react'
import {
  type ExerciseDraft,
  type SetDraft,
  type WorkoutDraft,
  saveWorkout,
  updateWorkout,
  deleteWorkout,
  getPreviousSets,
} from '@/app/(app)/workouts/actions'
import ExerciseBlock from './ExerciseBlock'
import ExercisePicker from './ExercisePicker'

interface WorkoutFormProps {
  initialData?: WorkoutDraft
  previousSets?: Record<string, SetDraft[]>
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WorkoutForm({ initialData, previousSets: initialPreviousSets }: WorkoutFormProps) {
  const [draft, setDraft] = useState<WorkoutDraft>(
    initialData ?? { name: '', date: todayISO(), exercises: [] }
  )
  const [prevSets, setPrevSets] = useState<Record<string, SetDraft[]>>(initialPreviousSets ?? {})
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEditing = !!initialData?.id

  async function handleAddExercise(name: string, muscle_group: string) {
    setShowPicker(false)
    setDraft(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name, muscle_group, sets: [{ weight_lbs: '', reps: '' }] }],
    }))
    if (!prevSets[name]) {
      const result = await getPreviousSets(name, isEditing ? initialData?.id : undefined)
      if (result) setPrevSets(ps => ({ ...ps, [name]: result }))
    }
  }

  function handleExerciseChange(idx: number, updated: ExerciseDraft) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) => (i === idx ? updated : e)),
    }))
  }

  function handleExerciseRemove(idx: number) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx),
    }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateWorkout(initialData!.id!, draft)
        : await saveWorkout(draft)
      if (result?.error) setError(result.error)
    })
  }

  function handleDelete() {
    if (!initialData?.id) return
    startTransition(async () => {
      await deleteWorkout(initialData!.id!)
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Name + date */}
      <div className="flex gap-3 mb-5 flex-shrink-0">
        <input
          className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-base outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          placeholder="Workout name (e.g. Push Day)"
          value={draft.name}
          onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
        />
        <input
          type="date"
          className="bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          value={draft.date}
          onChange={e => setDraft(prev => ({ ...prev, date: e.target.value }))}
        />
      </div>

      {/* Exercise blocks */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {draft.exercises.map((ex, i) => (
          <ExerciseBlock
            key={i}
            exercise={ex}
            index={i}
            previousSets={prevSets[ex.name] ?? null}
            onChange={handleExerciseChange}
            onRemove={handleExerciseRemove}
          />
        ))}

        {showPicker ? (
          <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
        ) : (
          <button
            type="button"
            className="w-full border border-dashed rounded-lg py-2.5 text-sm mt-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            onClick={() => setShowPicker(true)}
          >
            + Add Exercise
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 mt-4 flex gap-3 items-center">
        {error && (
          <span className="flex-1 text-sm" style={{ color: '#f87171' }}>
            {error}
          </span>
        )}
        {isEditing && !error && (
          <button
            type="button"
            disabled={isPending}
            className="text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          disabled={isPending || !draft.name.trim()}
          className="ml-auto px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#09090b' }}
          onClick={handleSave}
        >
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/workouts/WorkoutForm.tsx
git commit -m "feat: add WorkoutForm client component with local state management"
```

---

## Task 8: New workout page

**Files:**
- Create: `src/app/(app)/workouts/new/page.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/app/\(app\)/workouts/new
```

```tsx
// src/app/(app)/workouts/new/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutForm from '@/components/workouts/WorkoutForm'

export default async function NewWorkoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h1
        className="text-xl font-medium tracking-wide uppercase mb-5 flex-shrink-0"
        style={{ color: 'var(--text-primary)' }}
      >
        New Workout
      </h1>
      <WorkoutForm />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors, `/workouts/new` route appears in build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/workouts/new/page.tsx
git commit -m "feat: add /workouts/new page"
```

---

## Task 9: Workout detail/edit page

**Files:**
- Create: `src/app/(app)/workouts/[id]/page.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "src/app/(app)/workouts/[id]"
```

```tsx
// src/app/(app)/workouts/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WorkoutForm from '@/components/workouts/WorkoutForm'
import { getPreviousSets, type WorkoutDraft, type SetDraft } from '@/app/(app)/workouts/actions'

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      id, name, date, user_id,
      exercises(id, name, muscle_group, order_index,
        sets(id, set_number, weight_lbs, reps)
      )
    `)
    .eq('id', id)
    .single()

  if (!workout || workout.user_id !== user.id) notFound()

  const sortedExercises = [...((workout.exercises ?? []) as any[])].sort(
    (a, b) => a.order_index - b.order_index
  )

  const initialData: WorkoutDraft = {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    exercises: sortedExercises.map((ex: any) => ({
      id: ex.id,
      name: ex.name,
      muscle_group: ex.muscle_group ?? '',
      sets: [...((ex.sets ?? []) as any[])]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s: any) => ({
          id: s.id,
          weight_lbs: String(s.weight_lbs ?? ''),
          reps: String(s.reps ?? ''),
        })),
    })),
  }

  const previousSets: Record<string, SetDraft[]> = {}
  await Promise.all(
    initialData.exercises.map(async ex => {
      const prev = await getPreviousSets(ex.name, workout.id)
      if (prev) previousSets[ex.name] = prev
    })
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h1
        className="text-xl font-medium tracking-wide uppercase mb-5 flex-shrink-0"
        style={{ color: 'var(--text-primary)' }}
      >
        Edit Workout
      </h1>
      <WorkoutForm initialData={initialData} previousSets={previousSets} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: no errors, `/workouts/[id]` route appears in build output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/workouts/[id]/page.tsx"
git commit -m "feat: add /workouts/[id] detail and edit page"
```

---

## Task 10: Smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test the list page**

Navigate to `http://localhost:3000/workouts`. Verify:
- Page loads without error
- "Workouts" header and "+ New" button are visible
- Empty state shows "No workouts yet. Log your first one." with a link

- [ ] **Step 3: Test creating a workout**

Click "+ New". Verify:
- Form loads with today's date pre-filled
- Click "+ Add Exercise" → picker opens with search and grouped list
- Pick "Bench Press" → exercise block appears with "LBS / REPS" table and one empty set row
- Type a weight and reps, click "+ add set" → second row appears
- Fill workout name, click "Save Workout"
- Redirects to `/workouts/[id]`
- List page at `/workouts` now shows the new row with name, date, exercise preview, set count

- [ ] **Step 4: Test the overload hint**

Log a second workout with the same exercise (e.g. Bench Press). When you pick Bench Press from the picker, the hint line should appear below the exercise name showing "Last: 135 × 10, 145 × 8" (or whatever you entered in step 3).

- [ ] **Step 5: Test editing**

From `/workouts/[id]`, change the workout name, add a set, click "Save Changes". Verify the list updates.

- [ ] **Step 6: Test delete**

From `/workouts/[id]`, click "Delete". Verify redirect to `/workouts` and workout is removed from the list.

- [ ] **Step 7: Final build**

```bash
npm run build
```
Expected: clean build, no TypeScript errors.
