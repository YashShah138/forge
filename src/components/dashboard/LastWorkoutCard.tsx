interface LastWorkoutCardProps {
  workout: {
    name: string
    date: string // "YYYY-MM-DD"
    exercises: string[]
  } | null
}

function getRelativeDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Parse date as local midnight (append T00:00:00 to avoid UTC offset issues)
  const workoutDate = new Date(`${dateStr}T00:00:00`)
  workoutDate.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - workoutDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 6) return `${diffDays} days ago`
  return workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function LastWorkoutCard({ workout }: LastWorkoutCardProps) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Last Workout
      </div>
      {workout ? (
        <>
          <div
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {workout.name}
          </div>
          <div
            className="text-xs mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {getRelativeDate(workout.date)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workout.exercises.map((ex, i) => (
              <span
                key={i}
                className="rounded-md px-2 py-0.5 text-xs"
                style={{
                  background: 'var(--active-nav-bg)',
                  color: 'var(--accent)',
                }}
              >
                {ex}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No workouts logged yet
        </div>
      )}
    </div>
  )
}
