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
