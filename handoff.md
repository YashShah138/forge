# Forge — Session Handoff

## Goal

Build out the Forge fitness & nutrition tracker in this order (per CLAUDE.md):
1. ~~Shared layout~~ ✅ Done
2. ~~Dashboard UI~~ ✅ Done
3. **Workout tracker** ← in progress
4. Food logger
5. Meal planner + AI recipe generator

---

## Current State

### What's working
- Auth (login/signup/logout) via Supabase, middleware-enforced route guards
- Shared app shell: collapsible sidebar with nav, theme toggle removed (dark mode only now), topbar with hamburger, streak count, user avatar
- Dashboard fully integrated with live Supabase data: StatCards, MacroSection (macro bars + calorie ring), WeeklyTracker, LastWorkoutCard
- Theme persists: dark only, no light mode. Sidebar collapse persists via `localStorage`.
- Workout tracker partially built — design spec and implementation plan written, first 2 tasks complete

### Workout tracker progress

**Completed (this session):**
- Brainstormed UX: after-the-fact logging, compact list, continuous form, overload hint below exercise name, preset picker
- Removed light mode entirely (globals.css, layout.tsx, Sidebar.tsx)
- Design spec: `docs/superpowers/specs/2026-05-13-workout-tracker-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-13-workout-tracker.md`
- Task 1 ✅ `src/lib/exercises.ts` — 36 preset exercises across 6 muscle groups (commit `c306be2`)
- Task 2 ✅ `src/components/workouts/WorkoutRow.tsx` — compact list row with relative date, exercise preview, set count (commit `8c8e326`)

**Remaining tasks (Tasks 3–9+10 from the plan):**

| # | Task | File | Status |
|---|---|---|---|
| 3 | Workouts list page | `src/app/(app)/workouts/page.tsx` | ⏳ pending |
| 4 | Server actions | `src/app/(app)/workouts/actions.ts` | ⏳ pending |
| 5 | ExercisePicker | `src/components/workouts/ExercisePicker.tsx` | ⏳ pending |
| 6 | ExerciseBlock | `src/components/workouts/ExerciseBlock.tsx` | ⏳ pending |
| 7 | WorkoutForm | `src/components/workouts/WorkoutForm.tsx` | ⏳ pending |
| 8 | New workout page | `src/app/(app)/workouts/new/page.tsx` | ⏳ pending |
| 9 | Detail/edit page | `src/app/(app)/workouts/[id]/page.tsx` | ⏳ pending |
| 10 | Smoke test | — | ⏳ pending |

---

## Layout Architecture (important — hard-won)

```
<html>
  <body>
    <AppShell>               ← client component, manages sidebar collapse
      <div flex h-screen overflow-hidden>
        <Sidebar />          ← 256px / 64px collapsed (dark mode only)
        <div flex-col flex-1 overflow-hidden>
          <Topbar />         ← 64px height
          <main             ← overflow-HIDDEN (not auto)
            flex-1 flex-col p-5>
            {children}
          </main>
        </div>
      </div>
    </AppShell>
```

**Rule:** `flex-1 min-h-0` for height-filling children. Never `h-full` on a flex item inside `overflow-y-auto`. See previous handoff for full failure history.

---

## Active Files

| File | Role |
|---|---|
| `src/components/AppShell.tsx` | Client shell — sidebar collapse state |
| `src/components/Sidebar.tsx` | Nav, user display (no theme toggle) |
| `src/components/Topbar.tsx` | Page title, hamburger, streak, avatar |
| `src/app/(app)/layout.tsx` | Server layout — auth check, streak calc |
| `src/app/(app)/dashboard/page.tsx` | Dashboard — all data fetches |
| `src/components/dashboard/` | StatCards, MacroSection, WeeklyTracker, LastWorkoutCard |
| `src/app/layout.tsx` | Root layout — inline script for sidebar state only |
| `src/app/globals.css` | CSS token definitions, dark mode only |
| `src/lib/exercises.ts` | ✅ NEW — static preset exercise list |
| `src/components/workouts/WorkoutRow.tsx` | ✅ NEW — compact list row |

---

## Workout Tracker Design Decisions

| Decision | Choice |
|---|---|
| Logging mode | After the fact (fill in + save once) |
| List layout | Compact rows |
| Detail layout | Continuous form (not exercise cards) |
| Overload hint | Line below exercise name: "Last: 135 × 10, 145 × 8" |
| Exercise entry | Searchable preset picker + custom escape hatch |
| Persistence | Save on submit — local React state → one server action |

---

## Key Implementation Notes for Remaining Tasks

### Task 3 — List page
- `supabase.from('workouts').select('id, name, date, exercises(name, sets(id))')` for set count
- Cast result with `(w.exercises ?? []) as any[]` — Supabase type inference is limited here

### Task 4 — Server actions (`actions.ts`)
- `'use server'` at file top; exports `SetDraft`, `ExerciseDraft`, `WorkoutDraft` types
- `updateWorkout` must explicitly delete sets then exercises (no DB cascade assumed):
  1. Get exercise IDs → delete sets → delete exercises → re-insert fresh
- `getPreviousSets(exerciseName, excludeWorkoutId?)` — used both from server component (detail page pre-fetch) and client component (WorkoutForm on exercise add)
- All actions auth-check with `getAuthenticatedUser()` helper

### Task 7 — WorkoutForm
- Client component, owns full `WorkoutDraft` state
- `handleAddExercise` calls `getPreviousSets` as server action to populate hint
- `useTransition` wraps save/delete calls; `redirect()` in server action causes navigation

### Tasks 8 & 9 — Pages
- Both are server component shells that pass props to `WorkoutForm`
- `/workouts/[id]/page.tsx` — `params` is `Promise<{ id: string }>` in Next.js 15, must `await params`
- Detail page pre-fetches `previousSets` for all exercises using `Promise.all`

---

## What Failed Previously (Do Not Repeat)

1. **`h-full` inside `overflow-y-auto`** — circular height resolution, inconsistent between HMR and fresh load. Fix: `overflow-hidden` on main, `flex-1 min-h-0` on children.
2. **CSS grid auto rows not filling container** — add `gridTemplateRows: '1fr'` inline.
3. **`useEffect` for localStorage** — flickers. Fix: `useIsomorphicLayoutEffect`.
4. **Theme flash** — needed blocking inline script in `<head>`. Now moot (dark only).

---

## Next Steps

1. Start a fresh session, read this handoff
2. Continue from **Task 3** in `docs/superpowers/plans/2026-05-13-workout-tracker.md`
3. Use subagent-driven development (Tasks 3–9 are mostly sequential due to type dependencies)
4. Dependency order: Task 3 (needs WorkoutRow ✅) → Task 4 (actions, independent) → Tasks 5+6 (need Task 4 types) → Task 7 (needs 4+5+6) → Tasks 8+9 (need Task 7)
