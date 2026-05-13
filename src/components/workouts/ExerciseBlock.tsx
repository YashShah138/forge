'use client'

import type { ExerciseDraft, SetDraft } from '@/app/(app)/workouts/actions'

interface ExerciseBlockProps {
  exercise: ExerciseDraft
  index: number
  previousSets: SetDraft[] | null
  onChange: (index: number, updated: ExerciseDraft) => void
  onRemove: (index: number) => void
}

export default function ExerciseBlock({
  exercise,
  index,
  previousSets,
  onChange,
  onRemove,
}: ExerciseBlockProps) {
  function updateSet(si: number, field: 'weight_lbs' | 'reps', value: string) {
    const sets = exercise.sets.map((s, i) => (i === si ? { ...s, [field]: value } : s))
    onChange(index, { ...exercise, sets })
  }

  function addSet() {
    onChange(index, { ...exercise, sets: [...exercise.sets, { weight_lbs: '', reps: '' }] })
  }

  function removeSet(si: number) {
    if (exercise.sets.length <= 1) return
    onChange(index, { ...exercise, sets: exercise.sets.filter((_, i) => i !== si) })
  }

  const hint = previousSets?.length
    ? `Last: ${previousSets.map(s => `${s.weight_lbs} × ${s.reps}`).join(', ')}`
    : null

  return (
    <div className="mb-5">
      <div className="flex gap-2 mb-1">
        <input
          className="flex-1 bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          placeholder="Exercise name"
          value={exercise.name}
          onChange={e => onChange(index, { ...exercise, name: e.target.value })}
        />
        <input
          className="w-28 bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          placeholder="Muscle group"
          value={exercise.muscle_group}
          onChange={e => onChange(index, { ...exercise, muscle_group: e.target.value })}
        />
        <button
          type="button"
          className="px-2 text-sm flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => onRemove(index)}
          aria-label="Remove exercise"
        >
          ✕
        </button>
      </div>

      {hint && (
        <div className="text-xs mb-2 px-1" style={{ color: 'var(--accent)' }}>
          {hint}
        </div>
      )}

      <div className="rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div
          className="grid text-xs px-3 py-1 border-b"
          style={{
            gridTemplateColumns: '20px 1fr 1fr 24px',
            borderColor: 'var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <span>#</span>
          <span>LBS</span>
          <span>REPS</span>
          <span />
        </div>
        {exercise.sets.map((set, si) => (
          <div
            key={si}
            className="grid items-center px-3 py-1.5 border-b last:border-b-0"
            style={{ gridTemplateColumns: '20px 1fr 1fr 24px', borderColor: 'var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {si + 1}
            </span>
            <input
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
              placeholder="—"
              value={set.weight_lbs}
              onChange={e => updateSet(si, 'weight_lbs', e.target.value)}
              inputMode="decimal"
            />
            <input
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--text-primary)' }}
              placeholder="—"
              value={set.reps}
              onChange={e => updateSet(si, 'reps', e.target.value)}
              inputMode="numeric"
            />
            <button
              type="button"
              className="text-xs justify-self-end"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => removeSet(si)}
              aria-label="Remove set"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-xs mt-1.5 ml-1"
        style={{ color: 'var(--accent)' }}
        onClick={addSet}
      >
        + add set
      </button>
    </div>
  )
}
