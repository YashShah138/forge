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
