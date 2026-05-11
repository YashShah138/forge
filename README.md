# Forge

Personal fitness tracker for logging workouts, tracking nutrition, and generating AI-powered vegetarian meal plans. Built for weight loss and lean athletic development.

---

## Features

**Built**
- Email/password authentication (Supabase Auth)
- Protected routes with session refresh middleware
- User profile auto-created on signup

**In Progress**
- Shared app layout — collapsible sidebar, topbar, dark/light theme
- Dashboard — weight, calorie, macro, and workout stats

**Planned**
- Workout tracker — log sessions, exercises, sets/reps/weight, progressive overload
- Food logger — log meals by type, daily calorie + macro totals
- Meal planner + AI recipe generator — Claude API, vegetarian high-protein recipes

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email/password) |
| AI | Anthropic API (Claude) |

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd forge
npm install
```

### 2. Configure environment

Copy `.env` and fill in your values:

```bash
cp .env .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Get your Supabase credentials from [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API.

### 3. Run migrations

Apply the database schema to your Supabase project. See [docs/database.md](docs/database.md) for the full schema and migration instructions.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Commands

```bash
npm run dev      # start dev server on localhost:3000
npm run build    # production build + type check
npm run lint     # ESLint
```

No test suite configured yet.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/                   # protected route group
│   │   ├── layout.tsx           # server layout — fetches user + streak, renders AppShell
│   │   ├── dashboard/page.tsx
│   │   ├── workouts/page.tsx
│   │   ├── food/page.tsx
│   │   └── meals/page.tsx
│   ├── auth/
│   │   └── actions.ts           # login, signup, logout server actions
│   ├── login/page.tsx
│   ├── globals.css
│   └── layout.tsx               # root layout — fonts, theme flash prevention
├── components/
│   ├── AppShell.tsx             # client — sidebar + topbar + collapse state
│   ├── Sidebar.tsx              # nav, logo, streak, theme toggle, user profile
│   └── Topbar.tsx               # hamburger, page title, streak, avatar
└── lib/
    └── supabase/
        ├── client.ts            # browser Supabase client
        ├── server.ts            # server Supabase client
        └── middleware.ts        # session refresh + route protection
```

---

## Design System

Lime / zinc. Two modes: dark (default) and light. See [docs/design-system.md](docs/design-system.md) for full token reference.

**Accent:** `#a3e635` (dark) / `#65a30d` (light)
**Base:** black-zinc (`#09090b` dark bg, `#111113` surfaces)
**Theme toggle:** stored in `localStorage` key `forge-theme`

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for a full walkthrough of the auth flow, middleware, server/client component boundaries, and data flow patterns.

---

## Database

See [docs/database.md](docs/database.md) for the full schema, RLS policies, and how to apply migrations.
