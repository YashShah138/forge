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
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {valueLabel}
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--track)' }}
      >
        <div
          className="h-1 rounded-full"
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
  const CIRC = 188.5
  const pct = calorieTarget > 0 ? Math.min(caloriesToday / calorieTarget, 1) : 0
  const offset = CIRC * (1 - pct)
  const displayPct = Math.round(pct * 100)

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
      {/* Macro bars */}
      <div
        className="rounded-lg border p-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Macros Today
        </div>
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

      {/* Calorie ring */}
      <div
        className="rounded-lg border p-4 flex flex-col items-center justify-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="text-xs uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-muted)' }}
        >
          Daily Goal
        </div>
        <div className="relative flex items-center justify-center">
          <svg
            width="72"
            height="72"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--track)"
              strokeWidth="6"
            />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <div
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayPct}%
            </div>
          </div>
        </div>
        <div
          className="text-xs mt-2"
          style={{ color: 'var(--text-tertiary)' }}
        >
          of daily goal
        </div>
      </div>
    </div>
  )
}
