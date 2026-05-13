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
