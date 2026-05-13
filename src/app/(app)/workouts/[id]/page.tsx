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
