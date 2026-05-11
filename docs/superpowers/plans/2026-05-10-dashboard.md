# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dashboard page — a read-only server-rendered overview showing today's nutrition progress, this week's workout activity, and the last workout logged.

**Architecture:** `(app)/dashboard/page.tsx` is a server component that fires 4 Supabase queries in parallel via `Promise.all`, then passes the results as props to four presentational server components (`StatCards`, `MacroSection`, `WeeklyTracker`, `LastWorkoutCard`). No client components — no interactivity on the dashboard.

**Tech Stack:** Next.js 15 App Router (server components), Supabase SSR client (`@/lib/supabase/server`), Tailwind CSS with CSS variables via inline styles.

---

## Context (read before starting)

**Design system:** all colors are CSS variables — use `style={{ color: 'var(--accent)' }}` etc., never Tailwind color classes. Variables are defined in `src/app/globals.css`:
- `--bg`, `--surface`, `--border` — backgrounds and borders
- `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted` — text hierarchy
- `--accent` (#a3e635 dark / #65a30d light), `--accent-mid`, `--accent-light` — lime progression
- `--active-nav-bg` (#1a2600 dark / #ecfccb light) — lime-tinted card background
- `--track` — unfilled progress track background
- `--success` (#4ade80 dark / #15803d light) — positive/green indicators

**Spacing:** `gap-2.5` (10px) between cards, `p-4` card padding, `rounded-lg` card radius, `border` borders.

**Supabase client:** always `import { createClient } from '@/lib/supabase/server'` in server components. The client is async: `const supabase = await createClient()`.

**Database schema relevant to this page:**
```
profiles   → id, weight_lbs, goal_weight_lbs, calorie_target, protein_target, weekly_workouts_target
workouts   → id, user_id, name, date (YYYY-MM-DD), notes, created_at
exercises  → id, workout_id, name, muscle_group, order_index
food_logs  → id, user_id, date (YYYY-MM-DD), meal_type, food_name, calories, protein_g, carbs_g, fat_g
```

**No test suite is configured.** Verification is: `npm run build` (catches TypeScript errors) + visual check in browser at `http://localhost:3000/dashboard`.

---

## File Map

| File | Action |
|---|---|
| `src/components/dashboard/StatCards.tsx` | Create |
| `src/components/dashboard/MacroSection.tsx` | Create |
| `src/components/dashboard/WeeklyTracker.tsx` | Create |
| `src/components/dashboard/LastWorkoutCard.tsx` | Create |
| `src/app/(app)/dashboard/page.tsx` | Modify (replace stub) |

---

## Task 1: StatCards component

**Files:**
- Create: `src/components/dashboard/StatCards.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/StatCards.tsx

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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds (the component isn't imported yet, but there should be no TS errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/StatCards.tsx
git commit -m "feat: add StatCards dashboard component"
```

---

## Task 2: MacroSection component

**Files:**
- Create: `src/components/dashboard/MacroSection.tsx`

**Note on carbs/fat targets:** The `profiles` table has `calorie_target` and `protein_target` but no carbs or fat targets. The dashboard page (Task 5) will derive them: `carbsTarget = round(calorieTarget * 0.40 / 4)`, `fatTarget = round(calorieTarget * 0.30 / 9)`. MacroSection receives them as regular props and doesn't need to know they're derived.

**SVG ring math:** circumference `C = 2π × 30 ≈ 188.5`. `stroke-dasharray = 188.5`. `stroke-dashoffset = 188.5 × (1 − pct)` where `pct` is clamped 0–1. The SVG is rotated -90deg so the arc starts at the top.

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/MacroSection.tsx

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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/MacroSection.tsx
git commit -m "feat: add MacroSection dashboard component"
```

---

## Task 3: WeeklyTracker component

**Files:**
- Create: `src/components/dashboard/WeeklyTracker.tsx`

**Logic:** compute Monday of the current week (in local time), build 7 dates Mon–Sun, check each against the `workoutDates` set, render the appropriate circle style.

**Circle states:**
- `done`: workout logged on that day → lime bg (`--active-nav-bg`) + lime border + checkmark in `--accent`
- `today`: today, no workout yet → transparent bg + 2px `--accent` border + lime dot
- `rest`: past/future day, no workout → `--track` bg + `–` in `--text-muted`

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/WeeklyTracker.tsx

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
      className="rounded-lg border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-muted)' }}
      >
        This Week
      </div>
      <div className="flex justify-between">
        {weekDays.map((day, i) => {
          const iso = toDateStr(day)
          const isToday = iso === todayStr
          const done = workoutSet.has(iso)

          let bg: string
          let border: string
          let textColor: string
          let content: string

          if (done) {
            bg = 'var(--active-nav-bg)'
            border = '2px solid var(--accent)'
            textColor = 'var(--accent)'
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
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {DAY_LABELS[i]}
              </span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/WeeklyTracker.tsx
git commit -m "feat: add WeeklyTracker dashboard component"
```

---

## Task 4: LastWorkoutCard component

**Files:**
- Create: `src/components/dashboard/LastWorkoutCard.tsx`

**Relative date logic:** compare workout date (local midnight) vs today (local midnight) using day difference. Same day → "Today", 1 day ago → "Yesterday", 2–6 days ago → "X days ago", older → "May 5" format.

**Exercise chips:** lime-tinted tags — `--active-nav-bg` background, `--accent` text.

**Empty state:** `workout` prop is `null` when no workouts exist yet.

- [ ] **Step 1: Create the file**

```tsx
// src/components/dashboard/LastWorkoutCard.tsx

interface LastWorkoutCardProps {
  workout: {
    name: string
    date: string // "YYYY-MM-DD"
    exercises: string[]
  } | null
}

function getRelativeDate(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Parse date as local midnight (append T00:00:00 to avoid UTC offset issues)
  const workoutDate = new Date(`${dateStr}T00:00:00`)
  workoutDate.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - workoutDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 6) return `${diffDays} days ago`
  return workoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function LastWorkoutCard({ workout }: LastWorkoutCardProps) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="text-xs uppercase tracking-widest mb-3"
        style={{ color: 'var(--text-muted)' }}
      >
        Last Workout
      </div>
      {workout ? (
        <>
          <div
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {workout.name}
          </div>
          <div
            className="text-xs mb-3"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {getRelativeDate(workout.date)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workout.exercises.map((ex, i) => (
              <span
                key={i}
                className="rounded-md px-2 py-0.5 text-xs"
                style={{
                  background: 'var(--active-nav-bg)',
                  color: 'var(--accent)',
                }}
              >
                {ex}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          No workouts logged yet
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run build
```

Expected: build succeeds, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/LastWorkoutCard.tsx
git commit -m "feat: add LastWorkoutCard dashboard component"
```

---

## Task 5: Dashboard page

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

**What this does:**
1. Gets the authenticated user (already guaranteed by middleware + layout, but double-checks)
2. Computes today's ISO date, this week's Monday and Sunday ISO dates (all in local time)
3. Fires 4 Supabase queries in parallel via `Promise.all`
4. Logs any query errors to console (never crashes — falls back to zero values)
5. Derives carbs/fat targets from calorie target (40% carbs, 30% fat of total calories)
6. Fetches last workout's exercises (sequential after parallel block, only if a workout exists)
7. Renders the 3-row dashboard layout

**Date helpers:** use local time (not `.toISOString()` which gives UTC) to avoid off-by-one on midnight.

- [ ] **Step 1: Replace the dashboard page**

```tsx
// src/app/(app)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatCards from '@/components/dashboard/StatCards'
import MacroSection from '@/components/dashboard/MacroSection'
import WeeklyTracker from '@/components/dashboard/WeeklyTracker'
import LastWorkoutCard from '@/components/dashboard/LastWorkoutCard'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekBounds(): { monday: string; sunday: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = today.getDay() // 0=Sun … 6=Sat
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday: toDateStr(monday), sunday: toDateStr(sunday) }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const todayISO = toDateStr(new Date())
  const { monday, sunday } = getWeekBounds()

  const [profileResult, foodLogsResult, weekWorkoutsResult, lastWorkoutResult] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'weight_lbs, goal_weight_lbs, calorie_target, protein_target, weekly_workouts_target'
        )
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('food_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', user.id)
        .eq('date', todayISO),
      supabase
        .from('workouts')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', monday)
        .lte('date', sunday),
      supabase
        .from('workouts')
        .select('id, name, date')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1),
    ])

  if (profileResult.error)
    console.error('profiles query failed:', profileResult.error.message)
  if (foodLogsResult.error)
    console.error('food_logs query failed:', foodLogsResult.error.message)
  if (weekWorkoutsResult.error)
    console.error('week workouts query failed:', weekWorkoutsResult.error.message)
  if (lastWorkoutResult.error)
    console.error('last workout query failed:', lastWorkoutResult.error.message)

  const profile = profileResult.data
  const foodLogs = foodLogsResult.data ?? []
  const workoutDates = (weekWorkoutsResult.data ?? []).map((w) => w.date)
  const lastWorkoutRow = lastWorkoutResult.data?.[0] ?? null

  // Sum today's food logs
  const caloriesToday = foodLogs.reduce((s, r) => s + (r.calories ?? 0), 0)
  const proteinToday = foodLogs.reduce((s, r) => s + (r.protein_g ?? 0), 0)
  const carbsToday = foodLogs.reduce((s, r) => s + (r.carbs_g ?? 0), 0)
  const fatToday = foodLogs.reduce((s, r) => s + (r.fat_g ?? 0), 0)

  // Derive carbs/fat targets from calorie target (40% carbs, 30% fat)
  const calorieTarget = profile?.calorie_target ?? 0
  const proteinTarget = profile?.protein_target ?? 0
  const carbsTarget =
    calorieTarget > 0 ? Math.round((calorieTarget * 0.4) / 4) : 0
  const fatTarget =
    calorieTarget > 0 ? Math.round((calorieTarget * 0.3) / 9) : 0

  // Fetch exercises for last workout (sequential — depends on lastWorkoutRow)
  let lastWorkoutData: {
    name: string
    date: string
    exercises: string[]
  } | null = null

  if (lastWorkoutRow) {
    const { data: exercises, error: exError } = await supabase
      .from('exercises')
      .select('name')
      .eq('workout_id', lastWorkoutRow.id)
      .order('order_index', { ascending: true })
    if (exError)
      console.error('exercises query failed:', exError.message)
    lastWorkoutData = {
      name: lastWorkoutRow.name,
      date: lastWorkoutRow.date,
      exercises: exercises?.map((e) => e.name) ?? [],
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <StatCards
        weightLbs={profile?.weight_lbs ?? null}
        goalWeightLbs={profile?.goal_weight_lbs ?? null}
        caloriesToday={caloriesToday}
        calorieTarget={calorieTarget}
        proteinToday={proteinToday}
        proteinTarget={proteinTarget}
        workoutsThisWeek={workoutDates.length}
        weeklyWorkoutsTarget={profile?.weekly_workouts_target ?? 0}
      />
      <MacroSection
        caloriesToday={caloriesToday}
        calorieTarget={calorieTarget}
        proteinToday={proteinToday}
        proteinTarget={proteinTarget}
        carbsToday={carbsToday}
        carbsTarget={carbsTarget}
        fatToday={fatToday}
        fatTarget={fatTarget}
      />
      <div className="grid grid-cols-2 gap-2.5">
        <WeeklyTracker workoutDates={workoutDates} />
        <LastWorkoutCard workout={lastWorkoutData} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to catch TypeScript errors**

```bash
npm run build
```

Expected: clean build, no TypeScript errors, 9+ pages listed.

- [ ] **Step 3: Start dev server and open dashboard**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. Check:
- 4 stat cards render in a row (may show `—` for weight and 0s if no profile data)
- Macro bars row + ring show (bars at 0% if no food logged today)
- Weekly tracker shows 7 circles (today should have lime border)
- Last workout shows "No workouts logged yet" if no workouts exist

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: build dashboard page with stat cards, macro bars, weekly tracker, last workout"
```

---

## Self-Review

**Spec coverage check:**
- ✅ 4-col stat cards: weight, calories, protein, workouts — Task 1
- ✅ Macro bars (2fr) + calorie ring (1fr) — Task 2
- ✅ Weekly tracker Mon–Sun — Task 3
- ✅ Last workout name + exercise tag chips — Task 4
- ✅ Parallel `Promise.all` data fetching — Task 5
- ✅ All 4 Supabase queries (profile, food_logs, week workouts, last workout + exercises) — Task 5
- ✅ Empty/zero states (no profile → `—`, no food → 0%, no workouts → rest circles, no last workout → message) — Tasks 1–4
- ✅ Over-target behavior (clamped bar, soft text) — Task 1 + 2
- ✅ Relative date labels — Task 4
- ✅ Error logging for failed queries — Task 5
- ✅ All CSS variables, no Tailwind color classes — all tasks

**Placeholder scan:** no TBDs, no vague steps, all code is complete.

**Type consistency:**
- `StatCards` props match Task 5 call-site exactly
- `MacroSection` props match Task 5 call-site exactly
- `WeeklyTracker` receives `workoutDates: string[]`, Task 5 passes `.map(w => w.date)`
- `LastWorkoutCard` receives `workout: { name, date, exercises } | null`, Task 5 passes `lastWorkoutData`
