-- Staff Review Platform - Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
--
-- NOTE: This file is IDEMPOTENT. Policies are dropped and recreated so you can
-- re-run it safely after edits. Run the WHOLE file.
--
-- SECURITY MODEL (IMPORTANT)
-- --------------------------
-- RLS is enforced via security-definer helper functions that resolve the
-- requesting user's role from the `users` table. To opt a person into admin or
-- leader powers you UPDATE their row in `users` (is_admin / is_leader) using a
-- privileged role — NEVER grant it from the client.
--
-- The client reads `users.is_admin` only to decide what UI to show. The actual
-- authorization decision is re-validated in the database here, so a user cannot
-- escalate themselves by editing the client or calling the API directly.

-- ============================================================
-- 1. USE EXTENSIONS
-- ============================================================
drop extension if exists pgcrypto; -- (optional) for gen_random_uuid if needed

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  email TEXT UNIQUE NOT NULL,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  coach_uid TEXT,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- Idempotent column backfill. `CREATE TABLE IF NOT EXISTS` above is a no-op when
-- the table already exists, so any column added to this file later must also be
-- added here with ALTER TABLE -- otherwise existing databases silently keep the
-- old shape and the app breaks on a missing column. Adding a column is safe to
-- re-run and does not touch existing rows.
alter table public.users add column if not exists coach_uid text;

-- 2. Development Reviews
CREATE TABLE IF NOT EXISTS development_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid),
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
  staff_member_name TEXT NOT NULL,
  ministry_assignment TEXT NOT NULL DEFAULT '',
  supervisor_name TEXT NOT NULL DEFAULT '',
  months_covered TEXT NOT NULL DEFAULT '',
  heart JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  personal_life JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  relational_life JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  ministry_effectiveness JSONB NOT NULL DEFAULT '{"strengths":["","",""],"needsImprovement":["","",""],"suggestedActionPoints":["","",""]}',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  last_updated_by TEXT NOT NULL DEFAULT '',
  leader_section_comments JSONB DEFAULT NULL
);

-- 3. Quarterly Summaries
CREATE TABLE IF NOT EXISTS quarterly_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(uid),
  status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'CoachSubmitted', 'Declined')),
  coach_uid TEXT,
  coach_name TEXT,
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  staff_name TEXT NOT NULL,
  team_leader_name TEXT NOT NULL DEFAULT '',
  date_joined_staff TEXT NOT NULL DEFAULT '',
  reviewer_name_position TEXT NOT NULL DEFAULT '',
  supervised_by_since TEXT NOT NULL DEFAULT '',
  present_position_since TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  suggestions JSONB NOT NULL DEFAULT '["",""]',
  decline_reason TEXT,
  declined_at TEXT,
  declined_by TEXT,
  pdp JSONB NOT NULL DEFAULT '{"heart":{},"personalLife":{},"relationalLife":{}}',
  cmo JSONB NOT NULL DEFAULT '[]',
  kda JSONB NOT NULL DEFAULT '[]',
  evaluation JSONB NOT NULL DEFAULT '{"overallEffectiveness":"","strengths":["","",""],"weaknesses":["","",""],"lackConfidence":"","readyForGreaterResp":"","greaterRespDetails":{"position":"","when":""},"recommendReassignment":"","reassignmentDetails":{"positionLocation":"","why":""},"teamLeaderSignature":"","teamLeaderSignatureDate":"","formReviewedByNameSigDate":"","formReviewedBy":"","formReviewedByDate":""}',
  additional_comments TEXT,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 4. Follow-up Tasks
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id TEXT PRIMARY KEY,
  focus TEXT NOT NULL DEFAULT '',
  coach_leader TEXT NOT NULL DEFAULT '',
  coaches JSONB NOT NULL DEFAULT '[]',
  current_stage TEXT NOT NULL DEFAULT 'Pre event',
  status TEXT NOT NULL DEFAULT 'Not started' CHECK (status IN ('Completed', 'In progress', 'Not started', 'Blocked')),
  due_date TEXT NOT NULL DEFAULT '',
  coordinator_followup TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000),
  user_id TEXT,
  staff_name TEXT,
  quarter TEXT,
  year TEXT,
  is_override BOOLEAN DEFAULT false
);

-- 5. Requirement Settings (single global row)
CREATE TABLE IF NOT EXISTS requirement_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  heart_required BOOLEAN NOT NULL DEFAULT true,
  personal_life_required BOOLEAN NOT NULL DEFAULT true,
  relational_life_required BOOLEAN NOT NULL DEFAULT true,
  ministry_effectiveness_required BOOLEAN NOT NULL DEFAULT true
);

-- 6. Review Schedules
CREATE TABLE IF NOT EXISTS review_schedules (
  quarter TEXT PRIMARY KEY CHECK (quarter IN ('1st', '2nd', '3rd')),
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 7. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  edited_by TEXT NOT NULL,
  editor_uid TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('review', 'summary')),
  quarter TEXT NOT NULL CHECK (quarter IN ('1st', '2nd', '3rd')),
  year TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 8. Coaching Requests
CREATE TABLE IF NOT EXISTS coaching_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES users(uid),
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  accepted_by_coach TEXT NOT NULL DEFAULT 'pending' CHECK (accepted_by_coach IN ('pending', 'accepted', 'rejected')),
  coach_reject_reason TEXT,
  coach_uid TEXT,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- 9. Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  staff_uid TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  quarter TEXT NOT NULL,
  year TEXT NOT NULL,
  meeting_date TEXT NOT NULL DEFAULT '',
  meeting_time TEXT NOT NULL DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'In Person',
  notes TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)
);

-- ============================================================
-- 3. SECURITY-DEFINER HELPER FUNCTIONS
--    (These bypass RLS internally so they can read the users table safely.)
-- ============================================================

-- Returns TRUE if the current caller is a registered admin.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select u.is_admin
    from public.users u
    where u.uid = auth.uid()::text
  ), false);
$$;

-- Returns TRUE if the current caller is a registered admin or leader/coach.
create or replace function public.is_admin_or_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select (u.is_admin or u.is_leader)
    from public.users u
    where u.uid = auth.uid()::text
  ), false);
$$;

-- Returns TRUE if the current caller is the assigned coach of `member_uid`.
--
-- SINGLE SOURCE OF TRUTH: the admin sets `users.coach_uid` directly in the Team
-- Members tab, so that column is what defines a coaching relationship. Every RLS
-- policy that needs to know "may I read this person's data?" calls this
-- function, which is why one admin assignment immediately changes access
-- everywhere. The old nomination workflow (coaching_requests rows reaching
-- status='approved' AND accepted_by_coach='accepted') is no longer consulted;
-- those rows are retained for audit history only.
create or replace function public.is_coach_of(member_uid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.uid = member_uid
      and u.coach_uid = auth.uid()::text
  );
$$;

-- Returns TRUE if the current caller is a coach to ANY member.
create or replace function public.current_uid()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid()::text;
$$;

-- Returns the caller's stored is_admin flag. Security-definer so it can read
-- the users table without tripping RLS recursion inside the users policies.
create or replace function public.__my_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_admin from public.users u where u.uid = auth.uid()::text), false);
$$;

-- Returns the caller's stored is_leader flag.
create or replace function public.__my_is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select u.is_leader from public.users u where u.uid = auth.uid()::text), false);
$$;

-- Returns the caller's stored role text.
create or replace function public.__my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (select u.role from public.users u where u.uid = auth.uid()::text);
$$;

-- Returns the caller's stored email (constant, cannot be changed by self).
create or replace function public.__my_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (select u.email from public.users u where u.uid = auth.uid()::text);
$$;

-- Returns the caller's stored coach_uid. Pinned inside users_update_self so a
-- non-admin cannot self-assign a coach: only the admins-only users_admin_update
-- policy may change it. IS NOT DISTINCT FROM (not =) is required because
-- coach_uid is nullable -- with `=`, a NULL value would make the check evaluate
-- to NULL instead of true and reject every self-update.
create or replace function public.__my_coach_uid()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (select u.coach_uid from public.users u where u.uid = auth.uid()::text);
$$;

-- COACHING RELATIONSHIP GUARD.
--
-- Runs whenever an admin assigns or clears a staff member's coach_uid. It keeps
-- the two related facts in sync without trusting the client:
--   1. Whoever is assigned as somebody's coach is marked a Team Leader
--      (is_leader = true), so they appear correctly across the app.
--   2. A user can never be their own coach.
--
-- SECURITY DEFINER so the internal UPDATE is not subject to RLS (an admin
-- assigning a coach is not a leader and could not otherwise update that row).
-- The trigger only fires on changes to coach_uid, so promoting the coach does
-- not recurse.
create or replace function public.sync_assigned_coach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text;
begin
  target := new.coach_uid;

  if target is not null and target = new.uid then
    raise exception 'A user cannot be their own coach (uid: %)', new.uid;
  end if;

  if target is not null then
    update public.users
       set is_leader = true
     where uid = target
       and is_leader = false;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_assigned_coach on public.users;
create trigger trg_sync_assigned_coach
  before insert or update of coach_uid on public.users
  for each row execute function public.sync_assigned_coach();

-- The nomination workflow is gone: an admin assigns a coach directly, so the
-- member no longer nominates and the coach no longer accepts. This RPC granted
-- leader status to a coach who had accepted an approved nomination and is
-- unreachable now that those screens are gone. Dropped so no dead privilege
-- path is left behind; leader status comes from sync_assigned_coach() instead.
drop function if exists public.promote_self_to_leader_if_verified();

-- Coaching-request state machine guard.
-- The member who made a request must never be able to forge an "approved" or
-- "accepted" state (that is what would let them self-promote). This security-
-- definer trigger re-validates every INSERT/UPDATE regardless of any RLS policy
-- or direct client call:
--   * `status` can leave 'pending' only when the actor is an admin.
--   * `accepted_by_coach` can leave 'pending' only when the actor is the
--     assigned coach (coach_uid = auth.uid()) or an admin.
--   * `coach_uid` can only be set/changed by an admin (or left unchanged by the
--     original nominating member on INSERT / a coach confirming their identity).
-- A member can therefore never manufacture an approved+accepted request.
create or replace function public.coaching_state_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean := public.is_admin_user();
  actor_is_coach boolean := (new.coach_uid is not null and new.coach_uid = auth.uid()::text);
begin
  if tg_op = 'INSERT' then
    -- A brand-new request that any (non-admin) member creates cannot start in a
    -- forged "approved"/"accepted" state. Force safe defaults and never let the
    -- requester point the request at themselves.
    if not actor_is_admin then
      new.status := 'pending';
      new.accepted_by_coach := 'pending';
      new.coach_reject_reason := null;
      if new.coach_uid = auth.uid()::text then
        new.coach_uid := null;
      end if;
    end if;
    return new;
  end if;

  -- UPDATE path: OLD is valid here.
  -- status transitions: only an admin may approve/reject.
  if new.status in ('approved', 'rejected') and not actor_is_admin then
    new.status := old.status;
  end if;

  -- coach acceptance: only the assigned coach (or admin) may set accepted/rejected.
  if new.accepted_by_coach in ('accepted', 'rejected') and not (actor_is_admin or actor_is_coach) then
    new.accepted_by_coach := old.accepted_by_coach;
  end if;

  -- A non-admin may not assign themselves as coach to then "accept" the request.
  if not actor_is_admin and new.coach_uid = auth.uid()::text and (old.coach_uid is null or old.coach_uid <> auth.uid()::text) then
    new.coach_uid := old.coach_uid;
  end if;

  return new;
end;
$$;


-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON development_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_quarter ON development_reviews(quarter, year);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON quarterly_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_coach_uid ON quarterly_summaries(coach_uid);
CREATE INDEX IF NOT EXISTS idx_summaries_quarter ON quarterly_summaries(quarter, year);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_requests_member_id ON coaching_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_coaching_requests_coach_uid ON coaching_requests(coach_uid);
CREATE INDEX IF NOT EXISTS idx_meetings_staff_uid ON meetings(staff_uid);

-- ============================================================
-- 5. ROW LEVEL SECURITY — enable + drop old permissive policies
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Drop any old "allow all" policies so we start clean.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','development_reviews','quarterly_summaries','follow_up_tasks','requirement_settings','review_schedules','activity_logs','coaching_requests','meetings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- ---- USERS ----
-- Any authenticated user can read basic profile info (needed to show names/roles
-- when a coach picks a member, etc.). We expose only non-sensitive fields; email
-- is part of the profile the app already needs. Roles are the sensitive part and
-- are guarded on UPDATE below.
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT TO authenticated USING (true);

-- A new user may insert ONLY their own row, with no privileged flags. This
-- supports the signup flow (app does users.upsert({uid: auth user id, ...})).
CREATE POLICY "users_insert_self"
  ON users FOR INSERT TO authenticated
  WITH CHECK (
    uid = auth.uid()::text
    AND is_admin = false
    AND (is_leader = false OR is_leader IS NULL)
  );

-- Users can update ONLY their own row, and may NOT change is_admin / is_leader /
-- role/email/uid/coach_uid. All of those are granted in the database only: admin
-- and coach assignment happen through the admins-only policy below, and leader
-- status is applied by the sync_assigned_coach() trigger. Each column is
-- compared against a SECURITY DEFINER helper that reads the row as it was
-- BEFORE this statement ran, so "unchanged" is enforced server-side.
CREATE POLICY "users_update_self"
  ON users FOR UPDATE TO authenticated
  USING (uid = auth.uid()::text)
  WITH CHECK (
    uid = auth.uid()::text
    AND is_admin = public.__my_is_admin()
    AND is_leader = public.__my_is_leader()
    AND coalesce(role, '') = coalesce(public.__my_role(), '')
    AND email = public.__my_email()
    AND coach_uid IS NOT DISTINCT FROM public.__my_coach_uid()
  );

-- Admins may update any user's row (role management). They still cannot set
-- themselves — not needed since admin is derived from the row they manage.
CREATE POLICY "users_admin_update"
  ON users FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ---- DEVELOPMENT REVIEWS ----
-- Owner can do everything on their own review.
CREATE POLICY "reviews_owner_all"
  ON development_reviews FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Coaches/admins can SELECT (read) others' reviews; coaches can also UPDATE
-- (to add leader section comments).
CREATE POLICY "reviews_coach_or_admin_select"
  ON development_reviews FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.is_coach_of(user_id));

CREATE POLICY "reviews_coach_or_admin_update"
  ON development_reviews FOR UPDATE TO authenticated
  USING (public.is_admin_user() OR public.is_coach_of(user_id))
  WITH CHECK (public.is_admin_user() OR public.is_coach_of(user_id));

-- ---- QUARTERLY SUMMARIES ----
-- Owner can do everything on their own summary.
CREATE POLICY "summaries_owner_all"
  ON quarterly_summaries FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Coach (who is the assigned coach_uid) or admin can read + update.
CREATE POLICY "summaries_coach_or_admin_select"
  ON quarterly_summaries FOR SELECT TO authenticated
  USING (public.is_admin_user() OR coach_uid = auth.uid()::text OR public.is_coach_of(user_id));

CREATE POLICY "summaries_coach_or_admin_update"
  ON quarterly_summaries FOR UPDATE TO authenticated
  USING (public.is_admin_user() OR coach_uid = auth.uid()::text OR public.is_coach_of(user_id))
  WITH CHECK (public.is_admin_user() OR coach_uid = auth.uid()::text OR public.is_coach_of(user_id));

-- ---- COACHING REQUESTS ----
-- Members may create and track their OWN requests, but cannot UPDATE/DELETE
-- them: the approval state machine is enforced by the coaching_state_guard
-- trigger, and only the named coach (commit to accepting) or an admin
-- (approve/reject/delete) may change a request after it is created.
CREATE POLICY "coaching_member_select"
  ON coaching_requests FOR SELECT TO authenticated
  USING (member_id = auth.uid()::text);

CREATE POLICY "coaching_member_insert"
  ON coaching_requests FOR INSERT TO authenticated
  WITH CHECK (member_id = auth.uid()::text);

CREATE POLICY "coaching_coach_or_admin_select"
  ON coaching_requests FOR SELECT TO authenticated
  USING (public.is_admin_user() OR coach_uid = auth.uid()::text);

CREATE POLICY "coaching_coach_or_admin_update"
  ON coaching_requests FOR UPDATE TO authenticated
  USING (public.is_admin_user() OR coach_uid = auth.uid()::text)
  WITH CHECK (public.is_admin_user() OR coach_uid = auth.uid()::text);

-- Only admins may delete coaching requests.
CREATE POLICY "coaching_admin_delete"
  ON coaching_requests FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- Activate the state-machine guard on the requests table.
DROP TRIGGER IF EXISTS trg_coaching_state_guard ON public.coaching_requests;
CREATE TRIGGER trg_coaching_state_guard
  BEFORE INSERT OR UPDATE ON public.coaching_requests
  FOR EACH ROW EXECUTE FUNCTION public.coaching_state_guard();

-- ---- ACTIVITY LOGS ----
-- Owner sees their own logs; coaches/admins see logs for their team / everyone.
CREATE POLICY "activity_logs_owner_select"
  ON activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "activity_logs_coach_or_admin_select"
  ON activity_logs FOR SELECT TO authenticated
  USING (public.is_admin_user() OR public.is_coach_of(user_id));

-- A user may log their own actions; a coach may log actions on a member they
-- coach; an admin may log anything. `user_id` is the member the action is about
-- and `editor_uid` is the actor, so the coach case must reference is_coach_of().
CREATE POLICY "activity_logs_insert"
  ON activity_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    OR public.is_admin_user()
    OR public.is_coach_of(user_id)
  );

-- Admins may clear the whole activity log.
CREATE POLICY "activity_logs_admin_delete"
  ON activity_logs FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- ---- FOLLOW-UP TASKS ----
-- Members may read their own tasks and the global coordination tasks, and may
-- update their OWN rows (their progress). Only admins may create or modify the
-- shared (global, user_id IS NULL) coordination tasks, so a member cannot alter
-- the coordinator's assignments or flip the is_override flag team-wide.
CREATE POLICY "follow_up_select"
  ON follow_up_tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL OR public.is_admin_user());

CREATE POLICY "follow_up_owner_write"
  ON follow_up_tasks FOR ALL TO authenticated
  USING (user_id = auth.uid()::text OR public.is_admin_user())
  WITH CHECK (user_id = auth.uid()::text OR public.is_admin_user());

-- ---- MEETINGS ----
CREATE POLICY "meetings_owner_all"
  ON meetings FOR ALL TO authenticated
  USING (staff_uid = auth.uid()::text OR public.is_admin_user())
  WITH CHECK (staff_uid = auth.uid()::text OR public.is_admin_user());

-- ---- REQUIREMENT SETTINGS (global) ----
-- Everyone may read; only admins may write.
CREATE POLICY "settings_select_authenticated"
  ON requirement_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_admin_write"
  ON requirement_settings FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ---- REVIEW SCHEDULES (global) ----
CREATE POLICY "schedules_select_authenticated"
  ON review_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "schedules_admin_write"
  ON review_schedules FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ============================================================
-- 7. DEFAULT DATA
-- ============================================================
INSERT INTO requirement_settings (id, heart_required, personal_life_required, relational_life_required, ministry_effectiveness_required)
VALUES ('global', true, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. SECURE BOOTSTRAP OF THE FIRST ADMIN
-- ============================================================
-- The FIRST person to register becomes the platform Owner/Admin. This happens
-- entirely server-side, so no client code can influence it, and it cannot be
-- replayed (it only fires when the users table is empty).
--
-- After bootstrap, additional admins/leaders are granted by an existing admin
-- (writing the users.is_admin / users.is_leader flags through the users_admin_update
-- policy). Assigning somebody a coach marks them a leader automatically via the
-- sync_assigned_coach() trigger.

create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only the very first user row ever inserted becomes the owner.
  if not exists (select 1 from public.users) then
    new.is_admin := true;
    new.is_leader := true;
    new.role := 'Admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bootstrap_first_admin on public.users;
create trigger trg_bootstrap_first_admin
  before insert on public.users
  for each row execute function public.bootstrap_first_admin();
