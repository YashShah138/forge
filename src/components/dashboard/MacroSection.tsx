interface MacroSectionProps {
  caloriesToday: number
  calorieTarget: number
  proteinToday: number
  proteinTarget: number
  carbsToday: number
  carbsTarget: number
  fatToday: number
  fatTarget: number
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string
  value: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const valueLabel = target > 0 ? `${value}g / ${target}g` : `${value}g`

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {valueLabel}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--track)' }}
      >
        <div
          className="h-2 rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function MacroSection({
  caloriesToday,
  calorieTarget,
  proteinToday,
  proteinTarget,
  carbsToday,
  carbsTarget,
  fatToday,
  fatTarget,
}: MacroSectionProps) {
  const CIRC = 314.2 // 2π × r=50
  const pct = calorieTarget > 0 ? Math.min(caloriesToday / calorieTarget, 1) : 0
  const offset = CIRC * (1 - pct)
  const displayPct = Math.round(pct * 100)

  return (
    <div className="grid gap-2.5 h-full" style={{ gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr' }}>
      {/* Macro bars */}
      <div
        className="rounded-lg border p-6 flex flex-col h-full"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="text-sm uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Macros Today
        </div>
        <div className="flex-1 flex flex-col justify-around">
          <MacroBar
            label="Protein"
            value={proteinToday}
            target={proteinTarget}
            color="var(--accent)"
          />
          <MacroBar
            label="Carbs"
            value={carbsToday}
            target={carbsTarget}
            color="var(--accent-mid)"
          />
          <MacroBar
            label="Fat"
            value={fatToday}
            target={fatTarget}
            color="var(--accent-light)"
          />
        </div>
      </div>

      {/* Calorie ring */}
      <div
        className="rounded-lg border p-6 flex flex-col items-center justify-center h-full"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="text-sm uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Daily Goal
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            width="140"
            height="140"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="70"
              cy="70"
              r="50"
              fill="none"
              stroke="var(--track)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r="50"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-2xl font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayPct}%
            </div>
          </div>
        </div>
        <div
          className="text-sm mt-3"
          style={{ color: 'var(--text-tertiary)' }}
        >
          of daily goal
        </div>
      </div>
    </div>
  )
}
