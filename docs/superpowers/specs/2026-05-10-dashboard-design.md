# Dashboard UI Design Spec

**Date:** 2026-05-10
**Status:** Approved

---

## Goal

Build the Dashboard page — a read-only overview showing today's nutrition progress, this week's workout activity, and the last workout logged.

---

## Layout

Layout B (approved in brainstorming):

```
[ Weight ] [ Calories ] [ Protein ] [ Workouts ]   ← 4-col stat cards
[ Macro bars (2fr)          ] [ Calorie ring (1fr) ] ← nutrition row
[ Weekly tracker (1fr) ] [ Last workout (1fr) ]       ← activity row
```

All sections render inside the existing `AppShell` / `main` scroll area. No interactivity — dashboard is fully server-rendered.

---

## Files

| File | Action | Responsibility |
|---|---|---|
| `src/app/(app)/dashboard/page.tsx` | Modify | Server component — fetches all data, passes props |
| `src/components/dashboard/StatCards.tsx` | Create | 4 stat cards grid |
| `src/components/dashboard/MacroSection.tsx` | Create | Macro progress bars + calorie ring |
| `src/components/dashboard/WeeklyTracker.tsx` | Create | 7-day workout circle tracker |
| `src/components/dashboard/LastWorkoutCard.tsx` | Create | Last workout name + exercise tag chips |

All components are server components (no `"use client"`).

---

## Data Fetching

`dashboard/page.tsx` fires 4 queries in parallel via `Promise.all`:

1. **Profile** — `profiles` where `id = user.id`
   - Fields: `weight_lbs`, `goal_weight_lbs`, `calorie_target`, `protein_target`, `weekly_workouts_target`

2. **Today's food logs** — `food_logs` where `user_id = me AND date = today`
   - Sum in JS: `calories`, `protein_g`, `carbs_g`, `fat_g`

3. **This week's workouts** — `workouts` where `user_id = me AND date >= monday AND date <= sunday`
   - Returns `date` array; used for weekly tracker dots and workout count stat

4. **Last workout + exercises** — `workouts` ordered by `date desc` limit 1, then `exercises` where `workout_id = that id`
   - Returns workout name + date + array of exercise names

"This week" = Monday–Sunday of the current calendar week, computed server-side.

---

## Component Specifications

### StatCards

4-column grid. Each card: `rounded-lg border p-4` with `--surface` background.

| Card | Value | Sub-line | Sub-line color |
|---|---|---|---|
| Weight | `{weight_lbs} lbs` | `↓ {weight_lbs − goal_weight_lbs} lbs to goal` | `--success` |
| Calories | `{calories_today}` | `{remaining} remaining` or `{over} over` | `--accent` / `--text-secondary` |
| Protein | `{protein_today}g` | `{remaining}g remaining` or `{over}g over` | `--accent` / `--text-secondary` |
| Workouts | `{count} / {weekly_workouts_target}` | `this week` | `--accent` |

If no profile row exists, weight shows `—` and all targets default to `0`.

### MacroSection

Two-column row (`grid-cols-[2fr_1fr]`):

**Left — macro progress bars:**
- Three rows: Protein (`--accent`), Carbs (`--accent-mid`), Fat (`--accent-light`)
- Each row: label left + `Xg / Yg` right, then full-width bar below on `--track` background
- Bar width = `Math.min(value / target * 100, 100)%` — clamped at 100%
- If target is 0, bar stays empty (0%)

**Right — calorie ring:**
- SVG donut: `cx=36 cy=36 r=30 stroke-width=6`
- Track stroke: `--track`
- Fill stroke: `--accent`, `stroke-linecap="round"`, rotated -90deg
- `stroke-dasharray = 2π × 30 ≈ 188.5`
- `stroke-dashoffset = 188.5 × (1 − pct)` where `pct = Math.min(calories_today / calorie_target, 1)`, defaults to 0 if target is 0
- Center text: `{pct}%` in `--text-primary text-sm font-medium`, `"of daily goal"` in `--text-tertiary text-xs` below

### WeeklyTracker

7 circles, one per day Mon–Sun of the current week. Each circle is 28px, with day label above (`text-xs --text-tertiary`).

| State | Condition | Style |
|---|---|---|
| Done | workout date matches this day | `--active-nav-bg` bg, `--accent` border + checkmark |
| Today | day is today, no workout logged | `--accent` border (2px), lime dot center |
| Rest | no workout, not today | `--track` bg, `–` in `--text-muted` |

### LastWorkoutCard

- Section label: `text-xs uppercase tracking-widest --text-secondary`
- Workout name: `text-sm font-medium --text-primary`
- Date line: `text-xs --text-tertiary` using relative label:
  - Same date → `"Today"`
  - 1 day ago → `"Yesterday"`
  - 2–6 days ago → `"X days ago"`
  - Older → formatted date e.g. `"May 5"`
- Exercise chips: `rounded-md px-2 py-0.5 text-xs` with `--active-nav-bg` background and `--accent` text color, flex-wrap row
- Empty state (no workouts ever): `"No workouts logged yet"` in `--text-tertiary text-sm`

---

## Edge Cases

- **No profile row:** weight stat = `—`, all targets = `0`, bars stay empty
- **No food logs today:** all macro values = `0`, bars at 0%, ring at 0%
- **No workouts this week:** all 7 circles in rest state
- **No workouts ever:** LastWorkoutCard shows empty state message
- **Over target (calories/protein):** bar clamped at 100%; sub-line switches to `"{n} over"` in `--text-secondary` (no alarming color)
- **Calorie target = 0:** ring stays at 0% to avoid divide-by-zero

---

## Design Tokens Used

All from the existing CSS variable system — no new tokens needed.

`--bg`, `--surface`, `--border`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`, `--accent`, `--accent-mid`, `--accent-light`, `--active-nav-bg`, `--track`, `--success`
