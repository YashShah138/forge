interface StatCardsProps {
  weightLbs: number | null
  goalWeightLbs: number | null
  caloriesToday: number
  calorieTarget: number
  proteinToday: number
  proteinTarget: number
  workoutsThisWeek: number
  weeklyWorkoutsTarget: number
}

function StatCard({
  label,
  value,
  subLine,
  subColor,
}: {
  label: string
  value: string
  subLine: string
  subColor: string
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: subColor }}>
        {subLine}
      </div>
    </div>
  )
}

export default function StatCards({
  weightLbs,
  goalWeightLbs,
  caloriesToday,
  calorieTarget,
  proteinToday,
  proteinTarget,
  workoutsThisWeek,
  weeklyWorkoutsTarget,
}: StatCardsProps) {
  const weightValue = weightLbs != null ? `${weightLbs} lbs` : '—'
  const weightSub = (() => {
    if (weightLbs == null || goalWeightLbs == null) return 'Set goal in profile'
    const delta = Math.round(weightLbs - goalWeightLbs)
    if (delta > 0) return `↓ ${delta} lbs to goal`
    if (delta === 0) return 'Goal reached!'
    return `${Math.abs(delta)} lbs below goal`
  })()
  const weightColor = (() => {
    if (weightLbs == null || goalWeightLbs == null) return 'var(--text-muted)'
    const delta = Math.round(weightLbs - goalWeightLbs)
    return delta <= 0 ? 'var(--accent)' : 'var(--success)'
  })()

  const calRemaining = Math.round(calorieTarget - caloriesToday)
  const calSub =
    calRemaining >= 0
      ? `${calRemaining} remaining`
      : `${Math.abs(calRemaining)} over`
  const calColor = calRemaining >= 0 ? 'var(--accent)' : 'var(--text-secondary)'

  const protRemaining = Math.round(proteinTarget - proteinToday)
  const protSub =
    protRemaining >= 0
      ? `${protRemaining}g remaining`
      : `${Math.abs(protRemaining)}g over`
  const protColor = protRemaining >= 0 ? 'var(--accent)' : 'var(--text-secondary)'

  return (
    <div className="grid grid-cols-4 gap-2.5">
      <StatCard
        label="Weight"
        value={weightValue}
        subLine={weightSub}
        subColor={weightColor}
      />
      <StatCard
        label="Calories"
        value={String(caloriesToday)}
        subLine={calSub}
        subColor={calColor}
      />
      <StatCard
        label="Protein"
        value={`${proteinToday}g`}
        subLine={protSub}
        subColor={protColor}
      />
      <StatCard
        label="Workouts"
        value={weeklyWorkoutsTarget > 0 ? `${workoutsThisWeek} / ${weeklyWorkoutsTarget}` : String(workoutsThisWeek)}
        subLine="this week"
        subColor="var(--accent)"
      />
    </div>
  )
}
