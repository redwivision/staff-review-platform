# Realtime Setup Guide

How to turn on Supabase Realtime for this app, what the dashboard steps actually
mean, and how to tell whether it worked.

**Written against Supabase's current documentation (checked September 2026).**
Dashboard labels move around; if what you see doesn't match, the SQL is
authoritative and you can skip the UI entirely.

---

## The short version

Run this once in **Supabase Dashboard → SQL Editor → New query → Run**:

```sql
DO $$
DECLARE
  t text;
  watched text[] := ARRAY[
    'users', 'development_reviews', 'quarterly_summaries', 'activity_logs',
    'meetings', 'follow_up_tasks', 'requirement_settings', 'review_schedules'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY watched LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
```

This block is **already in `supabase-schema.sql`** (section 6b). If you applied
the schema recently, realtime is already configured and you can skip to
[How do I know it's working?](#how-do-i-know-its-working).

---

## The three-step thing you hit in the dashboard

You said the Realtime screen has a 3-step process. Here's what each one means.
**You only need step 3 for this app.** Steps 1 and 2 are for other features.

### Step 1 — Enable the Realtime service
*Realtime → Settings → "Enable Realtime service"*

A master on/off switch for the whole Realtime service. Default is **Enabled**,
and the docs note it releases its database connection and replication slot when
you disable it. Leave this on.

> Worth knowing: a free Supabase project can be **suspended** for exceeding
> quotas. If realtime suddenly stops working on a project you haven't touched in
> months, check whether the project was paused before assuming your config broke.

### Step 2 — Allow public access to channels
*Realtime → Settings → "Allow public access to channels"*

This one confuses almost everyone, because it sounds like it governs your data.
It does not. It only controls **Broadcast** and **Presence** channels.

- **Enabled** (default): anyone holding your project's anon key can subscribe to
  and broadcast on any *public* channel. No policy check runs.
- **Disabled**: every channel join is checked against RLS policies on
  `realtime.messages`, and clients that don't set `config: { private: true }` are
  rejected with `PrivateOnly`.

**This app uses neither Broadcast nor Presence.** It uses **Postgres Changes**,
which is governed by each table's own RLS policies. So leave this toggle alone
unless you later add chat-style features.

### Step 3 — Event filtering (this is the one you need)
*Realtime → Event filtering* — the screen listing which tables stream changes.

This is where the `supabase_realtime` publication is managed. If your dashboard
still shows the older wording, it's the same screen under **Database →
Publications**, or **Database → Replication** depending on your dashboard
version. All three names refer to the same thing: the list of tables Realtime
watches.

Toggle on the 8 tables the app subscribes to. Or just run the SQL above, which
does it for you and stays correct when you re-run it.

> This setting is genuinely confusing because **creating a table and enabling
> realtime on it are two separate steps**. Your tables existed, your code was
> correct, and realtime still did nothing. That's the trap.

---

## Why this was never configured in your project

The schema file didn't set up the publication, so it was done by hand in the
Dashboard (or not at all). It's now part of `supabase-schema.sql` — see
[ARCHITECTURE.md § 14](./ARCHITECTURE.md#14-realtime) for the reasoning.

---

## How do I know it's working?

### Check the config (SQL Editor)

```sql
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
```

You should get 8 rows. If you get **zero**, that's your problem. If you get some
but not all, the missing ones aren't streaming.

### Check live traffic (Dashboard)

*Realtime → Inspector*

This screen shows messages flowing in real time. It filters to the tables
currently in the publication, so an empty list here usually means the
publication is empty, not that nothing is happening.

### Test the real thing (the only test that counts)

1. Open the app in **two different browsers** (or one normal + one private
   window). Two tabs in the same browser share a session, which makes this
   harder to read.
2. Log in as an **admin** in both.
3. In window A, go to **Admin → Coach Assignments** and assign a coach.
4. In window B, watch the assignment appear.

It should appear in under a second. If it doesn't:

### A harmless warning you'll see locally

```
WARNING:  "wal_level" is insufficient to publish logical changes
HINT:  Set "wal_level" to "logical" before creating subscriptions.
```

This appears when you run the schema against a **plain local Postgres** and is
**expected**. Supabase sets `wal_level = logical` on hosted projects already, so
you won't see it in production — and it doesn't stop the tables from being added
to the publication (the `select count(*)` check above still returns 8).

### Symptom table

| Symptom | Likely cause |
|---|---|
| Nothing ever updates, ever | Table not in the publication |
| Updates only after a manual refresh | Working, just slow — or a stale bundle |
| Updates appear but are missing some rows | RLS is filtering delivery (see below) |
| Browser console shows `CHANNEL_ERROR` / `TIMED_OUT` | Connection problem, not config |

### RLS gates delivery — this surprises people

For Postgres Changes, **a client only receives rows it is allowed to `SELECT`.**
Verify this as the actual signed-in role, not as `postgres` in the SQL Editor,
because the SQL Editor bypasses RLS by default. If the same query returns rows
for you but nothing for a real user, RLS is the cause.

One asymmetry worth internalising: **DELETE events are not RLS-filtered at all**,
because Postgres has no way to check access to a row that's already gone.

---

## How this app's realtime actually works

`subscribeRealtimeOrPoll()` in `src/supabaseDb.ts` wraps every table
subscription, so all 8 tables behave identically:

1. **Initial load** — a normal fetch, always.
2. **Subscribe** to `postgres_changes` for that table.
3. **On any change → refetch.** The code deliberately does *not* patch state
   from the event payload. It re-runs the query. Slightly more network, far less
   chance of a subtly wrong UI.
4. **On `CHANNEL_ERROR` or `TIMED_OUT` → fall back to polling** every 30s.

So if realtime is misconfigured, the app degrades to 30-second polling rather
than breaking. That's by design, but it has a real downside at your scale:

> **The `users` subscription refetches the entire roster on every single change
> to any single row.** One admin reassigning a coach re-downloads every profile
> for every connected client. At 5,000 users that's a 5,000-row query per
> change. This is the main reason roster access needs the decision in
> [PROJECT_GUIDE.md Appendix F](./PROJECT_GUIDE.md#appendix-f-scaling-to-a-large-roster-5000-users).

Also note step 2's channel name is built as `realtime:{table}:{filter}`. The
literal name `realtime` is reserved by Supabase, but prefixed names like
`realtime:users:all` are fine.

---

## If you'd rather not use Postgres Changes

Supabase's own docs now recommend **Broadcast** for most cases, because
"Postgres Changes require minimal setup, but have some limitations as your
application scales." Broadcast + a database trigger is the documented
migration path, and it scales better with many connected clients.

That's a bigger change than a publication toggle, and it needs
`realtime.messages` RLS policies plus `config: { private: true }` on every
channel. Worth it if realtime gets heavy; not worth doing before you've measured
a problem.

---

## Quick reference

| Task | Where |
|---|---|
| Turn the service on/off | Realtime → Settings |
| Public vs private channels | Realtime → Settings (Broadcast/Presence only) |
| Choose which tables stream | Realtime → Event filtering |
| See live traffic | Realtime → Inspector |
| See connection errors | Logs → Realtime |
| Verify the publication | SQL: `select * from pg_publication_tables where pubname = 'supabase_realtime';` |

**Sources:** [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes),
[Realtime Settings](https://supabase.com/docs/guides/realtime/settings),
[Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization),
[Realtime Troubleshooting](https://supabase.com/docs/guides/troubleshooting/realtime-postgres-changes-troubleshooting),
[Messages Not Arriving](https://supabase.com/docs/guides/troubleshooting/realtime-messages-not-arriving).
