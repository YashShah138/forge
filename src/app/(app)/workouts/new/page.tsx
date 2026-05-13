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
