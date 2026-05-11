# Setup Guide

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [Anthropic](https://console.anthropic.com) API key (for meal planner, not needed for core features)

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Wait for the project to provision (~1 minute)
3. Go to **Project Settings → API**
4. Copy your **Project URL** and **anon public** key

---

## 3. Configure Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

`ANTHROPIC_API_KEY` is only needed for the AI meal planner (not yet built). The app runs without it.

---

## 4. Apply the Database Schema

The schema is documented in [docs/database.md](database.md). Apply it via the Supabase SQL editor or CLI.

**Via Supabase dashboard:**
1. Go to your project → **SQL Editor**
2. Paste and run the schema from `database.md`

**Via Supabase CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

---

## 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

Sign up with any email/password — a profile row is auto-created by a Postgres trigger.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on localhost:3000 |
| `npm run build` | Production build + TypeScript type check |
| `npm run lint` | Run ESLint |

---

## TypeScript Types

After making schema changes, regenerate Supabase types:

```bash
supabase gen types typescript --project-id your-project-ref > src/lib/supabase/types.ts
```

---

## Adding a New Protected Route

1. Create the page at `src/app/(app)/your-route/page.tsx`
2. Add the route to `protectedRoutes` in `src/lib/supabase/middleware.ts`:
   ```ts
   const protectedRoutes = ['/dashboard', '/workouts', '/food', '/meals', '/your-route']
   ```

The `(app)/` route group name alone does not protect routes — they must be explicitly listed.
