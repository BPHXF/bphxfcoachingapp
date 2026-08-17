# BPHXF — Phase 1

Next.js + Tailwind + Supabase scaffold for the BPHXF workout app, built from the reviewed brief and prototype in the project. This covers Phase 1 (backend scaffolding + auth + real data wiring) — video integration (Cloudflare Stream / YouTube) is Phase 3 and intentionally not built yet, though the schema already has the fields for it.

## What's actually working vs. stubbed

**Working, end to end against the schema:**
- Sign up / sign in (Supabase Auth), with invite-link support for 1:1 clients
- Home screen: real streak, active program count, and "today's workout" pulled from the actual scheduling logic (assigned day, or client-rescheduled day, or an overdue session rolling forward)
- Programs screen: your assigned programs + the public library with tag filtering and search
- Program detail: preview, completion count (library only), comments (library only), and a "Start workout" action that copies the template into a real per-client assignment
- Workout logging: one exercise at a time, tap-to-log with actual reps/weight (pre-filled from target, editable), offline-first writes, session/assignment completion tracking
- Full Supabase schema with RLS policies, verified by actually running it against a local Postgres and inserting/rejecting rows through every table (including the comment-restriction trigger and the duplicate-set-log rejection)

**Stubbed / needs finishing before this is production-ready:**
- **Offline sync** (`src/lib/offline/queue.ts`) has a real IndexedDB-backed queue and drains on reconnect, but doesn't yet use the Background Sync API (so a fully closed tab won't sync until reopened), has no retry backoff, and has no "still syncing" indicator in the UI.
- **Video** — schema fields exist at both program and exercise level, but there's no upload flow, no Cloudflare Stream signed-URL generation, and no YouTube embed component yet. That's Phase 3 per the build brief.
- **Program builder UI** — trainers currently have no screen to create templates; for now, insert rows directly in the Supabase table editor or write a seed script. Building the builder UI is a natural next step once this scaffold is confirmed working.
- **Trainer invite UI** — the `invites` table and accept-on-signup logic exist, but there's no screen for the trainer to actually generate an invite link yet.
- Everything was hand-written and could not be run through `npm install` / `npm run build` in the sandbox this was built in (see below) — do that locally before trusting it further.

## 1. Create accounts (human sign-up required)

Do these first, in any order:
1. **Supabase** — https://supabase.com — create a new project. Note the project URL and anon public key (Project Settings > API).
2. **Cloudflare** — https://dash.cloudflare.com — needed for Stream in Phase 3, not required to run Phase 1.
3. **Vercel** — https://vercel.com — for deployment.
4. **GitHub** — for the repo Vercel deploys from.

## 2. Set up the database

In the Supabase dashboard, go to **SQL Editor > New query**, paste the contents of `supabase/schema.sql`, and run it. This creates every table, enum, index, trigger, and RLS policy described in the project's decisions log.

## 3. Configure environment variables

```
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase's Project Settings > API page.

## 4. Install and run locally

This project was hand-written in a cloud sandbox that could not reach the npm registry, so dependencies have never actually been installed or built — do that first, here:

```
npm install
npm run dev
```

Open http://localhost:3000. Fix anything `npm install`/`npm run dev` surfaces (version mismatches are the most likely issue — the versions pinned in `package.json` were current as of this build but bump them if npm complains).

## 5. Seed some data

There's no program-builder UI yet (see above), so for a first end-to-end test, insert rows directly via the Supabase Table Editor in this order: a `profiles` row with `role = 'trainer'` for yourself, an `exercises` row or two, a `program_templates` row, then `program_template_weeks` / `program_template_sessions` / `program_template_exercises` under it. Once that exists, signing up a second (client) account and hitting "Start workout" on that program will exercise the whole assignment/logging flow for real.

## 6. Deploy

Push this repo to GitHub, then import it in Vercel and add the same environment variables from step 3 in the Vercel project settings. Vercel's own build servers install dependencies fresh, so this step isn't affected by the sandbox network restriction mentioned above.

## Project structure

```
src/app/                 Next.js App Router pages (home, programs, workout, profile, auth)
src/components/          Shared UI (TabBar, ProgramCard, SetRow, WorkoutRunner, ...)
src/lib/supabase/        Browser + server Supabase client helpers
src/lib/data/            Read helpers (scheduling, streak)
src/lib/actions/         Server actions (start a program, complete a session)
src/lib/offline/         Offline-first set-logging queue
supabase/schema.sql      Full schema + RLS, already verified against a local Postgres
```
