# Food Logger — Design Spec
_Date: 2026-05-15_

## What We're Building

A day-based food logging page at `/food`. Users log meals (Breakfast, Lunch, Dinner, Snack) with full macro detail (calories, protein, carbs, fat). A persistent quick-add bar at the bottom makes bulk entry fast. Day navigation lets users view and edit past days.

---

## Design Decisions (from sketch exploration)

- **Layout**: Stat strip (4 macro cards) + per-meal cards below — chosen over ring/unified header approaches for scannability
- **Entry UX**: Persistent pinned quick-add bar — eliminates modal friction for bulk entry
- **Macro granularity**: Full macros (cal + P + C + F) — DB schema supports all columns, dashboard already consumes all four
- **Day navigation**: In page header, not topbar — stays with page content, avoids topbar complexity
- **AI macro lookup**: User types a food name or pastes a recipe → ✦ button calls Claude to estimate macros and fills the fields automatically

---

## Architecture

### Files

```
src/app/(app)/food/
├── page.tsx        server component
└── actions.ts      server actions

src/app/api/food/
└── macros/route.ts   AI macro estimation route handler

src/components/food/
├── FoodLogPage.tsx     client orchestrator
├── MacroStatStrip.tsx  4 stat cards with progress bars
├── MealCard.tsx        per-meal section with entry list
└── QuickAddBar.tsx     pinned entry bar with AI lookup
```

### Data Flow

1. `page.tsx` reads `searchParams.date` (defaults to today's ISO date)
2. Fetches `food_logs` for that date + `profiles` for targets — parallel `Promise.all`
3. Passes data to `<FoodLogPage>` as props
4. Day nav calls `router.push('?date=YYYY-MM-DD')` — triggers server re-render with new date
5. `addFoodLog` and `deleteFoodLog` call `revalidatePath('/food')` after mutation

---

## Components

### `page.tsx` (server)
- Reads `searchParams.date`, defaults to today
- Fetches: `food_logs` for user+date, `profiles` for calorie_target + protein_target
- Computes nothing — passes raw rows to client
- Auth guard: redirect to `/login` if no user

### `actions.ts` (server actions)
- `addFoodLog(draft)` — inserts one `food_logs` row, revalidatePath('/food')
- `deleteFoodLog(id)` — deletes by id (verifies user ownership), revalidatePath('/food')
- `getAuthenticatedUser()` helper — same pattern as workouts/actions.ts

### `FoodLogPage.tsx` (client, `'use client'`)
- Receives: `logs`, `profile` (targets), `selectedDate` (string)
- Day navigation with `useRouter` → `router.push(\`?date=${newDate}\`)`
- Groups logs by `meal_type` into 4 buckets
- Computes running totals (sum across all logs)
- Renders: MacroStatStrip → MealCards → QuickAddBar
- `useTransition` for async action calls

### `MacroStatStrip.tsx`
- Props: `{ cal, protein, carbs, fat, targets }`
- 4 cards: Calories · Protein · Carbs · Fat
- Each: label, consumed/target, thin progress bar
- Colors: lime for cal, blue for protein, orange for carbs, purple for fat
- Progress bar clamped to 100%

### `MealCard.tsx`
- Props: `{ mealType, entries, onDelete }`
- Header: meal name (uppercase) + total summary string
- Entry rows: food name + macro badges + hover-reveal delete button
- Empty state: "Nothing logged yet." in muted italic

### `QuickAddBar.tsx`
- Always visible at bottom of page (not fixed — flex-shrink-0 in column)
- Fields: meal select · food name (textarea) · ✦ AI button · cal · protein · carbs · fat · Add button
- Food name input is an auto-expanding `textarea` (1 row default, grows with content) — supports both single food names and pasted recipes
- **✦ AI button**: sends textarea content to `/api/food/macros`, receives `{ calories, protein_g, carbs_g, fat_g }`, fills the number inputs; shows spinner while loading
- Cmd+Enter (or Ctrl+Enter) submits; plain Enter adds newline in textarea
- Calls `addFoodLog` via `useTransition`
- Clears + refocuses food name textarea on success

### `src/app/api/food/macros/route.ts` (route handler)
- POST — receives `{ input: string }` (food name or recipe text)
- Calls Claude API (`claude-haiku-4-5-20251001` for speed/cost) with a structured prompt
- Returns `{ calories: number, protein_g: number, carbs_g: number, fat_g: number }`
- Prompt instructs Claude to estimate macros for the described food/recipe and respond with JSON only
- Error response: `{ error: string }` with appropriate HTTP status

---

## Layout Structure

```
<div class="flex flex-col flex-1 min-h-0">   ← FoodLogPage root
  <DayNav />                                  flex-shrink-0
  <MacroStatStrip />                          flex-shrink-0
  <div class="flex-1 overflow-y-auto min-h-0">  ← scrollable meal list
    <MealCard meal="breakfast" />
    <MealCard meal="lunch" />
    <MealCard meal="dinner" />
    <MealCard meal="snack" />
  </div>
  <QuickAddBar />                             flex-shrink-0
</div>
```

Follows the same overflow-hidden / flex-1 min-h-0 pattern established in WorkoutForm.

---

## Error Handling

- Page-level fetch error → inline error message (matches workouts/page.tsx pattern)
- `addFoodLog` / `deleteFoodLog` return `{ error: string }` on failure
- `FoodLogPage` surfaces action errors inline (same pattern as WorkoutForm)

---

## Out of Scope

- Editing an existing entry (delete + re-add)
- Calorie budget rollover across days
- Per-meal targets
- Caching AI macro lookups (looked-up values are user-editable before save anyway)
