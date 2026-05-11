# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start Next.js dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint via next lint
npx tsc --noEmit     # type-check without emitting

npm run db:generate  # generate a Drizzle migration from schema changes
npm run db:migrate   # apply pending migrations to Neon
npm run db:studio    # open Drizzle Studio (DB browser)
```

Migrations in `drizzle/` that were applied manually (not via `db:migrate`) are not tracked in `drizzle/meta/_journal.json`. New schema changes should use `db:generate` then `db:migrate`, or hand-write SQL following the pattern in `drizzle/0003_questions_teacher_id.sql` (add nullable → backfill → set NOT NULL).

## Environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=        # Neon PostgreSQL connection string
```

## Architecture

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon Postgres (serverless) · Supabase Auth · Radix UI · Framer Motion

### Auth flow

Supabase Auth handles sessions via cookies (`@supabase/ssr`). Two clients exist:
- `src/lib/supabase/client.ts` — browser client (`createBrowserClient`)
- `src/lib/supabase/server.ts` — server client (`createServerClient` with cookie store)

All protected routes are wrapped by `AppLayout` (`src/components/layout/AppLayout.tsx`), which redirects unauthenticated users and upserts the teacher row into Postgres on first login (`onConflictDoNothing`). There is no middleware — auth is enforced at the layout level.

Google OAuth uses `signInWithOAuth({ provider: "google" })` on the login page; the callback at `src/app/auth/callback/route.ts` exchanges the code and redirects to `/dashboard`.

### Multi-tenancy

Every table except `teachers` has a `teacher_id` FK (NOT NULL). **All queries must be scoped by `teacherId`.** The canonical way to get it in Server Actions is:

```ts
import { getTeacherId } from "@/lib/auth/getTeacherId";
const teacherId = await getTeacherId(); // throws "Unauthorized" if no session
```

Never use `&&` inside Drizzle `.where()` — use `and(...)`. The `&&` operator drops to the last operand silently.

### Database schema (`src/lib/db/schema.ts`)

```
teachers      — id (= Supabase auth.users.id), email, name
  └─ students       — teacher_id FK, name, notes, archivedAt
  └─ questionSets   — teacher_id FK, name, description, defaultLengthHint
       └─ questions — teacher_id FK (denormalised), set_id FK
                      type: "mcq4"|"tf", answers: jsonb string[4], correctIndex, difficulty 1–3
  └─ games          — teacher_id FK, studentId FK (nullable), setId FK (nullable)
                      outcome: "won_top"|"walked_away"|"wrong_answer"|"in_progress"
                      questionPlan: jsonb string[] (ordered question IDs picked at launch)
                      prizeLadder: jsonb [{rung, prize, isSafetyNet}]
       └─ turns     — gameId FK, questionId FK (nullable on delete set null)
                      rungIndex (0-based), shownAnswers, chosenIndex, isCorrect, lifelineUsed
```

`questions.teacher_id` is denormalised from the parent `questionSets` row. Application code must keep them in sync (set both on insert).

### Game engine

1. **Launch** (`src/lib/actions/games.ts` → `createGame`): verifies set ownership, calls `pickQuestionsForLadder` to select and order questions by difficulty, calls `buildLadder` to generate the prize ladder, inserts a `games` row with `questionPlan`.
2. **Play** (`src/app/play/[gameId]/`): `page.tsx` is a server component that loads the game and resolves `questionPlan` IDs → ordered questions. `GameStage.tsx` is a large client component that owns all game state (current rung, lifelines, answer reveal timing, audio).
3. **Turn saving** (`saveTurn` server action): called after each answer. `endGame` is called on win/loss/walk-away.

Prize ladder: `src/lib/game/ladder.ts` samples from the classic 15-rung WWTBAM prize values, scaled to any `ladderLength`. Two safety nets are placed at ⅓ and ⅔ of the ladder.

Question selection: `src/lib/game/pickQuestions.ts` assigns difficulty targets to rungs (easy → hard over the ladder) and picks from the pool with fallback to adjacent difficulties.

Lifelines: fifty-fifty, ask-audience, phone-friend, switch-question — all handled client-side in `GameStage.tsx` with server calls only for state persistence.

### Server Actions

All mutations go through `"use server"` functions in `src/lib/actions/`:
- `students.ts` — CRUD for students
- `sets.ts` — CRUD for question sets and questions (including bulk CSV/XLSX import)
- `games.ts` — game lifecycle (create, saveTurn, useLifeline, endGame, getReplacementQuestion)

Actions call `revalidatePath` after mutations; no manual cache invalidation elsewhere.

### CSV/XLSX import

`src/lib/csv/parseQuestions.ts` parses CSV (via PapaParse) and XLSX (via SheetJS). It auto-detects column names across three formats: native ClassMillion, Blooket export, and Grammar-Questions. Difficulty accepts `easy/medium/hard` or `1/2/3`. Correct answer accepts `A/B/C/D`, `1/2/3/4`, or Blooket's `"1,4"` notation.
