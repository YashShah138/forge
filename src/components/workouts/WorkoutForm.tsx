'use client'

import { useState, useTransition } from 'react'
import {
  type ExerciseDraft,
  type SetDraft,
  type WorkoutDraft,
  saveWorkout,
  updateWorkout,
  deleteWorkout,
  getPreviousSets,
} from '@/app/(app)/workouts/actions'
import ExerciseBlock from './ExerciseBlock'
import ExercisePicker from './ExercisePicker'

interface WorkoutFormProps {
  initialData?: WorkoutDraft
  previousSets?: Record<string, SetDraft[]>
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WorkoutForm({ initialData, previousSets: initialPreviousSets }: WorkoutFormProps) {
  const [draft, setDraft] = useState<WorkoutDraft>(
    initialData ?? { name: '', date: todayISO(), exercises: [] }
  )
  const [prevSets, setPrevSets] = useState<Record<string, SetDraft[]>>(initialPreviousSets ?? {})
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isEditing = !!initialData?.id

  async function handleAddExercise(name: string, muscle_group: string) {
    setShowPicker(false)
    setDraft(prev => ({
      ...prev,
      exercises: [...prev.exercises, { name, muscle_group, sets: [{ weight_lbs: '', reps: '' }] }],
    }))
    if (!prevSets[name]) {
      const result = await getPreviousSets(name, isEditing ? initialData?.id : undefined)
      if (result) setPrevSets(ps => ({ ...ps, [name]: result }))
    }
  }

  function handleExerciseChange(idx: number, updated: ExerciseDraft) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) => (i === idx ? updated : e)),
    }))
  }

  function handleExerciseRemove(idx: number) {
    setDraft(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== idx),
    }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = isEditing
        ? await updateWorkout(initialData!.id!, draft)
        : await saveWorkout(draft)
      if (result?.error) setError(result.error)
    })
  }

  function handleDelete() {
    if (!initialData?.id) return
    startTransition(async () => {
      await deleteWorkout(initialData!.id!)
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Name + date */}
      <div className="flex gap-3 mb-5 flex-shrink-0">
        <input
          className="flex-1 bg-transparent border rounded-lg px-3 py-2 text-base outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          placeholder="Workout name (e.g. Push Day)"
          value={draft.name}
          onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
        />
        <input
          type="date"
          className="bg-transparent border rounded-lg px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          value={draft.date}
          onChange={e => setDraft(prev => ({ ...prev, date: e.target.value }))}
        />
      </div>

      {/* Exercise blocks */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {draft.exercises.map((ex, i) => (
          <ExerciseBlock
            key={i}
            exercise={ex}
            index={i}
            previousSets={prevSets[ex.name] ?? null}
            onChange={handleExerciseChange}
            onRemove={handleExerciseRemove}
          />
        ))}

        {showPicker ? (
          <ExercisePicker onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
        ) : (
          <button
            type="button"
            className="w-full border border-dashed rounded-lg py-2.5 text-sm mt-1"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            onClick={() => setShowPicker(true)}
          >
            + Add Exercise
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 mt-4 flex gap-3 items-center">
        {error && (
          <span className="flex-1 text-sm" style={{ color: '#f87171' }}>
            {error}
          </span>
        )}
        {isEditing && !error && (
          <button
            type="button"
            disabled={isPending}
            className="text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          disabled={isPending || !draft.name.trim()}
          className="ml-auto px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#09090b' }}
          onClick={handleSave}
        >
          {isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}
