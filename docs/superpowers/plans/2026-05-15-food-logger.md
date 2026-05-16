# Food Logger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a day-based food logging page at `/food` where users can log meals with full macros, navigate between days, and use Claude to auto-estimate macros from a food name or pasted recipe.

**Architecture:** Server component `food/page.tsx` reads a `?date=` query param, fetches `food_logs` + `profiles` in parallel, and passes data to a client orchestrator `FoodLogPage`. Mutations go through server actions (`addFoodLog`, `deleteFoodLog`) that call `revalidatePath('/food')` — Next.js re-renders the server component with fresh data automatically. AI estimation is a POST route handler at `/api/food/macros` that calls Claude Haiku and returns JSON macros.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (server client), Anthropic SDK (`@anthropic-ai/sdk`), Tailwind CSS with CSS variable tokens.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/app/api/food/macros/route.ts` | Create | POST handler — calls Claude, returns `{ calories, protein_g, carbs_g, fat_g }` |
| `src/app/(app)/food/actions.ts` | Create | `addFoodLog`, `deleteFoodLog` server actions |
| `src/app/(app)/food/page.tsx` | Replace | Server component — fetches logs + profile, renders FoodLogPage |
| `src/components/food/MacroStatStrip.tsx` | Create | 4 stat cards (cal/protein/carbs/fat) with progress bars |
| `src/components/food/MealCard.tsx` | Create | Per-meal section with entry list and delete |
| `src/components/food/QuickAddBar.tsx` | Create | Pinned entry bar — expanding textarea, AI estimate button, macro fields |
| `src/components/food/FoodLogPage.tsx` | Create | Client orchestrator — day nav, groups logs by meal, composes all parts |

---

## Task 1: Install Anthropic SDK

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the SDK**

```bash
cd /path/to/forge && npm install @anthropic-ai/sdk
```

Expected output: `added 1 package` (or similar). No errors.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@anthropic-ai/sdk'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @anthropic-ai/sdk"
```

---

## Task 2: AI Macro Estimation Route Handler

**Files:**
- Create: `src/app/api/food/macros/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/app/api/food/macros
```

Create `src/app/api/food/macros/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input: string = body?.input ?? ''

    if (!input.trim()) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Estimate the nutritional macros for the following food or recipe. Return ONLY a JSON object with these exact keys: calories (number), protein_g (number), carbs_g (number), fat_g (number). Round all values to the nearest whole number. No explanation, no markdown, just the raw JSON object.

Food or recipe:
${input.trim()}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const data = JSON.parse(text)

    return NextResponse.json({
      calories: Math.round(Number(data.calories) || 0),
      protein_g: Math.round(Number(data.protein_g) || 0),
      carbs_g: Math.round(Number(data.carbs_g) || 0),
      fat_g: Math.round(Number(data.fat_g) || 0),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to estimate macros' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify ANTHROPIC_API_KEY is set**

```bash
grep ANTHROPIC_API_KEY .env.local
```

Expected: a line like `ANTHROPIC_API_KEY=sk-ant-...`. If missing, add it.

- [ ] **Step 3: Manual smoke test**

With the dev server running (`npm run dev`), run:

```bash
curl -s -X POST http://localhost:3000/api/food/macros \
  -H "Content-Type: application/json" \
  -d '{"input": "Greek yogurt 200g"}' | cat
```

Expected: `{"calories":120,"protein_g":17,"carbs_g":7,"fat_g":3}` (values will vary — any valid JSON with all 4 keys is a pass).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/food/macros/route.ts
git commit -m "feat: add AI macro estimation route handler"
```

---

## Task 3: Server Actions

**Files:**
- Create: `src/app/(app)/food/actions.ts`

- [ ] **Step 1: Create the file**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type FoodLogDraft = {
  date: string
  meal_type: MealType
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function addFoodLog(draft: FoodLogDraft) {
  const { supabase, user } = await getAuthenticatedUser()

  const { error } = await supabase.from('food_logs').insert({
    user_id: user.id,
    date: draft.date,
    meal_type: draft.meal_type,
    food_name: draft.food_name.trim(),
    calories: draft.calories,
    protein_g: draft.protein_g,
    carbs_g: draft.carbs_g,
    fat_g: draft.fat_g,
  })

  if (error) return { error: error.message }
  revalidatePath('/food')
}

export async function deleteFoodLog(id: string) {
  const { supabase, user } = await getAuthenticatedUser()

  const { data: existing } = await supabase
    .from('food_logs')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) return { error: 'Entry not found' }

  const { error } = await supabase.from('food_logs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/food')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/food/actions.ts
git commit -m "feat: add food log server actions (add, delete)"
```

---

## Task 4: Food Page (Server Component)

**Files:**
- Replace: `src/app/(app)/food/page.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FoodLogPage from '@/components/food/FoodLogPage'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const selectedDate = params.date ?? toDateStr(new Date())

  const [logsResult, profileResult] = await Promise.all([
    supabase
      .from('food_logs')
      .select('id, meal_type, food_name, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('calorie_target, protein_target')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (logsResult.error) {
    console.error('food_logs query failed:', logsResult.error.message)
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Failed to load food log. Please try refreshing.
        </p>
      </div>
    )
  }

  return (
    <FoodLogPage
      logs={logsResult.data ?? []}
      profile={profileResult.data ?? null}
      selectedDate={selectedDate}
    />
  )
}
```

- [ ] **Step 2: Create the `src/components/food/` directory**

```bash
mkdir -p src/components/food
```

- [ ] **Step 3: Verify the page compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build fails on missing `FoodLogPage` import — that's fine, confirms the page itself is valid TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/food/page.tsx
git commit -m "feat: replace food page stub with server component"
```

---

## Task 5: MacroStatStrip Component

**Files:**
- Create: `src/components/food/MacroStatStrip.tsx`

- [ ] **Step 1: Create the file**

```typescript
interface Targets {
  calorie_target: number | null
  protein_target: number | null
}

interface MacroStatStripProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  targets: Targets | null
}

interface StatCardProps {
  label: string
  consumed: number
  target: number | null
  unit?: string
  barColor: string
}

function StatCard({ label, consumed, target, unit, barColor }: StatCardProps) {
  const pct = target ? Math.min(100, Math.round((consumed / target) * 100)) : 0
  return (
    <div
      className="rounded-lg p-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <p
        className="text-xs uppercase tracking-widest mb-1.5"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
          {consumed.toLocaleString()}
        </span>
        {target !== null && (
          <>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {target.toLocaleString()}
            </span>
          </>
        )}
        {unit && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      <div className="h-0.5 rounded-full" style={{ background: 'var(--track)' }}>
        <div
          className="h-0.5 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  )
}

export default function MacroStatStrip({
  calories,
  protein,
  carbs,
  fat,
  targets,
}: MacroStatStripProps) {
  return (
    <div className="grid grid-cols-4 gap-2.5 mb-4 flex-shrink-0">
      <StatCard
        label="Calories"
        consumed={calories}
        target={targets?.calorie_target ?? null}
        barColor="var(--accent)"
      />
      <StatCard
        label="Protein"
        consumed={protein}
        target={targets?.protein_target ?? null}
        unit="g"
        barColor="#60a5fa"
      />
      <StatCard label="Carbs" consumed={carbs} target={null} unit="g" barColor="#fb923c" />
      <StatCard label="Fat" consumed={fat} target={null} unit="g" barColor="#c084fc" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/food/MacroStatStrip.tsx
git commit -m "feat: add MacroStatStrip component"
```

---

## Task 6: MealCard Component

**Files:**
- Create: `src/components/food/MealCard.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useTransition } from 'react'
import { deleteFoodLog } from '@/app/(app)/food/actions'

export type FoodLogEntry = {
  id: string
  meal_type: string
  food_name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface MealCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  entries: FoodLogEntry[]
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function MealCard({ mealType, entries }: MealCardProps) {
  const [isPending, startTransition] = useTransition()

  const totals = entries.reduce(
    (acc, e) => ({
      cal: acc.cal + e.calories,
      prot: acc.prot + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }),
    { cal: 0, prot: 0, carbs: 0, fat: 0 }
  )

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFoodLog(id)
    })
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          {MEAL_LABELS[mealType]}
        </span>
        {entries.length > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {totals.cal} cal · {totals.prot}P · {totals.carbs}C · {totals.fat}F
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="px-3.5 py-4 text-xs italic" style={{ color: 'var(--text-muted)' }}>
          Nothing logged yet.
        </p>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            className="group flex items-center gap-2 px-3.5 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
              {entry.food_name}
            </span>
            <div className="flex gap-3">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{entry.calories}</span> cal
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{entry.protein_g}g</span> P
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{entry.carbs_g}g</span> C
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{entry.fat_g}g</span> F
              </span>
            </div>
            <button
              onClick={() => handleDelete(entry.id)}
              disabled={isPending}
              className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-xs disabled:cursor-not-allowed"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/food/MealCard.tsx
git commit -m "feat: add MealCard component with delete"
```

---

## Task 7: QuickAddBar Component

**Files:**
- Create: `src/components/food/QuickAddBar.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useState, useRef, useTransition } from 'react'
import { addFoodLog, type MealType, type FoodLogDraft } from '@/app/(app)/food/actions'

const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

interface QuickAddBarProps {
  selectedDate: string
}

export default function QuickAddBar({ selectedDate }: QuickAddBarProps) {
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [foodName, setFoodName] = useState('')
  const [cal, setCal] = useState('')
  const [prot, setProt] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameRef = useRef<HTMLTextAreaElement>(null)

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  async function estimateMacros() {
    if (!foodName.trim()) {
      nameRef.current?.focus()
      return
    }
    setAiLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/food/macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: foodName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Estimation failed')
        return
      }
      setCal(String(data.calories))
      setProt(String(data.protein_g))
      setCarbs(String(data.carbs_g))
      setFat(String(data.fat_g))
    } catch {
      setError('Failed to reach AI service')
    } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit() {
    if (!foodName.trim()) {
      nameRef.current?.focus()
      return
    }
    setError(null)
    const draft: FoodLogDraft = {
      date: selectedDate,
      meal_type: meal,
      food_name: foodName.trim(),
      calories: parseInt(cal) || 0,
      protein_g: parseInt(prot) || 0,
      carbs_g: parseInt(carbs) || 0,
      fat_g: parseInt(fat) || 0,
    }
    startTransition(async () => {
      const result = await addFoodLog(draft)
      if (result?.error) {
        setError(result.error)
        return
      }
      setFoodName('')
      setCal('')
      setProt('')
      setCarbs('')
      setFat('')
      if (nameRef.current) {
        nameRef.current.style.height = 'auto'
        nameRef.current.focus()
      }
    })
  }

  const inputStyle = {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const macroFields = [
    { id: 'cal', value: cal, set: setCal, label: 'cal' },
    { id: 'prot', value: prot, set: setProt, label: 'P g' },
    { id: 'carbs', value: carbs, set: setCarbs, label: 'C g' },
    { id: 'fat', value: fat, set: setFat, label: 'F g' },
  ]

  return (
    <div
      className="flex-shrink-0 mt-3 rounded-lg p-2.5 flex gap-2 items-start"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Meal selector */}
      <select
        value={meal}
        onChange={(e) => setMeal(e.target.value as MealType)}
        className="rounded-md px-2 py-1.5 text-xs outline-none mt-0.5"
        style={{ ...inputStyle }}
      >
        {MEALS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div
        className="self-stretch w-px mx-0.5 mt-0.5"
        style={{ background: 'var(--border)' }}
      />

      {/* Food name + AI button */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex gap-2 items-start">
          <textarea
            ref={nameRef}
            value={foodName}
            onChange={(e) => {
              setFoodName(e.target.value)
              autoResize(e.target)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Food name or paste a recipe…"
            rows={1}
            className="flex-1 rounded-md px-2.5 py-1.5 text-sm resize-none"
            style={{
              ...inputStyle,
              lineHeight: '1.4',
              minHeight: '32px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          />
          <button
            onClick={estimateMacros}
            disabled={aiLoading}
            className="rounded-md px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 flex-shrink-0 disabled:opacity-50 transition-opacity"
            style={{
              background: 'var(--active-nav-bg)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
            }}
          >
            {aiLoading ? '⟳' : '✦'} {aiLoading ? 'Thinking…' : 'Estimate'}
          </button>
        </div>
        {error && (
          <p className="text-xs" style={{ color: '#f87171' }}>
            {error}
          </p>
        )}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Cmd+Enter to log · ✦ to estimate macros
        </p>
      </div>

      {/* Divider */}
      <div
        className="self-stretch w-px mx-0.5 mt-0.5"
        style={{ background: 'var(--border)' }}
      />

      {/* Macro inputs */}
      <div className="flex gap-1.5 items-start mt-0.5">
        {macroFields.map(({ id, value, set, label }) => (
          <div key={id} className="flex flex-col gap-1 items-center">
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => set(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="0"
              className="rounded-md px-2 py-1.5 text-xs text-right w-14"
              style={inputStyle}
            />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !foodName.trim()}
        className="rounded-md px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50 mt-0.5 flex-shrink-0"
        style={{ background: 'var(--accent)', color: '#09090b' }}
      >
        {isPending ? 'Adding…' : '+ Add'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/food/QuickAddBar.tsx
git commit -m "feat: add QuickAddBar with AI macro estimation"
```

---

## Task 8: FoodLogPage Orchestrator

**Files:**
- Create: `src/components/food/FoodLogPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import MacroStatStrip from './MacroStatStrip'
import MealCard, { type FoodLogEntry } from './MealCard'
import QuickAddBar from './QuickAddBar'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

type MealType = (typeof MEAL_TYPES)[number]

interface Profile {
  calorie_target: number | null
  protein_target: number | null
}

interface FoodLogPageProps {
  logs: FoodLogEntry[]
  profile: Profile | null
  selectedDate: string
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${d}`
}

function offsetDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function todayISO(): string {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export default function FoodLogPage({ logs, profile, selectedDate }: FoodLogPageProps) {
  const router = useRouter()
  const isToday = selectedDate === todayISO()

  const grouped = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = logs.filter((l) => l.meal_type === type)
      return acc
    },
    {} as Record<MealType, FoodLogEntry[]>
  )

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein_g,
      carbs: acc.carbs + l.carbs_g,
      fat: acc.fat + l.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  function navigate(dir: -1 | 1) {
    router.push(`?date=${offsetDate(selectedDate, dir)}`)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header: title + day nav */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h1
          className="text-xl font-medium tracking-wide uppercase"
          style={{ color: 'var(--text-primary)' }}
        >
          Food
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-7 h-7 flex items-center justify-center rounded-md border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            ‹
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {formatDate(selectedDate)}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-7 h-7 flex items-center justify-center rounded-md border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            ›
          </button>
          {isToday && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--active-nav-bg)', color: 'var(--accent)' }}
            >
              Today
            </span>
          )}
        </div>
        <div style={{ width: '4rem' }} />
      </div>

      {/* Macro strip */}
      <MacroStatStrip
        calories={totals.calories}
        protein={totals.protein}
        carbs={totals.carbs}
        fat={totals.fat}
        targets={profile}
      />

      {/* Meal cards (scrollable) */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5">
        {MEAL_TYPES.map((type) => (
          <MealCard key={type} mealType={type} entries={grouped[type]} />
        ))}
      </div>

      {/* Pinned quick-add bar */}
      <QuickAddBar selectedDate={selectedDate} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/food/FoodLogPage.tsx
git commit -m "feat: add FoodLogPage client orchestrator"
```

---

## Task 9: End-to-End Verification

**Files:** None — manual testing only.

- [ ] **Step 1: Run build to check types**

```bash
npm run build 2>&1 | tail -30
```

Expected: no TypeScript errors. Fix any type errors before proceeding.

- [ ] **Step 2: Navigate to /food**

Open `http://localhost:3000/food`. Verify:
- Macro strip shows 4 cards (Calories / Protein / Carbs / Fat)
- 4 meal cards render (Breakfast, Lunch, Dinner, Snack) each showing "Nothing logged yet."
- Quick-add bar is visible at the bottom with meal select, textarea, ✦ Estimate button, 4 number fields, + Add button

- [ ] **Step 3: Test AI estimation**

Type `"paneer tikka masala, 1 serving"` in the food name field. Click **✦ Estimate**. Verify:
- Button shows "⟳ Thinking…" while loading
- After ~2s, the cal/P/C/F fields fill with reasonable numbers
- Button returns to "✦ Estimate"

- [ ] **Step 4: Test logging a meal**

With macro fields filled, hit **+ Add**. Verify:
- The entry appears in the correct meal card
- Macro strip totals update to reflect the new entry
- Food name textarea clears and refocuses

- [ ] **Step 5: Test Cmd+Enter**

Type another food name, fill macros manually, press **Cmd+Enter**. Verify it logs the entry.

- [ ] **Step 6: Test delete**

Hover over a logged entry. Verify a ✕ button appears. Click it. Verify the entry disappears and totals update.

- [ ] **Step 7: Test day navigation**

Click **‹** to go to yesterday. Verify:
- URL updates to `?date=YYYY-MM-DD`
- "Today" badge disappears
- Logs are empty (or show that day's data)
- Click **›** twice to go to tomorrow, then back to today

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete food logger with AI macro estimation"
```
