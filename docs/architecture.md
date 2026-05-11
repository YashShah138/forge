# Architecture

## Overview

Forge is a Next.js 16 App Router application. All data fetching for protected pages happens server-side using Supabase server clients. The client boundary is kept as shallow as possible — only interactive components (sidebar collapse, theme toggle, forms) are client components.

---

## Request Lifecycle

```
Browser request
  → src/middleware.ts
    → lib/supabase/middleware.ts (updateSession)
      → refresh session cookie via getUser()
      → if unauthenticated + protected route → redirect /login
      → if authenticated + /login → redirect /dashboard
  → Next.js route handler
    → (app)/layout.tsx (server)
      → fetch user, profile, streak from Supabase
      → render <AppShell> with data
        → AppShell (client) renders Sidebar + Topbar
        → page content renders as server component inside AppShell
```

---

## Auth Flow

Authentication is handled by Supabase Auth with email/password.

**Multi-file session pattern:**

1. `src/middleware.ts` — runs on every request, delegates to `lib/supabase/middleware.ts`
2. `lib/supabase/middleware.ts` — calls `getUser()` to refresh the session cookie, then enforces route guards
3. `src/app/auth/actions.ts` — Next.js server actions for `login`, `signup`, `logout`

**Protected routes** must be explicitly listed in the `protectedRoutes` array in `lib/supabase/middleware.ts`. The `(app)/` route group name alone does not protect them.

**Error handling:** Auth errors surface via query params (`/login?error=Invalid credentials`).

---

## Server / Client Component Boundary

```
(app)/layout.tsx          SERVER  ← fetches user + streak, no interactivity
  └── AppShell.tsx        CLIENT  ← collapse state, theme toggle
        ├── Sidebar.tsx   CLIENT  ← usePathname, localStorage
        ├── Topbar.tsx    CLIENT  ← usePathname, onToggle callback
        └── {children}    SERVER  ← page content stays server because passed as props
```

`children` passed into a client component as a prop remain server components. This is the key App Router pattern that keeps pages server-rendered while allowing an interactive shell around them.

---

## Data Flow

### Layout → AppShell

`(app)/layout.tsx` (server) fetches and passes down:

```ts
{
  user: {
    name: string           // from profiles.name, falls back to email prefix
    email: string
    avatarInitials: string // first letters of first + last name, or first 2 of email
  },
  streak: number           // consecutive workout days from today, 0 if none
}
```

### Streak Calculation

```ts
// workouts ordered by date desc
// count consecutive calendar days back from today
// stop at first gap
```

### Page Titles (Topbar)

Derived client-side from `usePathname()` with a static map. No prop drilling from layout needed:

```ts
const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/workouts': 'Workouts',
  '/food': 'Food',
  '/meals': 'Meals',
}
```

---

## Supabase Clients

| File | Usage |
|---|---|
| `lib/supabase/client.ts` | Browser — use in client components (`'use client'`) |
| `lib/supabase/server.ts` | Server — use in server components, server actions, route handlers |
| `lib/supabase/middleware.ts` | Middleware only — session refresh pattern |

Never use the server client in a client component or the browser client in a server component.

---

## AI Integration

All Anthropic API calls go through server route handlers (`app/api/...`). The API key is never exposed to the browser. Client components call the internal API route; the route handler calls Claude.

---

## Theme System

Theme preference stored in `localStorage` key `forge-theme` (`"dark"` | `"light"`, default `"dark"`).

A blocking inline `<script>` in the root `layout.tsx` reads this value and sets `document.documentElement.className` before paint — preventing a flash of the wrong theme on load.

Sidebar collapse state stored in `localStorage` key `forge-sidebar-collapsed` (`"true"` | `"false"`, default `"false"`).
