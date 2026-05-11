# Shared App Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full app shell — collapsible sidebar, topbar, lime/zinc theme system, and rethemed login page — wrapping all protected routes under `(app)/`.

**Architecture:** `(app)/layout.tsx` is a server component that fetches user + streak data, then renders a client `AppShell` which owns collapse state and passes it to `Sidebar` and `Topbar`. Page content (`children`) stays server-rendered by being passed as props into the client boundary.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Supabase SSR

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/globals.css` | Modify | Lime/zinc CSS variable tokens for dark + light modes |
| `src/app/layout.tsx` | Modify | Add theme flash-prevention inline script |
| `src/components/Topbar.tsx` | Create | Hamburger + page title + streak + avatar |
| `src/components/Sidebar.tsx` | Create | Logo, nav links, streak, theme toggle, user profile |
| `src/components/AppShell.tsx` | Create | Collapse state, full-page flex layout |
| `src/app/(app)/layout.tsx` | Create | Server layout: fetch user + streak, render AppShell |
| `src/app/(app)/dashboard/page.tsx` | Create | Replace placeholder (move from `src/app/dashboard/`) |
| `src/app/(app)/workouts/page.tsx` | Create | Stub page |
| `src/app/(app)/food/page.tsx` | Create | Stub page |
| `src/app/(app)/meals/page.tsx` | Create | Stub page |
| `src/app/dashboard/page.tsx` | Delete | Old placeholder — replaced by (app) version |
| `src/app/login/page.tsx` | Modify | Retheme to lime/zinc |
| `.claude/CLAUDE.md` | Modify | Update design system section to lime/zinc |

---

## Task 1: Update globals.css with lime/zinc token system

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css entirely**

```css
@import "tailwindcss";

:root {
  --bg: #09090b;
  --surface: #111113;
  --border: #27272a;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --text-tertiary: #71717a;
  --text-muted: #52525b;
  --accent: #a3e635;
  --accent-mid: #d9f99d;
  --accent-light: #ecfccb;
  --active-nav-bg: #1a2600;
  --track: #27272a;
  --success: #4ade80;
}

.light {
  --bg: #f4f4f5;
  --surface: #e4e4e7;
  --border: #d4d4d8;
  --text-primary: #09090b;
  --text-secondary: #3f3f46;
  --text-tertiary: #71717a;
  --text-muted: #a1a1aa;
  --accent: #65a30d;
  --accent-mid: #84cc16;
  --accent-light: #bef264;
  --active-nav-bg: #ecfccb;
  --track: #d4d4d8;
  --success: #15803d;
}

* {
  border-color: var(--border);
}

body {
  background: var(--bg);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add lime/zinc CSS variable token system"
```

---

## Task 2: Add theme flash-prevention script to root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout with flash-prevention script and corrected metadata**

Replace the entire file content:

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge",
  description: "Personal fitness and nutrition tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('forge-theme');
                if (t === 'light') document.documentElement.classList.add('light');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased" style={{ background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add theme flash-prevention script to root layout"
```

---

## Task 3: Create Topbar component

**Files:**
- Create: `src/components/Topbar.tsx`

- [ ] **Step 1: Create the Topbar client component**

```tsx
'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/workouts': 'Workouts',
  '/food': 'Food',
  '/meals': 'Meals',
}

interface TopbarProps {
  collapsed: boolean
  onToggle: () => void
  streak: number
  user: { avatarInitials: string }
}

export default function Topbar({ collapsed, onToggle, streak, user }: TopbarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? ''

  return (
    <div
      className="flex items-center gap-3 px-4 border-b flex-shrink-0"
      style={{
        height: '40px',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        onClick={onToggle}
        className="flex flex-col gap-[3px] p-1.5 rounded-md transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="block w-[14px] h-[1.5px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-[14px] h-[1.5px] rounded-full" style={{ background: 'currentColor' }} />
        <span className="block w-[14px] h-[1.5px] rounded-full" style={{ background: 'currentColor' }} />
      </button>

      <span
        className="flex-1 text-xs tracking-widest uppercase"
        style={{ color: 'var(--text-secondary)' }}
      >
        {title}
      </span>

      <div className="flex items-center gap-3">
        {streak > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            🔥 {streak}
          </span>
        )}
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#09090b' }}
        >
          {user.avatarInitials}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify no TypeScript errors**

```bash
npm run dev
```

Expected: compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Topbar.tsx
git commit -m "feat: add Topbar component"
```

---

## Task 4: Create Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar client component**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Workouts', href: '/workouts' },
  { label: 'Food', href: '/food' },
  { label: 'Meals', href: '/meals' },
]

interface SidebarProps {
  collapsed: boolean
  streak: number
  user: { name: string; email: string; avatarInitials: string }
}

export default function Sidebar({ collapsed, streak, user }: SidebarProps) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('forge-theme')
    if (stored === 'light') setTheme('light')
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('forge-theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r transition-all duration-200"
      style={{
        width: collapsed ? '56px' : '200px',
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center px-4 flex-shrink-0 border-b"
        style={{ height: '40px', borderColor: 'var(--border)' }}
      >
        <span
          className="font-medium tracking-widest uppercase overflow-hidden whitespace-nowrap"
          style={{ color: 'var(--text-primary)', fontSize: collapsed ? '14px' : '16px' }}
        >
          {collapsed ? 'F' : 'FORGE'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors text-sm relative overflow-hidden"
              style={{
                background: active ? 'var(--active-nav-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              title={collapsed ? label : undefined}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: active ? 'var(--accent)' : 'var(--text-muted)' }}
              />
              {!collapsed && (
                <span className="truncate text-xs tracking-wide">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: streak + theme toggle + user */}
      {!collapsed && (
        <div
          className="flex flex-col gap-3 p-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          {streak > 0 && (
            <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
              🔥 {streak} day streak
            </span>
          )}

          {/* Theme toggle */}
          <div className="flex items-center gap-2 px-2">
            <button
              onClick={toggleTheme}
              className="relative flex-shrink-0 rounded-full transition-colors"
              style={{
                width: '36px',
                height: '20px',
                background: theme === 'dark' ? 'var(--accent)' : 'var(--track)',
              }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-[3px] rounded-full transition-transform duration-200"
                style={{
                  width: '14px',
                  height: '14px',
                  background: '#fff',
                  left: theme === 'dark' ? '19px' : '3px',
                }}
              />
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {theme === 'dark' ? '☾' : '☀'}
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-2 px-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: 'var(--accent)', color: '#09090b' }}
            >
              {user.avatarInitials}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                {user.name || user.email}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Level 1
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed: just avatar dot */}
      {collapsed && (
        <div className="flex justify-center p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
            style={{ background: 'var(--accent)', color: '#09090b' }}
          >
            {user.avatarInitials}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Sidebar component with collapse + theme toggle"
```

---

## Task 5: Create AppShell component

**Files:**
- Create: `src/components/AppShell.tsx`

- [ ] **Step 1: Create the AppShell client component**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  user: { name: string; email: string; avatarInitials: string }
  streak: number
  children: React.ReactNode
}

export default function AppShell({ user, streak, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('forge-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function handleToggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('forge-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar collapsed={collapsed} streak={streak} user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar collapsed={collapsed} onToggle={handleToggle} streak={streak} user={user} />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add AppShell client component with collapse state"
```

---

## Task 6: Create (app) server layout

**Files:**
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create the (app) route group directory and server layout**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

function getInitials(email: string): string {
  const prefix = email.split('@')[0]
  const parts = prefix.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return prefix.slice(0, 2).toUpperCase()
}

async function getStreak(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<number> {
  const { data: workouts } = await supabase
    .from('workouts')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (!workouts?.length) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < workouts.length; i++) {
    const workoutDate = new Date(workouts[i].date)
    workoutDate.setHours(0, 0, 0, 0)
    const expected = new Date(today)
    expected.setDate(today.getDate() - i)
    if (workoutDate.getTime() === expected.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  // profiles table has no name column — use email prefix as display name
  const displayName = email.split('@')[0]
  const streak = await getStreak(supabase, user.id)

  return (
    <AppShell
      user={{
        name: displayName,
        email,
        avatarInitials: getInitials(email),
      }}
      streak={streak}
    >
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: add (app) server layout with user + streak fetch"
```

---

## Task 7: Create (app) pages and remove old dashboard

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/workouts/page.tsx`
- Create: `src/app/(app)/food/page.tsx`
- Create: `src/app/(app)/meals/page.tsx`
- Delete: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard stub**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        Dashboard
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        Stats and overview coming soon.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create workouts stub**

```tsx
export default function WorkoutsPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        Workouts
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        Workout logging coming soon.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create food stub**

```tsx
export default function FoodPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        Food
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        Food logger coming soon.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Create meals stub**

```tsx
export default function MealsPage() {
  return (
    <div>
      <h1 className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>
        Meals
      </h1>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        Meal planner and AI recipes coming soon.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Delete old dashboard page**

```bash
rm src/app/dashboard/page.tsx
rmdir src/app/dashboard
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/
git add -u src/app/dashboard/
git commit -m "feat: add (app) route group pages, remove old dashboard placeholder"
```

---

## Task 8: Retheme login page to lime/zinc

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Replace login page with lime/zinc theme**

```tsx
import { login, signup } from '../auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm space-y-6 px-6">

        {/* Logo */}
        <div className="text-center">
          <h1
            className="text-5xl font-medium tracking-widest uppercase"
            style={{ color: 'var(--text-primary)' }}
          >
            FORGE
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Build the body. Track the work.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p
            className="text-sm text-center rounded-lg px-4 py-2 border"
            style={{
              color: 'var(--accent)',
              background: 'var(--active-nav-bg)',
              borderColor: 'var(--accent)',
            }}
          >
            {error}
          </p>
        )}

        {/* Form */}
        <form className="space-y-4">
          <div>
            <label
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg px-4 py-3 text-sm focus:outline-none border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 font-semibold rounded-lg py-3 text-sm transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#09090b' }}
            >
              Log In
            </button>
            <button
              formAction={signup}
              className="flex-1 font-semibold rounded-lg py-3 text-sm border transition-colors"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: retheme login page to lime/zinc design system"
```

---

## Task 9: Update CLAUDE.md design system section

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Replace the Design System section in CLAUDE.md**

Find the `## Design System` section and replace it with:

```markdown
## Design System

### Theme
Lime / zinc. Two modes: dark (default) and light. Toggle lives in the sidebar.

### Color Tokens

#### Dark Mode (`:root`)
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#09090b` | App background |
| `--surface` | `#111113` | Sidebar, cards |
| `--border` | `#27272a` | All borders |
| `--text-primary` | `#fafafa` | Headings, values |
| `--text-secondary` | `#a1a1aa` | Labels, subtitles |
| `--text-tertiary` | `#71717a` | Hints |
| `--text-muted` | `#52525b` | Units, stat suffixes |
| `--accent` | `#a3e635` | CTA, active nav, progress |
| `--accent-mid` | `#d9f99d` | Secondary bars |
| `--accent-light` | `#ecfccb` | Tertiary bars |
| `--active-nav-bg` | `#1a2600` | Active sidebar item bg |
| `--track` | `#27272a` | Unfilled progress tracks |
| `--success` | `#4ade80` | Weight loss, positive delta |

#### Light Mode (`.light`)
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#f4f4f5` | App background |
| `--surface` | `#e4e4e7` | Sidebar, cards |
| `--border` | `#d4d4d8` | All borders |
| `--text-primary` | `#09090b` | Headings, values |
| `--text-secondary` | `#3f3f46` | Labels, subtitles |
| `--text-tertiary` | `#71717a` | Hints |
| `--text-muted` | `#a1a1aa` | Units, stat suffixes |
| `--accent` | `#65a30d` | CTA, active nav, progress |
| `--accent-mid` | `#84cc16` | Secondary bars |
| `--accent-light` | `#bef264` | Tertiary bars |
| `--active-nav-bg` | `#ecfccb` | Active sidebar item bg |
| `--track` | `#d4d4d8` | Unfilled progress tracks |
| `--success` | `#15803d` | Weight loss, positive delta |

### Typography
- Font: Geist Sans via `next/font/google`
- Logo/brand: `text-2xl font-medium tracking-widest uppercase`
- Section labels: `text-xs uppercase tracking-widest` (secondary color)
- Stat values: `text-2xl font-medium`
- Body: `text-sm`
- Hints: `text-xs`

### Spacing & Shape
- Border radius: `rounded-lg` for cards, `rounded-md` for inputs/badges
- Card padding: `p-4`
- Gap between cards: `gap-2.5` (10px)
- Sidebar width expanded: `200px`
- Sidebar width collapsed: `56px`
- Topbar height: `40px`
- All borders: `border` with `var(--border)`

### Key Conventions
- Use CSS variables (`var(--accent)` etc.) via inline styles — not Tailwind color classes
- `forge-theme` localStorage key: `"dark"` | `"light"`, default `"dark"`
- `forge-sidebar-collapsed` localStorage key: `"true"` | `"false"`, default `"false"`
- Theme class `.light` on `<html>` — toggled by Sidebar component
```

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md design system to lime/zinc tokens"
```

---

## Task 10: Smoke test the full app

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify login page**

Open http://localhost:3000. Should redirect to `/login`. Check:
- Black-zinc background (`#09090b`)
- FORGE heading in primary text color
- Lime Log In button (`#a3e635`)

- [ ] **Step 3: Sign in and verify app shell**

Sign in with an existing account. Should redirect to `/dashboard`. Check:
- Sidebar visible on left (200px, dark surface)
- FORGE logo at top of sidebar
- Dashboard nav item active (lime bg + right border)
- Topbar at top with hamburger, "Dashboard" title, avatar
- Main content area shows dashboard stub text

- [ ] **Step 4: Verify sidebar collapse**

Click the hamburger in the topbar. Sidebar should:
- Animate to 56px
- Show only dot indicators (no labels)
- Show FORGE → "F"
- Bottom section collapses to just avatar dot
Click again — sidebar re-expands.

- [ ] **Step 5: Verify navigation**

Click Workouts, Food, Meals in the sidebar. Each should:
- Change active nav item to lime
- Update topbar title
- Show stub page content

- [ ] **Step 6: Verify theme toggle**

In the expanded sidebar, click the theme toggle pill. Should:
- Switch between dark and light mode instantly (no flash)
- Persist on page refresh

- [ ] **Step 7: Run build to check for TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 8: Final commit of any remaining changes**

```bash
git add -A
git status  # verify nothing unexpected is staged
git commit -m "feat: complete shared app layout — sidebar, topbar, lime/zinc theme"
```
