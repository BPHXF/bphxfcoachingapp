-- BPHXF — Phase 1 schema
--
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query) on a
-- fresh project. It assumes Supabase's built-in `auth.users` table and
-- `auth.uid()` function already exist, which they do on any Supabase project.
--
-- This implements every decision recorded in the project's decisions log:
--   - weekly progression (template -> weeks -> sessions -> exercises)
--   - reusable templates + independent per-client assignments
--   - both program-level and exercise-level video, routable per visibility
--   - tagged/searchable public library
--   - actual reps/weight logged per set (not just done/not-done)
--   - assigned scheduling with client-initiated rescheduling
--   - single trainer (v1) via `trainer_id`, but not hardcoded
--   - manual per-week progression entry (no auto-progression engine)
--   - total completions (including repeats), not distinct-user counts
--   - lb default / kg optional units, per set
--   - comments on public library programs only, owner-only delete

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('trainer', 'client');
create type program_visibility as enum ('private_1on1', 'public_library');
create type video_provider as enum ('cloudflare_stream', 'youtube');
create type weight_unit as enum ('lb', 'kg');
create type assignment_status as enum ('active', 'completed', 'paused');
create type session_status as enum ('pending', 'completed', 'skipped');
create type invite_status as enum ('pending', 'accepted', 'revoked');

-- ---------------------------------------------------------------------------
-- Profiles — extends auth.users
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'client',
  display_name text not null,
  avatar_url text,
  -- For v1 there is exactly one trainer, but this is a real FK (not
  -- hardcoded) so a second trainer can be added later without a schema
  -- change. Null for a trainer, or for a client who has only ever used the
  -- public library and has no 1:1 relationship yet.
  trainer_id uuid references profiles (id),
  weight_unit_preference weight_unit not null default 'lb',
  created_at timestamptz not null default now(),
  constraint trainer_id_must_be_trainer check (trainer_id is null or trainer_id <> id)
);

-- ---------------------------------------------------------------------------
-- Invites — how a trainer links a client to themselves (Decision: dual entry
-- paths — self-serve library browsing needs no invite; 1:1 requires one)
-- ---------------------------------------------------------------------------

create table invites (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles (id) on delete cascade,
  email text not null,
  token uuid not null default gen_random_uuid() unique,
  status invite_status not null default 'pending',
  accepted_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

-- ---------------------------------------------------------------------------
-- Exercise catalog — reusable across programs, optional default video
-- ---------------------------------------------------------------------------

create table exercises (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles (id),
  name text not null,
  default_video_provider video_provider,
  default_video_ref text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Program templates — built once, reused across client assignments
-- (Decision: 1:1 model = reusable template + per-client assignment)
-- ---------------------------------------------------------------------------

create table program_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text,
  visibility program_visibility not null default 'private_1on1',
  -- Program-level video (intro/overview) — Decision: video attachment = both
  video_provider video_provider,
  video_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table program_template_weeks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  week_number int not null check (week_number > 0),
  unique (template_id, week_number)
);

create table program_template_sessions (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references program_template_weeks (id) on delete cascade,
  -- 0 = Sunday .. 6 = Saturday. Used as the *default* schedule only — clients
  -- can reschedule their own assignment_sessions (see below).
  day_of_week int check (day_of_week between 0 and 6),
  title text not null,
  order_index int not null default 0
);

create table program_template_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references program_template_sessions (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  order_index int not null default 0,
  target_sets int not null check (target_sets > 0),
  target_reps int not null check (target_reps > 0),
  target_weight numeric(6, 2) not null default 0,
  target_weight_unit weight_unit not null default 'lb',
  -- Overrides the exercise's default video for this program only, if set.
  video_provider video_provider,
  video_ref text
);

-- ---------------------------------------------------------------------------
-- Tags — public library discoverability (Decision: categories/tags + search)
-- ---------------------------------------------------------------------------

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table program_template_tags (
  template_id uuid not null references program_templates (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (template_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Assignments — one per client per template "run". Copies the template's
-- structure at assignment time so later template edits never retroactively
-- change a client's in-progress program. Also used for public library
-- follow-alongs (client_id = the person doing it, trainer_id = template's
-- owner) so logging/scheduling/completion code paths are shared for both
-- 1:1 and library programs. A client can restart a library program, which
-- creates a new assignment (cycle_number + 1) — each full run adds one row
-- to `completions` (Decision: total completions including repeats).
-- ---------------------------------------------------------------------------

create table program_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id),
  client_id uuid not null references profiles (id) on delete cascade,
  trainer_id uuid not null references profiles (id),
  cycle_number int not null default 1,
  start_date date not null default current_date,
  status assignment_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (template_id, client_id, cycle_number)
);

create table assignment_weeks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  template_week_id uuid references program_template_weeks (id),
  week_number int not null
);

create table assignment_sessions (
  id uuid primary key default gen_random_uuid(),
  assignment_week_id uuid not null references assignment_weeks (id) on delete cascade,
  template_session_id uuid references program_template_sessions (id),
  title text not null,
  -- Computed from start_date + week_number + day_of_week when the
  -- assignment is created. This is "what day it would be on by default."
  assigned_date date not null,
  -- Set when the client moves this session to a different day. When
  -- present, this is the date that actually counts for "today's workout"
  -- and scheduling, not assigned_date.
  rescheduled_date date,
  status session_status not null default 'pending',
  completed_at timestamptz
);

create table assignment_exercises (
  id uuid primary key default gen_random_uuid(),
  assignment_session_id uuid not null references assignment_sessions (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  order_index int not null default 0,
  target_sets int not null check (target_sets > 0),
  target_reps int not null check (target_reps > 0),
  target_weight numeric(6, 2) not null default 0,
  target_weight_unit weight_unit not null default 'lb',
  video_provider video_provider,
  video_ref text
);

-- ---------------------------------------------------------------------------
-- Set logs — actual performance, not just done/not-done (Decision: logging
-- actual weight/reps performed). `client_logged_at` is the device-local
-- timestamp captured at the moment of tapping the set (offline-first —
-- see lib/offline/queue.ts in the app), while `created_at` is server-side
-- insert time; the two can differ when a log synced late.
-- The unique constraint is what makes background sync retries safe: an
-- offline log can be resent without ever creating a duplicate row.
-- ---------------------------------------------------------------------------

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_exercise_id uuid not null references assignment_exercises (id) on delete cascade,
  client_id uuid not null references profiles (id),
  set_number int not null check (set_number > 0),
  actual_reps int not null check (actual_reps >= 0),
  actual_weight numeric(6, 2) not null default 0,
  actual_weight_unit weight_unit not null default 'lb',
  client_logged_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (assignment_exercise_id, set_number)
);

-- ---------------------------------------------------------------------------
-- Comments — public library programs only (Decision: owner-only delete,
-- no reporting flow for v1). Enforced with a trigger since a CHECK
-- constraint can't reference another table.
-- ---------------------------------------------------------------------------

create table comments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  client_id uuid not null references profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create or replace function enforce_comment_on_public_library()
returns trigger as $$
begin
  if not exists (
    select 1 from program_templates
    where id = new.template_id and visibility = 'public_library'
  ) then
    raise exception 'Comments can only be added to public library programs';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_comments_public_library_only
  before insert on comments
  for each row execute function enforce_comment_on_public_library();

-- ---------------------------------------------------------------------------
-- Completions — Decision: total completions including repeats. One row per
-- finished assignment; `select count(*) ... where template_id = X` is the
-- number shown on the library program's detail screen.
-- ---------------------------------------------------------------------------

create table completions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references program_templates (id) on delete cascade,
  assignment_id uuid not null references program_assignments (id) on delete cascade,
  client_id uuid not null references profiles (id),
  completed_at timestamptz not null default now(),
  unique (assignment_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for the common lookups
-- ---------------------------------------------------------------------------

create index idx_program_templates_trainer on program_templates (trainer_id);
create index idx_program_templates_visibility on program_templates (visibility);
create index idx_program_assignments_client on program_assignments (client_id);
create index idx_program_assignments_trainer on program_assignments (trainer_id);
create index idx_assignment_sessions_dates on assignment_sessions (assigned_date, rescheduled_date);
create index idx_set_logs_assignment_exercise on set_logs (assignment_exercise_id);
create index idx_comments_template on comments (template_id);
create index idx_completions_template on completions (template_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table invites enable row level security;
alter table exercises enable row level security;
alter table program_templates enable row level security;
alter table program_template_weeks enable row level security;
alter table program_template_sessions enable row level security;
alter table program_template_exercises enable row level security;
alter table tags enable row level security;
alter table program_template_tags enable row level security;
alter table program_assignments enable row level security;
alter table assignment_weeks enable row level security;
alter table assignment_sessions enable row level security;
alter table assignment_exercises enable row level security;
alter table set_logs enable row level security;
alter table comments enable row level security;
alter table completions enable row level security;

-- profiles: a user can read/update their own profile; a trainer can read
-- profiles of their own clients.
create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);
create policy "profiles: trainer reads clients" on profiles
  for select using (trainer_id = auth.uid());
create policy "profiles: update own" on profiles
  for update using (auth.uid() = id);

-- program_templates: trainer manages their own; anyone signed in can read
-- public library templates; a client can read a private template only if
-- they have an assignment against it.
create policy "templates: trainer manages own" on program_templates
  for all using (trainer_id = auth.uid());
create policy "templates: public library readable by anyone signed in" on program_templates
  for select using (visibility = 'public_library');
create policy "templates: client reads assigned private templates" on program_templates
  for select using (
    exists (
      select 1 from program_assignments a
      where a.template_id = program_templates.id and a.client_id = auth.uid()
    )
  );

-- template weeks/sessions/exercises inherit access via their template.
create policy "template weeks: via template" on program_template_weeks
  for select using (
    exists (
      select 1 from program_templates t
      where t.id = program_template_weeks.template_id
        and (t.trainer_id = auth.uid() or t.visibility = 'public_library'
             or exists (select 1 from program_assignments a where a.template_id = t.id and a.client_id = auth.uid()))
    )
  );
create policy "template weeks: trainer writes own" on program_template_weeks
  for insert with check (
    exists (select 1 from program_templates t where t.id = template_id and t.trainer_id = auth.uid())
  );
create policy "template weeks: trainer updates own" on program_template_weeks
  for update using (
    exists (select 1 from program_templates t where t.id = template_id and t.trainer_id = auth.uid())
  );
create policy "template weeks: trainer deletes own" on program_template_weeks
  for delete using (
    exists (select 1 from program_templates t where t.id = template_id and t.trainer_id = auth.uid())
  );

-- program_assignments: client reads/updates their own; trainer reads/writes
-- assignments they own.
create policy "assignments: client reads own" on program_assignments
  for select using (client_id = auth.uid());
create policy "assignments: trainer manages own" on program_assignments
  for all using (trainer_id = auth.uid());

-- assignment sessions/exercises: readable+writable by the assignment's
-- client (for rescheduling/status) or its trainer.
create policy "assignment sessions: via assignment" on assignment_sessions
  for all using (
    exists (
      select 1 from assignment_weeks w
      join program_assignments a on a.id = w.assignment_id
      where w.id = assignment_sessions.assignment_week_id
        and (a.client_id = auth.uid() or a.trainer_id = auth.uid())
    )
  );

-- set_logs: a client can insert/select/update only their own logs.
create policy "set_logs: client manages own" on set_logs
  for all using (client_id = auth.uid());
create policy "set_logs: trainer reads clients' logs" on set_logs
  for select using (
    exists (
      select 1 from profiles p where p.id = set_logs.client_id and p.trainer_id = auth.uid()
    )
  );

-- comments: any signed-in user can post on a public library template;
-- the trainer who owns it (or the comment's author) can delete it.
create policy "comments: anyone signed in can read" on comments
  for select using (true);
create policy "comments: signed-in users can post" on comments
  for insert with check (auth.uid() = client_id);
create policy "comments: author or owning trainer can delete" on comments
  for delete using (
    client_id = auth.uid()
    or exists (select 1 from program_templates t where t.id = template_id and t.trainer_id = auth.uid())
  );

-- completions: client inserts their own; anyone signed in can read (needed
-- for the public completion count on library programs).
create policy "completions: anyone signed in can read" on completions
  for select using (true);
create policy "completions: client inserts own" on completions
  for insert with check (client_id = auth.uid());
