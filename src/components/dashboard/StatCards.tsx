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
  const weightSub =
    weightLbs != null && goalWeightLbs != null
      ? `↓ ${weightLbs - goalWeightLbs} lbs to goal`
      : 'Set goal in profile'

  const calRemaining = calorieTarget - caloriesToday
  const calSub =
    calRemaining >= 0
      ? `${calRemaining} remaining`
      : `${Math.abs(calRemaining)} over`
  const calColor = calRemaining >= 0 ? 'var(--accent)' : 'var(--text-secondary)'

  const protRemaining = proteinTarget - proteinToday
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
        subColor="var(--success)"
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
        value={`${workoutsThisWeek} / ${weeklyWorkoutsTarget}`}
        subLine="this week"
        subColor="var(--accent)"
      />
    </div>
  )
}
