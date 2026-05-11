import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

function getInitials(email: string): string {
  const prefix = email.split('@')[0]
  const parts = prefix.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return prefix.slice(0, 2).toUpperCase()
}

async function getStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { data: workouts } = await supabase
    .from('workouts')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (!workouts?.length) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < workouts.length; i++) {
    const workoutDate = new Date(workouts[i].date)
    workoutDate.setHours(0, 0, 0, 0)
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (workoutDate.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  const displayName = email.split('@')[0]
  const streak = await getStreak(supabase, user.id)

  return (
    <AppShell
      user={{
        name: displayName,
        email,
        avatarInitials: getInitials(email),
      }}
      streak={streak}
    >
      {children}
    </AppShell>
  )
}
