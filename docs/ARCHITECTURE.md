# Architecture — How Auth, Database, Sessions and Policies Work

**A plain-language map of how Asseso actually works today.** Every claim here
was checked against the code and `supabase-schema.sql`; file and line references
are included so you can verify anything yourself.

New to the project? Read [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) first — it is
the guided tour. This document is the reference you come back to when you need
to know exactly how a specific mechanism works.

**If you only remember one thing:** the browser is never trusted. The UI decides
what to *show*, but the database decides what is *allowed*. Every read and write
is filtered by Postgres Row Level Security (RLS) before it happens.

---

## Table of contents

1. [The 30-second version](#1-the-30-second-version)
2. [The moving parts](#2-the-moving-parts)
3. [What happens when you log in](#3-what-happens-when-you-log-in)
4. [Sessions and storage — where your login lives](#4-sessions-and-storage--where-your-login-lives)
5. [Cookies: the honest answer](#5-cookies-the-honest-answer)
6. [Roles and where they come from](#6-roles-and-where-they-come-from)
7. [Row Level Security, the core idea](#7-row-level-security-the-core-idea)
8. [Every policy, table by table](#8-every-policy-table-by-table)
9. [Helper functions and why they exist](#9-helper-functions-and-why-they-exist)
10. [Triggers: rules the database enforces on itself](#10-triggers-rules-the-database-enforces-on-itself)
11. [How data reaches the screen](#11-how-data-reaches-the-screen)
12. [Bypass / Demo mode](#12-bypass--demo-mode)
13. [Applying schema changes](#13-applying-schema-changes)
14. [Realtime](#14-realtime)
15. [Known gaps](#15-known-gaps)

---

## 1. The 30-second version

```
Browser (React app)
  │  stores login token in localStorage
  │  calls supabase-js with that token
  ▼
Supabase Auth  ── issues a JWT for the signed-in person
  │
  ▼
PostgREST (Supabase's REST layer)  ── receives "user A wants these rows"
  │
  ▼
Postgres + RLS  ── the ONLY place permission is actually decided
  │                row-by-row, using the policies in supabase-schema.sql
  ▼
9 tables
```

There is no custom backend. `server.ts` (36 lines) only serves static files and
Vite in development — it contains **no** auth and **no** database code.

---

## 2. The moving parts

| File | Job |
|---|---|
| `src/supabase.ts` | Creates the single Supabase client. 16 lines. |
| `src/supabaseDb.ts` | Every real database read/write. Converts snake_case rows into app-shaped objects. |
| `src/dataLayer.ts` | Thin pass-through so components never import `supabaseDb` directly. |
| `src/App.tsx` | 5,482 lines. All React state, all auth flow, all page logic. |
| `supabase-schema.sql` | Tables, RLS policies, functions, triggers. The authority on permissions. |
| `server.ts` | Static file serving only. No logic. |

One important detail: `src/supabase.ts:10-12` exports `supabase` as
**`SupabaseClient | null`**. It is `null` when the two `VITE_` env vars are
missing. Every DB function checks for `null` first and returns quietly, which is
why the app still renders (in demo mode) with no backend at all.

---

## 3. What happens when you log in

### Sign up

1. `supabaseSignUp()` (`src/supabaseDb.ts:13`) calls `supabase.auth.signUp()`.
   Supabase creates the auth user and returns an id.
2. The app then inserts a row into the `users` table (`src/supabaseDb.ts:35-43`).
3. **The client always sends `is_leader: false, is_admin: false`** (`:30-31`).
   This is deliberate — a browser must never be able to grant itself privileges.
4. A Postgres trigger, `bootstrap_first_admin()` (`supabase-schema.sql:738-753`),
   fires on insert. **If the `users` table was empty, this row becomes the
   platform owner** (`is_admin = true`).

> **Common misconception.** An older version of the code auto-promoted the email
> `lewikb13@gmail.com` to Admin. **That was removed** in commit `68bd1b4` and no
> longer exists anywhere in the code. The real rule today is *"whoever registers
> first, when the table is empty"* — email is never checked.

### Sign in

1. `supabaseSignIn()` (`src/supabaseDb.ts:49`) → `signInWithPassword()`.
2. The app calls `supabaseGetUser(uid)` (`src/supabaseDb.ts:61`) to read the
   matching `users` row and turn it into a `UserProfile`.
3. That profile lands in React state (`setUser`, `src/App.tsx:798`).

If the `users` row is missing, the app builds an unprivileged fallback profile
(`role: "Assigned Staff"`, no flags), tries to create the row, and carries on
(`src/App.tsx:800-810`).

### Sign out

`handleLogout` (`src/App.tsx:1412-1419`) removes the bypass key from
localStorage, calls `supabase.auth.signOut()`, and clears state. Note it does
**not** clear seeded mock data from localStorage.

### On page load

`src/App.tsx:499-604`, in this order:

1. If `shouldRequireLogin()` says the session is stale (idle longer than
   `IDLE_LIMIT_MS` = 8 hours, or the per-tab marker is gone) → require login.
2. If `localStorage.staff_review_bypass_user` exists → load it and **return
   early** (`:524`). Supabase is never consulted.
3. If Supabase is unconfigured → stop (`:537-540`).
4. `getSession()` → load the profile (`:543-588`).
5. Register `onAuthStateChange` (`:590-601`).

The event name from `onAuthStateChange` is **discarded** (it's `_event` at
`:590`). Every event runs the same logic: *session present → load profile;
absent → clear user*. There is no special handling for `TOKEN_REFRESHED` or
`SIGNED_OUT`.

---

## 4. Sessions and storage — where your login lives

Supabase stores the session **in the browser's localStorage**. Concretely:

| Key | Written by | Purpose |
|---|---|---|
| `sb-<project-ref>-auth-token` | supabase-js (library default) | The real session: access token, refresh token, expiry. |
| `staff_review_bypass_user` | `src/App.tsx:1408` | Fake profile for demo mode. |
| `staff_review_use_mock_data` | `src/App.tsx:2398` | Mock-data toggle. |
| `staff_development_theme` | `src/App.tsx:115` | Light/dark preference. |
| `staff_review_session_marker` | `src/utils/session.ts:15` | sessionStorage. Its presence means "signed in **in this tab**". Deleting it forces the next load to the login screen. |
| `staff_review_last_activity` | `src/utils/session.ts:16` | localStorage. Timestamp of last activity; drives the 8-hour idle limit. |
| `has_init_session` | `src/App.tsx:501-502` | Read and written, but behaviourally inert — the real guard uses `staff_review_session_marker`. Effectively dead. |

Note that `createClient()` is called with no options (`src/supabase.ts:11`), so
the app never customises `persistSession`, `autoRefreshToken` or `storageKey`.
Library defaults apply.

**Consequence to be aware of:** the token is readable by any JavaScript running
on the page. A successful XSS would therefore be able to steal the session. This
is normal for a token-in-localStorage SPA and is the main trade-off of not
using httpOnly cookies.

---

## 5. Cookies: the honest answer

**This app does not use cookies for authentication.** No `document.cookie`, no
cookie-based sessions, no server-side session store.

The confusion usually comes from Supabase's default deployment, where
Gotrue/PostgREST *can* set cookies. Here the client is created with
`createClient(url, anonKey)` only (`src/supabase.ts:11`), which keeps the session
in localStorage.

If someone ever asks "is the session a cookie or a token?", the answer is:
**a token in localStorage, sent on every request as an
`Authorization: Bearer …` header.**

---

## 6. Roles and where they come from

Two separate concepts that are easy to confuse:

| Concept | Stored in | Used for |
|---|---|---|
| `users.role` | text column | A **label only** — the person's job title ("Ministry Coordinator"). Authorization never reads this. |
| `users.is_leader` | boolean | Can coach/lead. |
| `users.is_admin` | boolean | Full access. |

**Authorization is decided solely by `is_admin` and `is_leader`.** The client
derives its admin flag from the database row and nowhere else
(`src/App.tsx:344-348`):

```ts
// Admin is derived ONLY from the server-fetched profile (users.is_admin in the
// database). It must never be inferred from a client-supplied email or role string
const isAdmin = user && user.isAdmin === true;
```

### How someone becomes a coach (direct admin assignment)

There is exactly **one** path, and it starts with an admin:

1. An **admin** picks a coach in the **Team Members** tab
   (`src/components/UserManagement.tsx`). This writes `users.coach_uid` on that
   person's row via `dataUpdateAssignedCoach()`.
2. The `users_update_self` policy pins `coach_uid` to its current value, so a
   non-admin cannot change their own coach — even by crafting a request.
3. A `BEFORE INSERT OR UPDATE OF coach_uid` trigger, `sync_assigned_coach()`,
   then does two things in the database:
   - refuses `coach_uid = uid` (nobody coaches themselves), and
   - sets `is_leader = true` on the newly assigned coach, because an assigned
     coach is a Team Leader by definition.

Nobody nominates, nobody approves, and nobody accepts. The member sees their
coach immediately, and the coach's data access changes at the same instant.

The retired mechanism is still worth knowing about, because its leftovers are in
the schema:

| Retired | Replacement |
|---|---|
| Member nominates a coach (`coaching_requests` row, `status='pending'`) | Admin assigns `users.coach_uid` |
| Admin approves the nomination | Nothing — the admin *is* the one assigning |
| Coach accepts/declines the invitation | Nothing — the assignment is final until the admin changes it |
| `promote_self_to_leader_if_verified()` RPC | `sync_assigned_coach()` trigger |
| `is_coach_of()` reads `coaching_requests` | `is_coach_of()` reads `users.coach_uid` |

> **What survives on purpose:** the `coaching_requests` table, its policies, and
> the `trg_coaching_state_guard` trigger are retained so historical rows keep
> their RLS behaviour and nothing is destroyed. The application no longer reads
> or writes that table. Dropping it later is safe from the app's point of view.

---

## 7. Row Level Security, the core idea

RLS is a Postgres feature: a rule set attached to a table that filters every
single row, on every `SELECT`/`INSERT`/`UPDATE`/`DELETE`, for every user.

```
App asks: "give me all quarterly_summaries"
                    │
                    ▼
        Postgres asks, row by row:
        "does users_summaries_coach_or_admin_select allow THIS row
         for THIS signed-in person?"
                    │
        ┌───────────┴───────────┐
     allow                  deny
        │                      │
     row returned         row invisible (no error, just absent)
```

Two things make this the whole security model:

1. **RLS is enabled on all 9 tables** (`supabase-schema.sql:455-463`). A live
   audit at the time of writing found zero tables with RLS off.

   > **Read this before trusting the numbers below.** They were verified against
   > a live project at an earlier commit. The schema has changed since — the
   > self-assignment `CHECK` (`fc5c775`), the `users` indexes and
   > `getAllStaff` change (`7d25877`), and the Realtime publication section
   > (`26deb91`) are **not yet applied to your project**. Re-apply
   > `supabase-schema.sql` to pick them up; the file is re-runnable. Until you
   > do, the live database is behind the file, and the publication is still
   > empty.
2. **The anon key is not a secret.** It ships in the JavaScript bundle and is
   meant to be public. Safety comes from the policies, not from hiding the key.

The policy vocabulary:

| Keyword | Meaning |
|---|---|
| `USING` | Which **existing** rows you may see or modify. |
| `WITH CHECK` | What the row must look like **after** your write. |
| `FOR SELECT/INSERT/UPDATE/DELETE` | Which operation the rule covers. |
| `TO authenticated` | Only signed-in users (not the `anon` role). |

When multiple policies match, PostgreSQL **ORs** them together — so `SELECT`
succeeds if *any* single policy allows it. That is why a restrictive rule must be
expressed inside the policies themselves, not assumed.

**Crucial:** if a table has RLS enabled but *zero* policies, everything is
denied. Access is never "accidentally open".

---

## 8. Every policy, table by table

26 policies total, which matched the live count at the time of audit — see the
staleness note above.

### `users`

| Policy | Operation | Who | Note |
|---|---|---|---|
| `users_select_authenticated` | SELECT | **Any signed-in user** | `USING (true)` — everyone can read the whole directory: names, emails, and both role flags. This is intentional so the UI can render pickers. |
| `users_insert_self` | INSERT | Any signed-in user | Only your own row, and only with `is_admin = false`, `is_leader = false`. |
| `users_update_self` | UPDATE | Any signed-in user | **Your own row only**, and you may not change `is_admin`, `is_leader`, `role`, `email`, `uid`, or `coach_uid` — each is compared to a helper that reads the row as it was *before* the statement ran. |
| `users_admin_update` | UPDATE | Admins | Any row, any value. This is the only path that can set `coach_uid` or change a role. |

`users_update_self` is the single most important policy in the file. It is what
stops privilege escalation:

```sql
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
```

Two details worth understanding:

- **`IS NOT DISTINCT FROM`, not `=`.** `coach_uid` is nullable. With `=`, the
  comparison `NULL = NULL` yields `NULL`, not `true`, so the check would fail and
  *every* self-update by an un-coached member would be rejected. This operator is
  NULL-safe.
- **The helpers read the old value.** Inside one `UPDATE`, a `stable` function's
  `SELECT` sees the statement-start snapshot. That is what makes "this column
  must not have changed" enforceable at all.

### `development_reviews`

| Policy | Operation | Who |
|---|---|---|
| `reviews_owner_all` | ALL | The owner, for their own row. |
| `reviews_coach_or_admin_select` | SELECT | Admin, or the person's actual coach. |
| `reviews_coach_or_admin_update` | UPDATE | Admin, or the person's actual coach. |

### `quarterly_summaries`

Same three-way shape: `summaries_owner_all`, plus
`summaries_coach_or_admin_select` and `summaries_coach_or_admin_update`, which
allow an admin, whoever the row's `coach_uid` points at, or the verified coach.

### `coaching_requests` (retired — historical only)

This table backed the old nomination workflow. **The app no longer reads or
writes it.** It is kept so existing rows keep their access rules and nothing is
destroyed; nothing depends on it for new behaviour.

| Policy | Operation | Who |
|---|---|---|
| `coaching_member_select` | SELECT | The member who created it. |
| `coaching_member_insert` | INSERT | Anyone, for their own `member_id`. |
| `coaching_coach_or_admin_select` | SELECT | Admin, or the nominated coach. |
| `coaching_coach_or_admin_update` | UPDATE | Admin, or the nominated coach. |
| `coaching_admin_delete` | DELETE | Admin only. |

Note there is **no** member UPDATE policy on purpose. The pending → approved →
accepted state machine is protected by a trigger, not by a policy (see §10).

> Because `is_coach_of()` no longer consults this table, its policies are now
> effectively admin-only for live use. That is intentional: assignments flow
> through `users.coach_uid` instead.

### `activity_logs`, `follow_up_tasks`, `meetings`

| Policy | Who |
|---|---|
| `activity_logs_owner_select` | The member. |
| `activity_logs_coach_or_admin_select` | Admin or actual coach. |
| `activity_logs_insert` | The member the log is about, **or that member's coach, or an admin** (`user_id = auth.uid()` OR `is_coach_of(user_id)` OR `is_admin_user()`). |
| `activity_logs_admin_delete` | Admin only. |
| `follow_up_select` | The task's owner, **or anyone for the global coordination rows** (`user_id IS NULL`), or an admin. There is **no** coach check — any signed-in user can read shared global tasks. |
| `follow_up_owner_write` | The owner, or an admin. |
| `meetings_owner_all` | The owner, or an admin. |

### Global tables

`requirement_settings` and `review_schedules` each have a read-any-authenticated
policy and an admin-only write policy. There is exactly one global settings row
and one row per quarter, seeded by the schema
(`supabase-schema.sql:722-724`). Note `review_schedules` has **no** schema seed:
its defaults come from the client, which writes rows on demand.

---

## 9. Helper functions and why they exist

| Function | Returns | Purpose |
|---|---|---|
| `is_admin_user()` | bool | The main admin check used by most policies. |
| `is_admin_or_leader()` | bool | Admin **or** leader. |
| `is_coach_of(member_uid)` | bool | Is the caller this person's assigned coach? Reads `users.coach_uid` — the single source of truth. |
| `current_uid()` | text | The caller's uid. |
| `__my_is_admin()` | bool | Security-definer read of the *caller's own* stored flag. |
| `__my_is_leader()` | bool | Same, for `is_leader`. |
| `__my_role()` | text | Same, for `role`. |
| `__my_email()` | text | Same, for `email`. |
| `__my_coach_uid()` | text | Same, for `coach_uid`. |
| `sync_assigned_coach()` | trigger fn | `BEFORE INSERT OR UPDATE OF coach_uid` on `users`. Refuses self-coaching and promotes the assigned coach to `is_leader`. |
| `bootstrap_first_admin()` | trigger | First-ever user becomes owner. |
| `coaching_state_guard()` | trigger | Enforces the coaching state machine. |

### Why the `__my_*` functions are `SECURITY DEFINER`

This is subtle and important. A policy on the `users` table that needs to read
the `users` table would recurse: reading the row to evaluate the policy would
itself trigger the policy, forever.

`SECURITY DEFINER` runs the function as the table owner, so it reads the row
*without* being subject to RLS. That breaks the recursion.

`is_admin_user()` and `is_coach_of()` are `SECURITY DEFINER` for the same reason
— they are called from inside policies on other tables but must read `users`
(which is itself under RLS, so an ordinary read inside a policy would recurse).

### `set search_path = public`

Every function pins its search path. Without it, a caller could in principle
shadow a table name and make a security-definer function operate on the wrong
table. It is standard hardening for privileged functions.

---

## 10. Triggers: rules the database enforces on itself

RLS filters rows. Triggers change them. Two matter here.

### `trg_bootstrap_first_admin` — `BEFORE INSERT` on `users`

Sets `is_admin = true`, `is_leader = true`, `role = 'Admin'` **only if the
`users` table is currently empty**. Runs as the owner, so the client cannot
influence it, and it cannot be replayed once a user exists.

### `trg_sync_assigned_coach` — `BEFORE INSERT OR UPDATE OF coach_uid` on `users`

This is the live coaching rule, and the only place coaching status changes:

- Raises if `coach_uid` would equal the row's own `uid` — nobody is their own
  coach, whoever is performing the write.
- Sets `is_leader = true` on the assigned coach if they were not already a
  leader. An assigned coach *is* a Team Leader.
- Does **not** demote when a coach is cleared, because a leader may legitimately
  lead without a coachee. `is_coach_of()` grants data access, so demotion would
  not be needed for correctness even if we wanted it.

It is `SECURITY DEFINER` because the person performing the write is an admin
assigning *someone else's* row, which RLS would otherwise reject. The trigger
only fires when `coach_uid` actually changes, so promoting the coach does not
recurse.

### `trg_coaching_state_guard` — `BEFORE INSERT OR UPDATE` on `coaching_requests`

Retained with the retired table. Roughly:

- `status` may leave `'pending'` only if the actor is an admin.
- `accepted_by_coach` may leave `'pending'` only if the actor is the nominated
  coach.
- A non-admin may not set `coach_uid` to their own uid to then "accept" their
  own nomination.

That last rule is why self-promotion could not be forged in the old design. It
is now defence-in-depth for historical rows.

### `coach_uid` on `users` vs `coach_requests` — two different things

Worth stating explicitly, because this duplication caused the confusion that
led to the workflow being removed:

| | `users.coach_uid` | `coaching_requests.coach_uid` |
|---|---|---|
| Set by | Admin, via the **Coach Assignments** board or the **Team Members** table | The retired workflow |
| Read by RLS? | **Yes** — this is the live relationship | No |
| Status | Authoritative | Historical |
| Guard | `users_update_self` + `users_admin_update` policies, the `trg_sync_assigned_coach` trigger, and the `users_coach_not_self` CHECK constraint | `coaching_state_guard` trigger |
| Used by the app for | Everything: showing "who is my coach" *and* deciding who can see whose data | Nothing |

**Every RLS policy now reads `users.coach_uid`, through `is_coach_of()`.** The
app derives the same relationship from the same column, so the UI and the
database cannot disagree about who coaches whom. The `users_update_self` policy
pins the column, `users_admin_update` lets admins set it, and
`sync_assigned_coach()` keeps `is_leader` and self-coaching consistent.

Self-coaching is blocked twice over. The `trg_sync_assigned_coach` trigger
rejects it and promotes the newly assigned coach to leader; the
`users_coach_not_self` table-level `CHECK (coach_uid IS NULL OR coach_uid <> uid)`
rejects it again for any writer that never fires the trigger. The constraint is
added inside an idempotent `DO` block so the schema file can be re-run against
an existing database without error.

---

## 11. How data reaches the screen

### Realtime first, polling as a fallback

`subscribeRealtimeOrPoll()` (`src/supabaseDb.ts:485-533`) wraps every
subscription:

1. Fetch once immediately.
2. Try to open a Realtime channel. If it reports `SUBSCRIBED`, updates arrive by
   push.
3. If the channel reports `CHANNEL_ERROR` or `TIMED_OUT`, start a 30-second
   `setInterval` instead (`POLL_INTERVAL_MS`, `:475`).

The app subscribes to **8 tables** (`src/App.tsx:722-748`). Two of those
subscriptions are conditional: `allReviews` and `allSummaries` are only fetched
if the user is a leader or admin (`:723-731`). `coaching_requests` is not
subscribed to — the direct-assignment refactor made it a non-source of truth
(see §10).

**The publication is configured by the schema, not by hand.** `supabase-schema.sql`
§6b creates the `supabase_realtime` publication and adds all 8 tables, re-runnably.
See [§14](#14-realtime) and [REALTIME_GUIDE.md](./REALTIME_GUIDE.md) for how to
verify it and what the Dashboard toggles do.

### One effect loads everything

`src/App.tsx:617-751`, keyed on `[user]`:

- **Bypass mode** → read from localStorage, no network at all.
- **Real mode** → register the subscriptions above.

### Filters vs policies

The filter strings like `user_id=eq.<uid>` are Postgres **Realtime** filters —
they narrow what the server pushes. They are **not** security. If Realtime is
off, the poll refetches and RLS re-checks each row regardless. Your data is
protected by the policies either way.

---

## 12. Bypass / Demo mode

The login screen has three one-click buttons: **Platform Owner**, **Team
Leader**, and **Member** (`src/App.tsx:2420-2459`), plus a mock-data toggle.

Pressing one builds a fake profile entirely in the browser
(`handleBypassLogin`, `src/App.tsx:1391-1410`):

```ts
uid: "bypass_" + email.replace(/[@.]/g, "_"),   // → "bypass_lewikb13_gmail_com"
isAdmin: isAdminPriv || email === "lewikb13@gmail.com",
```

and writes it to `localStorage.staff_review_bypass_user`. Everywhere else,
bypass mode is detected by the uid prefix `bypass_` (18 checks in `App.tsx`).
No network request is made, and the real Supabase session is never touched.

### Is it available in production? Yes.

There is **no environment guard** — not `hasSupabaseConfig`, not
`import.meta.env.DEV`, not a feature flag. A production guard was added in
commit `bf5b2a3` and deliberately reverted in `bf9321d`. The shipped
`dist/assets/index-*.js` bundle contains the bypass buttons *and* a real
Supabase URL.

### What that does and does not give an attacker

This distinction matters, so be precise:

- **Gives:** the complete admin interface — dashboards, PDF exports, all buttons.
- **Does not give:** any data. Every read still passes through RLS, and no row
  with a `bypass_*` uid exists in the `users` table. The admin screens render
  empty.
- **Also not cleaned up:** `staff_review_bypass_user` is checked at
  `src/App.tsx:524` *before* `getSession()`, so a bypassed visitor is never
  re-validated against Supabase on reload.

So it is a **UI exposure, not a data breach**. If that trade-off is not
intentional, the fix is a three-line guard in `handleBypassLogin` plus hiding
the block — reintroduce what `bf5b2a3` did.

---

## 13. Applying schema changes

Everything in `supabase-schema.sql` is safe to re-run: `create or replace
function`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, a
`DO $$` block that drops all policies first, and `DROP TRIGGER IF EXISTS`.
Verified by running the file five times in a row against an empty database.

### Section order matters

The file runs in this order, and the order is load-bearing:

1. Extensions
2. **Tables** — created first
3. Helper functions
4. Indexes → RLS → policies → triggers

Tables must come first. The helper functions in step 3 all read
`public.users`, and Postgres validates a `language sql` function body *when the
function is created*. Define them before the table exists and the whole script
dies on `is_admin_user()` with `relation "public.users" does not exist` — which
is exactly what this file used to do on a brand-new project. Keep tables above
functions if you ever reorganise it.

### The one trap

**`CREATE TABLE IF NOT EXISTS` is a no-op when the table already exists.** A
column added to that block will therefore *not* appear in any database created
before the change. That is exactly what happened with `users.coach_uid`: the
column was added to the `CREATE TABLE` block only, and existing databases never
received it, so profile writes failed with a missing-column error.

The rule: **every new column needs its own idempotent `ALTER TABLE`.** The file
now carries this next to the table:

```sql
alter table public.users add column if not exists coach_uid text;
```

If RLS is enabled and the script dies partway through, policies may be left
dropped — a **fail-closed** state (deny all) rather than a fail-open one. Still,
read any red error rather than assuming it worked.

### Steps

1. Supabase Dashboard → **SQL Editor** → **+ New query**.
2. Paste the whole `supabase-schema.sql`.
3. **Run**.
4. Expect `Success. No rows returned.`
5. Re-run the audit query to confirm the objects you changed now exist.

---

## 14. Realtime

### The rule that isn't optional

**Postgres does not stream table changes to Supabase Realtime by default.** A
table must be explicitly added to the `supabase_realtime` *publication*. Miss
that and the failure is silent and nasty:

- the websocket connects fine,
- the client reports `SUBSCRIBED`,
- and then **nothing is ever delivered**.

There is no error to notice. The app just looks "slow". Supabase's own
troubleshooting docs call this the most commonly overlooked step, and warn that
creating a table and enabling realtime on it are **two separate steps**.

### Where it's configured

`supabase-schema.sql` **§6b**, a `DO` block that creates the publication and
adds the 8 tables the app subscribes to. It checks `pg_publication_tables`
before each `ALTER PUBLICATION`, so re-running the schema is safe (plain
`ALTER PUBLICATION ... ADD TABLE` errors on the second run with "table is
already member of publication").

The 8 tables map 1:1 to the `subscribe*` functions in `src/supabaseDb.ts`:

| Table | Subscription |
|---|---|
| `users` | `subscribeStaff` |
| `development_reviews` | `subscribeReviews` |
| `quarterly_summaries` | `subscribeSummaries` |
| `activity_logs` | `subscribeActivityLogs` |
| `meetings` | `subscribeMeetings` |
| `follow_up_tasks` | `subscribeFollowUpTasks` |
| `requirement_settings` | `subscribeRequirementSettings` |
| `review_schedules` | `subscribeReviewSchedules` |

`coaching_requests` is deliberately **absent**: the direct-assignment refactor
removed it as a source of truth (`users.coach_uid` replaced it), so nothing
subscribes to it. Don't add it back without a reason — every table in the
publication is streamed to every connected client.

Verify it any time:

```sql
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' order by tablename;
```

### Dashboard location (as of 2026)

Publication management moved out of the database section. It's now under
**Realtime → Event filtering**. Older dashboard versions label the same screen
**Database → Publications** or **Database → Replication**. Same thing.

Full walkthrough, including the three Settings toggles and which ones this app
actually needs: [REALTIME_GUIDE.md](./REALTIME_GUIDE.md).

### How the app subscribes

All 8 subscriptions go through one wrapper, `subscribeRealtimeOrPoll()`
(`src/supabaseDb.ts`):

1. **Initial fetch** — always, on mount.
2. **`postgres_changes` subscription** for that table, `event: "*"`.
3. **Any change → full refetch.** The handler deliberately ignores
   `payload.new`/`payload.old` and re-runs the query instead. Costs a little
   more network; removes a whole class of subtly-wrong-UI bugs.
4. **Fallback:** on `CHANNEL_ERROR` or `TIMED_OUT`, poll every
   `POLL_INTERVAL_MS` (30s).

Channels are named `realtime:{table}:{filter}`. The bare name `realtime` is
reserved by Supabase; a prefixed name is fine.

### Three things that bite

- **RLS gates delivery.** For Postgres Changes, a client only receives rows it
  could `SELECT`. Test as the real signed-in role — the SQL Editor runs as
  `postgres` and bypasses RLS, so it will lie to you.
- **DELETE events aren't RLS-filtered**, because Postgres can't check access to
  a row that's already gone.
- **`users` refetches the whole roster on any change to any row.** One coach
  reassignment re-downloads every profile for every connected client. At 5,000
  users this is the dominant realtime cost. See
  [PROJECT_GUIDE.md Appendix F](./PROJECT_GUIDE.md#appendix-f-scaling-to-a-large-roster-5000-users).

### Not used: Realtime Authorization

`realtime.messages` RLS policies govern **Broadcast** and **Presence** channels
only. This app uses Postgres Changes, where each table's own RLS policies apply.
No `realtime.messages` policies are needed, and "Allow public access to
channels" can be left at its default.

Supabase now recommends Broadcast over Postgres Changes for most use cases as
you scale. That's a larger change (trigger + `realtime.messages` policies +
`config: { private: true }` per channel) and isn't justified until there's a
measured problem.

---

## 15. Known gaps

Honest list. None of these are secrets about the code; they are the things to
know before you rely on a behaviour.

| Gap | Impact |
|---|---|
| Bypass mode has no environment guard | Full admin UI is public. No data exposure (see §12). |
| `users_select_authenticated` uses `USING (true)` | Any signed-in user can read every name, email, and role flag in `users`. Intentional, but it is real PII exposure. |
| `supabaseGetUser` returns `null` on any error | A permission failure is indistinguishable from a missing row, so the app logs you in as a fabricated unprivileged profile instead of showing an error. |
| Leader promotion happens in a trigger, not a client call | The client cannot grant itself leadership, and cannot fake a promotion. `src/App.tsx` re-reads its own row from the live staff list so the new `is_leader` shows up without a reload. |
| Two empty `catch` blocks (`src/App.tsx:564`, `:809`) | A rejected profile write is completely silent. |
| Activity-log failures only reach the console | The UI can report success while the audit trail write was denied. |
| Realtime unverified against the live project | The publication is set up by `supabase-schema.sql` §6b, but has not been confirmed end-to-end in a browser. Until it is, the app falls back to ~30s polling rather than breaking. |
| `App.tsx` is 5,482 lines | Hard to review; slow to change safely. |
| `sessionStorage` key `has_init_session` | Read and written, but behaviourally inert — the real guard uses `staff_review_session_marker`. Effectively dead. |

---

## Quick reference — where to look

| Question | File |
|---|---|
| "Who is allowed to do X?" | `supabase-schema.sql` § 6, policies |
| "Why can't I change this column?" | `users_update_self` policy |
| "Where did my session go?" | localStorage, `sb-*-auth-token` |
| "Why is this button greyed out?" | Role flags on the `users` row, then `is_coach_of()` |
| "Why didn't my save work?" | An RLS rejection — check the browser console |
| "Why is the screen not updating?" | Realtime off → 30s polling |
