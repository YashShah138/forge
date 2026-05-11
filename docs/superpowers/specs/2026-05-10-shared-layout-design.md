# Shared App Layout — Design Spec

**Date:** 2026-05-10
**Status:** Approved
**Scope:** Shared layout for all `(app)/` routes — sidebar, topbar, theme system, login retheme

---

## Overview

Replace the dashboard placeholder with a full app shell. All protected pages under `(app)/` get a collapsible sidebar and a persistent topbar. The login page is rethemed to match. The graphite + rose color system in CLAUDE.md is replaced with lime / zinc.

---

## Architecture

**Pattern:** Server layout shell + client `AppShell` component (Next.js App Router idiomatic).

`(app)/layout.tsx` is a server component. It fetches user + profile data from Supabase and renders `<AppShell ...props>{children}</AppShell>`. Page content (`children`) remains server components because they're passed as props, not rendered inside the client tree.

`AppShell` is the single client component boundary. It owns collapse state and passes it down to `Sidebar` and `Topbar` as props.

---

## File Structure

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx              ← server component; fetches user + streak; renders AppShell
│   │   ├── dashboard/page.tsx      ← replace placeholder (server component)
│   │   ├── workouts/page.tsx       ← stub page
│   │   ├── food/page.tsx           ← stub page
│   │   └── meals/page.tsx          ← stub page
│   ├── login/page.tsx              ← rethemed to lime/zinc (no structural change)
│   └── globals.css                 ← updated with lime/zinc CSS variables
└── components/
    ├── AppShell.tsx                ← client; sidebar + topbar + collapse state
    ├── Sidebar.tsx                 ← nav, logo, streak, theme toggle, user profile
    └── Topbar.tsx                  ← hamburger, page title, streak, avatar
```

---

## Components

### `AppShell` (client component)

- Reads `forge-sidebar-collapsed` from localStorage on mount to initialize collapse state
- Renders: full-height flex row — `<Sidebar>` left + right column (`<Topbar>` + `<main>`)
- Props: `user: { name: string; email: string; avatarInitials: string }`, `streak: number`, `children: React.ReactNode`
- Passes `collapsed: boolean` and `onToggle: () => void` to both `Sidebar` and `Topbar`
- On toggle: flips state, writes new value to `localStorage`

### `Sidebar`

- Props: `collapsed: boolean`, `user`, `streak`
- **Expanded (200px):** FORGE logo (top), nav items with text + dot indicator, active item lime bg + right border, streak counter, theme toggle pill, user initials + name + level (bottom)
- **Collapsed (56px):** icon rail only — dot indicators, no text, logo shrinks to "F", user/streak hidden
- Uses `usePathname()` to determine active nav item
- Nav items: Dashboard (`/dashboard`), Workouts (`/workouts`), Food (`/food`), Meals (`/meals`)
- Theme toggle reads/writes `forge-theme` in localStorage, toggles `dark`/`light` class on `<html>`

### `Topbar`

- Props: `collapsed: boolean`, `onToggle: () => void`, `streak: number`, `user`
- Height: 40px, fixed at top of content column (not full width — sits right of sidebar)
- Left: hamburger button → calls `onToggle`
- Center-left: page title derived from `usePathname()` map (`/dashboard` → `"Dashboard"`, etc.)
- Right: 🔥 + streak count, then avatar circle (lime bg, initials, dark text)

### `login/page.tsx`

- Same structure as current; only colors updated to lime/zinc tokens
- No structural or auth logic changes

---

## Data Flow

`(app)/layout.tsx` (server):
1. `createClient()` from `@/lib/supabase/server`
2. `supabase.auth.getUser()` — if no user, redirect to `/login`
3. `supabase.from('profiles').select(...)` — get name, email
4. `supabase.from('workouts').select('date').order('date', { ascending: false })` — compute streak (consecutive days from today)
5. Pass `user` + `streak` as props to `<AppShell>`

Streak calculation: iterate workouts sorted by date desc, count consecutive calendar days from today. Stop at first gap. Returns `0` if no workouts.

Page titles in `Topbar`: derived from `usePathname()` with a static map — no prop needed from layout.

---

## Theme System

### CSS Variables (globals.css)

Two sets of variables under `.dark` and `.light` (or `:root` for dark default):

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#09090b` | `#f4f4f5` |
| `--surface` | `#111113` | `#e4e4e7` |
| `--border` | `#27272a` | `#d4d4d8` |
| `--text-primary` | `#fafafa` | `#09090b` |
| `--text-secondary` | `#a1a1aa` | `#3f3f46` |
| `--text-muted` | `#52525b` | `#a1a1aa` |
| `--accent` | `#a3e635` | `#65a30d` |
| `--accent-mid` | `#d9f99d` | `#84cc16` |
| `--accent-light` | `#ecfccb` | `#bef264` |
| `--active-nav-bg` | `#1a2600` | `#ecfccb` |
| `--track` | `#27272a` | `#d4d4d8` |
| `--success` | `#4ade80` | `#15803d` |

### Flash Prevention

Root `layout.tsx` includes a blocking inline `<script>` that reads `forge-theme` from localStorage and sets `document.documentElement.className` before paint. Default: `dark`.

### localStorage Keys

| Key | Values | Default |
|---|---|---|
| `forge-theme` | `"dark"` \| `"light"` | `"dark"` |
| `forge-sidebar-collapsed` | `"true"` \| `"false"` | `"false"` (expanded) |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| No profile row | Avatar falls back to email initials; streak = 0 |
| No workouts | Streak = 0, no crash |
| First visit (no localStorage) | Theme defaults dark, sidebar defaults expanded |
| Theme flash | Blocked by inline script in root layout |
| Mobile / narrow screen | Out of scope — desktop-first for this phase |

---

## What This Does NOT Include

- Dashboard UI content (stat cards, macro ring, weekly tracker) — next phase
- Any page-specific content for workouts, food, meals — stubbed only
- Mobile responsive sidebar — future phase
