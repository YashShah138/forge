'use client'

import { useState } from 'react'
import { EXERCISE_PRESETS, MUSCLE_GROUPS } from '@/lib/exercises'

interface ExercisePickerProps {
  onSelect: (name: string, muscle_group: string) => void
  onClose: () => void
}

export default function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const filtered = EXERCISE_PRESETS.filter(e =>
    e.name.toLowerCase().includes(query.toLowerCase())
  )

  const grouped = MUSCLE_GROUPS.map(group => ({
    group,
    exercises: filtered.filter(e => e.muscle_group === group),
  })).filter(g => g.exercises.length > 0)

  function handleSelect(name: string, muscle_group: string) {
    onSelect(name, muscle_group)
    onClose()
  }

  function handleCustomSubmit() {
    if (!customName.trim()) return
    onSelect(customName.trim(), customMuscle.trim() || 'Other')
    onClose()
  }

  return (
    <div
      className="rounded-lg border mt-2"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {!showCustom ? (
        <>
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <input
              autoFocus
              className="w-full bg-transparent text-sm outline-none px-2 py-1"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search exercises..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            {grouped.map(({ group, exercises }) => (
              <div key={group}>
                <div
                  className="px-3 py-1 text-xs uppercase tracking-widest sticky top-0"
                  style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
                >
                  {group}
                </div>
                {exercises.map(ex => (
                  <button
                    key={ex.name}
                    type="button"
                    className="w-full text-left px-4 py-1.5 text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--active-nav-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => handleSelect(ex.name, ex.muscle_group)}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                No matches.
              </div>
            )}
          </div>
          <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              className="w-full text-left px-2 py-1.5 text-xs rounded"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setShowCustom(true)}
            >
              + Custom exercise
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 flex flex-col gap-2">
          <input
            autoFocus
            className="w-full bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Exercise name"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          />
          <input
            className="w-full bg-transparent border rounded-md px-3 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Muscle group (optional)"
            value={customMuscle}
            onChange={e => setCustomMuscle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 py-1.5 rounded-md text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#09090b' }}
              onClick={handleCustomSubmit}
            >
              Add
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 rounded-md text-sm border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => setShowCustom(false)}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
