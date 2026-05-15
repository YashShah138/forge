# Forge Agent — Design Spec
**Date:** 2026-05-15
**Status:** Approved

---

## Goal

Build a standalone Python agent (`forge_agent/`) that autonomously implements the three remaining Forge features — food logger, meal planner + AI recipe generator, profile page — using the Anthropic SDK's tool-use loop. The three features are built **in parallel** by independent worker agents, each in its own git worktree. An orchestrator manages the workers, serializes user questions, validates each feature, and merges all worktrees back to main when done.

---

## File Structure

```
forge/                          ← the app repo (main branch)
├── forge_agent/                ← agent lives here, gitignored
│   ├── agent.py                ← orchestrator: spawns workers, manages merge
│   ├── worker.py               ← worker agentic loop (one instance per feature)
│   ├── tools.py                ← tool implementations (read, write, bash, ask)
│   ├── context.py              ← loads system prompt + project context
│   ├── state.py                ← shared state manager (thread-safe)
│   ├── forge_agent_state.json  ← persisted progress + decisions
│   └── requirements.txt        ← anthropic, rich, filelock
├── src/
├── ...
└── .gitignore                  ← forge_agent/ added here

# git worktrees (siblings, created at runtime, cleaned up after merge)
../forge-food/                  ← food logger worker's isolated workspace
../forge-meals/                 ← meal planner worker's isolated workspace
../forge-profile/               ← profile page worker's isolated workspace
```

`forge_agent/` lives inside the forge repo root for convenience but is listed in `.gitignore` — it will never be staged or committed. The worktrees are siblings to the forge repo and cleaned up by the orchestrator after a successful merge.

---

## Architecture

Two tiers: one **orchestrator** and three **workers** running in parallel via `asyncio`.

```
orchestrator (agent.py)
  → create 3 git worktrees: forge-food, forge-meals, forge-profile
  → symlink node_modules into each worktree (avoids re-install)
  → spawn 3 worker coroutines in parallel (asyncio.gather)
  → poll shared question queue — present ask_user prompts one at a time
  → wait for all workers to complete
  → serialize dev server validation (one at a time, same port 3000)
  → merge all 3 feature branches into main (git merge --no-ff)
  → resolve shared-file conflicts (middleware.ts, Sidebar.tsx) — ask user if needed
  → delete worktrees, exit with summary

worker (worker.py) — one per feature, runs in its worktree
  → load state for its feature
  → build system prompt (CLAUDE.md + handoff.md, prompt-cached)
  → inject feature assignment + all prior decisions
  → send to Claude: "Build {feature}. Your working directory is {worktree}."

  loop:
    → Claude responds with a tool call
    → execute tool in worktree context, send result back
    → if ask_user: enqueue question, block until orchestrator returns answer
    → repeat until Claude calls mark_feature_complete(feature)
    → run build + lint validation in worktree (parallel-safe, no port conflicts)
    → signal orchestrator: "ready for dev server check"
    → orchestrator runs dev server check (serialized), returns pass/fail
    → on pass: mark feature completed, worker exits
```

**Context reset per worker:** Each worker starts with a fresh context. Workers don't share conversation history — they share only the state file (decisions, feature statuses) via thread-safe reads/writes.

---

## Features (Parallel)

All three run concurrently. Each is independent — they touch separate directories in the Forge codebase:

| Feature | Primary paths | Shared files |
|---|---|---|
| **Food Logger** | `src/app/(app)/food/`, `src/components/food/`, `src/app/(app)/food/actions.ts` | `middleware.ts`, `Sidebar.tsx` |
| **Meal Planner + AI Recipe Gen** | `src/app/(app)/meals/`, `src/components/meals/`, `src/app/(app)/meals/actions.ts` | `middleware.ts`, `Sidebar.tsx` |
| **Profile Page** | `src/app/(app)/profile/`, `src/components/profile/`, `src/app/(app)/profile/actions.ts` | `middleware.ts`, `Sidebar.tsx` |

Shared files (`middleware.ts`, `Sidebar.tsx`) are only touched in each worktree independently. The orchestrator handles merging them cleanly after all workers finish.

---

## Tools

Claude has access to exactly 6 tools:

| Tool | Signature | Purpose |
|---|---|---|
| `read_file` | `path: str` | Read any file in the Forge repo |
| `list_directory` | `path: str` | List files/dirs at a path |
| `write_file` | `path: str, content: str` | Create or overwrite a file |
| `run_bash` | `command: str` | Run a shell command in the Forge directory |
| `ask_user` | `question: str, options: list[str] \| None` | Pause, ask the user, record the answer |
| `mark_feature_complete` | `feature: str` | Trigger the validation gate |

**`run_bash` safety blocklist:** Rejects any command matching: `rm -rf`, `git reset`, `git push`, `git force`, `DROP`, `DELETE FROM`, `truncate`. The agent can build, lint, run the dev server, and read git log. It cannot delete branches, push to remote, or mutate the database.

**`write_file` safety:** Validates that the resolved absolute path starts with the Forge repo root before writing. Writes outside the repo are rejected.

**`run_bash` timeout:** 60 seconds per command. Dev server health check uses 15 seconds. On timeout, process is killed and Claude receives `"Command timed out after 60s."`.

**Worktree scoping:** Each worker's `run_bash` and `write_file` are scoped to its git worktree root. A worker for food logger cannot write to the meals worktree.

---

## Token Minimization

Four strategies to keep total token cost low across a full 3-feature run:

**1. Prompt caching**
CLAUDE.md and handoff.md are static across the session. They are placed in a `cache_control: {"type": "ephemeral"}` block in the system prompt. Repeated loop turns hit the cache instead of re-tokenizing ~3k tokens each round.

**2. Lazy file loading**
The system prompt does not inject file contents. Claude reads specific files on demand via `read_file`. It only sees code it actually needs for the current task.

**3. Context reset between features**
After each feature completes, the conversation history is replaced with a single-paragraph summary. Fresh context = no compounding token cost from earlier features bleeding into later ones.

**4. Truncated bash output**
`run_bash` caps output at 150 lines. If longer: first 75 lines + `--- truncated N lines ---` + last 75 lines. Build errors are almost always at the end.

**Model:**
- `claude-sonnet-4-6` for all coding and decision turns.

---

## State File

`forge_agent_state.json` is written after every tool call, protected by a file lock (`filelock`) so concurrent workers don't corrupt it. Format:

```json
{
  "features": [
    { "name": "food_logger",  "status": "in_progress", "worktree": "../forge-food",  "branch": "feat/food-logger" },
    { "name": "meal_planner", "status": "pending",     "worktree": "../forge-meals", "branch": "feat/meal-planner" },
    { "name": "profile_page", "status": "completed",   "worktree": "../forge-profile","branch": "feat/profile-page" }
  ],
  "decisions": [
    {
      "question": "Should the quick-add bar capture full macros or kcal only?",
      "answer": "Full macros — protein, carbs, fat",
      "feature": "food_logger",
      "timestamp": "2026-05-15T10:45:00"
    }
  ],
  "validation_log": [
    {
      "feature": "profile_page",
      "build": "pass",
      "lint": "pass",
      "dev_server": "pass",
      "timestamp": "2026-05-15T11:20:00"
    }
  ],
  "merge_log": []
}
```

**Feature statuses:**
- `pending` → not started (worktree not yet created)
- `in_progress` → worker is running or was interrupted
- `validated` → passed all checks, waiting for orchestrator to merge
- `completed` → merged to main, worktree deleted

**Resume behavior:** On restart, the orchestrator re-creates any missing worktrees for `in_progress` features and re-spawns their workers. Each worker re-injects all prior decisions for its feature and resumes.

---

## Validation Gate

Triggered by `mark_feature_complete`. Claude cannot advance until all three checks pass.

**Check 1 — TypeScript build**
```bash
npm run build 2>&1
```
Pass: exit code 0. On failure: error output sent back to Claude — *"Build failed. Fix these errors before marking complete."* Claude fixes and retries.

**Check 2 — Lint**
```bash
npm run lint 2>&1
```
Pass: exit code 0. Same fix-and-retry loop.

**Check 3 — Dev server**
```bash
npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
kill %1
```
Pass: HTTP 200 or 307 (redirect to `/login` is expected). On failure: last 30 lines of server output sent to Claude.

**Build and lint run in parallel** — each worker runs these in its own worktree simultaneously. No port conflicts since neither requires a server.

**Dev server check is serialized** — the orchestrator queues these after all workers signal readiness (or as each worker finishes). Only one dev server runs at a time on port 3000. Each worktree is checked in turn.

**Retry limit:** If any check fails 3 consecutive times on the same feature, the orchestrator calls `ask_user` — *"Validation has failed 3 times for {feature}. Here's the error. How should I proceed?"* — rather than burning tokens in an infinite fix loop.

---

## Parallelization

**Worktree setup (orchestrator, at startup):**
```bash
git worktree add ../forge-food  feat/food-logger
git worktree add ../forge-meals feat/meal-planner
git worktree add ../forge-profile feat/profile-page
# symlink node_modules so workers don't re-install
ln -s $(pwd)/node_modules ../forge-food/node_modules
ln -s $(pwd)/node_modules ../forge-meals/node_modules
ln -s $(pwd)/node_modules ../forge-profile/node_modules
```

**Question serialization:**
Workers cannot call `ask_user` directly. Instead, they enqueue a `QuestionRequest(feature, question, options)` into an `asyncio.Queue`. The orchestrator's main loop polls this queue and presents one question at a time — the worker `await`s a `Future` that resolves when the orchestrator delivers the answer. Decisions are broadcast back to all workers (in case another feature needs the same context).

**Merge strategy (orchestrator, after all features validated):**
```
for each feature branch (food → meals → profile):
  git merge --no-ff feat/{feature} -m "feat: implement {feature}"
  if conflict:
    → for shared files (middleware.ts, Sidebar.tsx): auto-merge by appending
      each branch's additions (protected routes, nav items) — these are
      additive changes and won't conflict semantically
    → if auto-merge fails: call ask_user with diff, wait for resolution
```

**Shared file merge logic:**
- `middleware.ts` — each worker adds its route to the `protectedRoutes` array. Orchestrator reads all three versions, unions the arrays, writes the merged file.
- `Sidebar.tsx` — each worker adds a nav item. Orchestrator reads all three, merges the nav item arrays, writes the merged file.
- Any other shared file conflict → ask user.

**Cleanup:**
```bash
git worktree remove ../forge-food
git worktree remove ../forge-meals
git worktree remove ../forge-profile
```

---

## Decision Flow (ask_user)

When Claude calls `ask_user`, the agent blocks and prints:

```
╔══════════════════════════════════════════╗
║  DECISION NEEDED                         ║
║                                          ║
║  {question}                              ║
║                                          ║
║  1. {option 1}                           ║
║  2. {option 2}                           ║
╚══════════════════════════════════════════╝
Your answer: _
```

The answer is appended to `decisions[]` in state. All decisions are included in Claude's context on every new turn and every feature resume, so Claude never contradicts a choice already made.

Claude should call `ask_user` for:
- Product/UX design choices (e.g., "1-week plan or user chooses duration?")
- New database schema columns or tables not already in CLAUDE.md
- New third-party dependencies
- Anything in the Supabase schema that would require a migration

Claude should NOT call `ask_user` for:
- Implementation details (component names, variable names, file structure within spec)
- Which Tailwind classes / CSS vars to use (follow CLAUDE.md design system)
- How to structure server actions (follow existing patterns in `workouts/actions.ts`)

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Agent crash / interrupt | State written after every tool call (file-locked). Restart re-creates worktrees for `in_progress` features and re-spawns workers. |
| Worker crash (one of three) | Orchestrator catches the exception, marks that feature `in_progress`, continues other workers, re-spawns the crashed worker. |
| Malformed tool call from Claude | Send *"Tool call malformed, try again."* — max 3 retries then worker exits with error. |
| `write_file` outside worktree root | Rejected with error, not executed. |
| `run_bash` timeout | Process killed, Claude notified. |
| Missing env vars in build | Agent detects pattern, orchestrator calls `ask_user` to prompt user to fix `.env.local`. |
| 3 consecutive validation failures | Orchestrator calls `ask_user` with full error context instead of continuing the fix loop. |
| Merge conflict on non-shared file | Orchestrator calls `ask_user` with the diff, waits for user resolution. |
| All features merged to main | Clean exit with summary: features built, decisions made, time elapsed. |

---

## .gitignore Addition

The following line is added to `forge/.gitignore`:

```
# forge agent (local dev tool, not part of the app)
forge_agent/
```

---

## Out of Scope

- Pushing code to GitHub (blocked by `run_bash` blocklist)
- Running database migrations (agent writes SQL files; user applies them manually or via Supabase dashboard)
- Automated testing (no test suite in Forge yet)
- More than 3 parallel workers (one per remaining feature is the right granularity)
