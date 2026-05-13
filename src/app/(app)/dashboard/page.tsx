// src/app/(app)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatCards from '@/components/dashboard/StatCards'
import MacroSection from '@/components/dashboard/MacroSection'
import WeeklyTracker from '@/components/dashboard/WeeklyTracker'
import LastWorkoutCard from '@/components/dashboard/LastWorkoutCard'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekBounds(): { monday: string; sunday: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() // 0=Sun … 6=Sat
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday: toDateStr(monday), sunday: toDateStr(sunday) }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayISO = toDateStr(new Date())
  const { monday, sunday } = getWeekBounds()

  const [profileResult, foodLogsResult, weekWorkoutsResult, lastWorkoutResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'weight_lbs, goal_weight_lbs, calorie_target, protein_target, weekly_workouts_target'
        )
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('food_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .eq('date', todayISO),
      supabase
        .from('workouts')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', monday)
        .lte('date', sunday),
      supabase
        .from('workouts')
        .select('id, name, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1),
    ])

  if (profileResult.error)
    console.error('profiles query failed:', profileResult.error.message)
  if (foodLogsResult.error)
    console.error('food_logs query failed:', foodLogsResult.error.message)
  if (weekWorkoutsResult.error)
    console.error('week workouts query failed:', weekWorkoutsResult.error.message)
  if (lastWorkoutResult.error)
    console.error('last workout query failed:', lastWorkoutResult.error.message)

  const profile = profileResult.data
  const foodLogs = foodLogsResult.data ?? []
  const workoutDates = (weekWorkoutsResult.data ?? []).map((w) => w.date)
  const lastWorkoutRow = lastWorkoutResult.data?.[0] ?? null

  // Sum today's food logs
  const caloriesToday = foodLogs.reduce((s, r) => s + (r.calories ?? 0), 0)
  const proteinToday = foodLogs.reduce((s, r) => s + (r.protein_g ?? 0), 0)
  const carbsToday = foodLogs.reduce((s, r) => s + (r.carbs_g ?? 0), 0)
  const fatToday = foodLogs.reduce((s, r) => s + (r.fat_g ?? 0), 0)

  // Derive carbs/fat targets from calorie target (40% carbs, 30% fat)
  const calorieTarget = profile?.calorie_target ?? 0
  const proteinTarget = profile?.protein_target ?? 0
  const carbsTarget =
    calorieTarget > 0 ? Math.round((calorieTarget * 0.4) / 4) : 0
  const fatTarget =
    calorieTarget > 0 ? Math.round((calorieTarget * 0.3) / 9) : 0

  // Fetch exercises for last workout (sequential — depends on lastWorkoutRow)
  let lastWorkoutData: {
    name: string
    date: string
    exercises: string[]
  } | null = null

  if (lastWorkoutRow) {
    const { data: exercises, error: exError } = await supabase
      .from('exercises')
      .select('name')
      .eq('workout_id', lastWorkoutRow.id)
      .order('order_index', { ascending: true })
    if (exError)
      console.error('exercises query failed:', exError.message)
    lastWorkoutData = {
      name: lastWorkoutRow.name,
      date: lastWorkoutRow.date,
      exercises: exercises?.map((e) => e.name) ?? [],
    }
  }

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <StatCards
        weightLbs={profile?.weight_lbs ?? null}
        goalWeightLbs={profile?.goal_weight_lbs ?? null}
        caloriesToday={caloriesToday}
        calorieTarget={calorieTarget}
        proteinToday={proteinToday}
        proteinTarget={proteinTarget}
        workoutsThisWeek={workoutDates.length}
        weeklyWorkoutsTarget={profile?.weekly_workouts_target ?? 0}
      />
      <div className="flex-1 min-h-0">
        <MacroSection
          caloriesToday={caloriesToday}
          calorieTarget={calorieTarget}
          proteinToday={proteinToday}
          proteinTarget={proteinTarget}
          carbsToday={carbsToday}
          carbsTarget={carbsTarget}
          fatToday={fatToday}
          fatTarget={fatTarget}
        />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4" style={{ gridTemplateRows: '1fr' }}>
        <WeeklyTracker workoutDates={workoutDates} />
        <LastWorkoutCard workout={lastWorkoutData} />
      </div>
    </div>
  )
}
