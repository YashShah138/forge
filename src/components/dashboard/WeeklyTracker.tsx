interface WeeklyTrackerProps {
  workoutDates: string[] // ISO "YYYY-MM-DD" strings
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekDates(): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() // 0=Sun … 6=Sat
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function WeeklyTracker({ workoutDates }: WeeklyTrackerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toDateStr(today)
  const weekDays = getWeekDates()
  const workoutSet = new Set(workoutDates)

  return (
    <div
      className="rounded-lg border p-6 h-full flex flex-col"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-sm uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-muted)' }}
      >
        This Week
      </div>
      <div className="flex-1 flex items-center justify-between">
        {weekDays.map((day, i) => {
          const iso = toDateStr(day)
          const isToday = iso === todayStr
          const done = workoutSet.has(iso)

          let bg: string
          let border: string
          let textColor: string
          let content: string

          if (done) {
            bg = 'var(--accent)'
            border = '2px solid var(--accent)'
            textColor = 'var(--bg)'
            content = '✓'
          } else if (isToday) {
            bg = 'transparent'
            border = '2px solid var(--accent)'
            textColor = 'var(--accent)'
            content = '·'
          } else {
            bg = 'var(--track)'
            border = '2px solid transparent'
            textColor = 'var(--text-muted)'
            content = '–'
          }

          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {DAY_LABELS[i]}
              </span>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium"
                style={{ background: bg, border, color: textColor }}
              >
                {content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
