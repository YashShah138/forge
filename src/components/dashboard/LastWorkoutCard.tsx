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
  if (diffDays < 0) return workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

export default function LastWorkoutCard({ workout }: LastWorkoutCardProps) {
  return (
    <div
      className="rounded-lg border p-6 h-full"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-sm uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-muted)' }}
      >
        Last Workout
      </div>
      {workout ? (
        <>
          <div
            className="text-lg font-medium mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            {workout.name}
          </div>
          <div
            className="text-sm mb-4"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {getRelativeDate(workout.date)}
          </div>
          {workout.exercises.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {workout.exercises.map((ex, i) => (
                <span
                  key={i}
                  className="rounded-md px-3 py-1 text-sm"
                  style={{
                    background: 'var(--active-nav-bg)',
                    color: 'var(--accent)',
                  }}
                >
                  {ex}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No exercises logged
            </div>
          )}
        </>
      ) : (
        <div className="text-base" style={{ color: 'var(--text-tertiary)' }}>
          No workouts logged yet
        </div>
      )}
    </div>
  )
}
