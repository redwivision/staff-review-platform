# Testing Guide — How to Test Locally

Follow these steps **in order**. Takes about 10 minutes.

---

## Step 1: Clear Everything and Start Fresh

This avoids old localStorage data causing issues.

1. Open the app in an **incognito/private window** (Chrome: `Cmd+Shift+N`, Firefox: `Cmd+Shift+P`)
2. Open browser console (`F12` → Console tab) and type:
   ```js
   localStorage.clear()
   ```
3. Press Enter
4. Refresh the page

---

## Step 2: Start the Dev Server

```bash
cd "/Users/Learning/Desktop/staff-review /staff-review-platform"
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Step 3: Test the "Your next step" guidance (Staff View)

> There is no pop-up onboarding tour. `src/components/OnboardingTour.tsx` is a
> leftover stub that renders `null` and is not imported anywhere — the real
> guidance is a **"Your next step" card** built into the dashboard.

1. On the login screen, click **Platform Owner (Lewis KB)**
2. On the dashboard you should see a **"Your next step"** card telling you what
   to do first
3. **Click its button.** It must actually open something — this was broken and
   fixed in commit `fc5c775`, where the action pointed at a control that did
   not exist. If it does nothing, that regression is back.
4. If the card is missing, clear localStorage (`localStorage.clear()`) and refresh

---

## Step 4: Test the Dashboard (Staff View)

You should see:
- **Tab bar**: "My Reviews" | "Team Reviews" | "Admin Dashboard" (no jargon)
- **A "Your next step" card** near the top naming the specific action to take
- **3 quarter cards** (1st, 2nd, 3rd) with status badges

What to check:
- [ ] Tab names are plain language (no "CMO", "KDA", "PDP")
- [ ] Guidance banner shows for first-time users
- [ ] Quarter cards show "Not Started" or "In Draft" or "Submitted"

---

## Step 5: Test the Monthly Form (Walk with God tab)

1. On the **1st Quarter** card, next to **"Monthly Form"**, click **Fill/Edit Form**
   (it reads **View Form** once submitted)
2. You should see the tab bar: **Getting Started | Walk with God | Personal Life | Relational Life | Ministry Impact**
3. Click **Walk with God** tab
4. You should see:
   - Section title: "WALK WITH GOD (walk with God and character growth)"
   - 4 bullets describing what this section covers
   - Self-reflection questions
   - 3 fields: Strengths, Needs Improvement, Suggested Action Points
5. Click **Ministry Impact** tab — same structure

What to check:
- [ ] No "Heart Walk" or "Ministry Effectiveness" text anywhere
- [ ] Tab names are simple: "Walk with God", "Ministry Impact"
- [ ] Form fields work (can type, can save draft)

---

## Step 6: Test the Quarterly Summary Form

1. Go back to dashboard (click "My Reviews" tab)
2. On the **1st Quarter** card, next to **"Quarterly Form"**, click the summary
   button — **Fill Summary (Required)**, or **Resume Summary (Required)** if you
   have started, or **View Evaluation** after the coach has completed it
3. You should see tab bar: **General & Suggestions | Personal Development Plan
   (PDP) | Critical Mission Objectives (CMO) | Key Deliverable Assignments (KDA) |
   Team Leader (TL) Evaluation**

What to check:
- [ ] All six sections render, with the abbreviations in brackets on the four
      main tabs (the plain-language wording sits in the smaller sub-labels
      beneath them)
- [ ] "Personal Development Plan (PDP)" shows 3 categories: Walk with God, Personal Life, Relational Life
- [ ] "Critical Mission Objectives (CMO)" shows the Ministry Impact bullets at the top (the context guide)
- [ ] "Key Deliverable Assignments (KDA)" shows assignment fields
- [ ] "Team Leader (TL) Evaluation" shows the evaluation form (locked for staff)
- [ ] Banner says: "You are drafting your Quarterly Review Summary..."

---

> The names **Lewis KB**, **Sarah** and **John** come from the seeded mock
> data (see the bypass buttons). They are test fixtures, not real people.

## Step 7: Test as a Coach (Team Leader — Sarah)

1. Go back to login page (click your name in top-right → Logout)
2. Click the **Team Leader (Sarah)** bypass button
3. You should see the **"Team Reviews"** tab (not "Team Evaluation Center")
4. Click **Team Reviews**
5. You should see John Staff, Anna Coordinator, Peter Field Officer listed
6. Click on **Peter Field Officer** — his summary should be in "Submitted" status
7. Open his quarterly summary — you should be able to fill out the **"Coach's Review"** tab

What to check:
- [ ] Tab says "Team Reviews" (not "Team Evaluation Center")
- [ ] Can open staff summaries
- [ ] "Coach's Review" tab is editable for coach

---

## Step 8: Test as Admin (Platform Owner — Lewis KB)

1. Log out, log in as **Platform Owner (Lewis KB)**
2. Click **"Admin Dashboard"** tab (not "Access Directory")
3. You should see **four** sub-tabs: **Coach Assignments | Reports & Reviews |
   Settings | Team Members** — and you should land on **Coach Assignments**
4. Click **Reports & Reviews**
5. You should see staff with their evaluation status

What to check:
- [ ] Tab says "Admin Dashboard" (not "Access Directory")
- [ ] Four sub-tabs, starting on "Coach Assignments"
- [ ] Sub-tabs say "Coach Assignments", "Reports & Reviews", "Settings", "Team Members" (not "Oversight Compliance", "Deadlines", "User Management")
- [ ] Staff evaluations are visible
- [ ] "Coaches' Feedback" section (not "Team Evaluation Center")

---

## Step 8b: Assign a Coach (the default admin screen)

1. Log in as **Platform Owner (Lewis KB)** (admin). You should land on the **Coach Assignments** tab
2. Check the banner: it should read "All staff have a coach", or count how many are missing
3. Everyone in the list shows their coach, or "No Coach Assigned"
4. Assign **Sarah** as coach to **John** from the board. The board updates
   live, so **do not press F5** — if you have to refresh to see it, realtime is
   not working (see [REALTIME_GUIDE.md](./REALTIME_GUIDE.md))
5. Repeat the same assignment from the **Team Members** tab — it is the same control

What to check:
- [ ] The **Coach Assignments** tab is the default tab an admin lands on
- [ ] The unassigned count drops as you assign, and reaches "All staff have a coach"
- [ ] Clicking a person opens a **search box** — type part of a name, and
      matches appear. It is a typeahead, **not** a dropdown (a dropdown of
      5,000 options is what made the old version unusable)
- [ ] Search matches on name and email, and is debounced
- [ ] A person is never offered as their own coach
- [ ] The clear option ("No Coach Assigned" / Clear) removes the assignment
- [ ] The list pages 25 at a time, and the "only unassigned" filter narrows it
- [ ] Sarah Leader now shows **Coach / Leader** in her own Access Level, even if she was a plain member before
- [ ] The same change made from Team Members shows up on the Coach Assignments board

Now log out, log back in as **Team Leader (Sarah)**, and check the flip side:

- [ ] Her **Team Reviews** tab is there
- [ ] John Staff appears in it
- [ ] John Staff's summary is openable

And log in as **John Staff**:

- [ ] His next-step card shows his coach's name (or "Waiting for your coach" if unassigned)
- [ ] There is **no** "Nominate" button, no "Pick your coach", and no invitation to accept anywhere

Finally, confirm access actually moved:

- [ ] After reassigning John Staff to a different coach, the previous coach can no longer see him
- [ ] Sarah Leader still sees the staff she was assigned, and nothing else

---

## Step 8c: Check the session does not come back on its own

1. Log in with any account (or a bypass button)
2. Reload the page — you should **stay** signed in
3. Leave the tab alone, or close the browser tab entirely, then come back and reload
4. You should land on the **login screen**, not back in the workspace

Also confirm the toggle buttons are reachable:

- [ ] On the login screen the language and theme buttons sit **below** the amber demo banner, not under it
- [ ] Both buttons are clickable (the banner does not cover them)
- [ ] The amber banner is still visible at the very top of the page

---

## Step 9: Check the Labels Are Consistent

Search the entire app for these old jargon words — they should NOT appear anywhere in the UI:

| Old Word | Should Be |
|---|---|
| CMO | My Key Goals / Key Goals |
| KDA | My Main Tasks / Main Tasks |
| PDP | My Growth Plan / Growth Plan |
| TL Evaluation | Coach's Review / Coach's Evaluation |
| Nominate / Pick your coach | (removed) an admin assigns your coach in Team Members |
| Awaiting coach confirmation | Waiting for your coach |
| Heart Walk | Walk with God |
| Ministry Effectiveness | Ministry Impact |
| Staff Identity | Your Details |
| Form Info | Getting Started |
| Access Directory | Admin Dashboard |
| Team Evaluation Center | Team Reviews |
| Oversight Compliance | Reports & Reviews |
| Deadlines & Requirements | Settings |
| User Management Directory | Team Members |

---

## Step 10: Type Check and Build

```bash
npx tsc --noEmit
npm run build
```

Both should complete without errors.

---

## Step 11: Database Security Checks (optional, needs local Postgres)

These run `supabase-schema.sql` against a throwaway database on your own machine
and prove the coaching rules hold in the database, not just in the UI. You do
**not** need a Supabase account or a connection string — everything is local and
the test database is dropped at the end.

```bash
# 1. Create a scratch database, plus the auth stand-in the schema needs.
#    This also creates the anon/authenticated/service_role roles if missing.
createdb sr_check_test
psql -v ON_ERROR_STOP=1 -q -d sr_check_test -f test/auth-stub.sql

# 2. Apply the schema, then apply it twice more — it must be safe to re-run
psql -v ON_ERROR_STOP=1 -d sr_check_test -f supabase-schema.sql
psql -v ON_ERROR_STOP=1 -d sr_check_test -f supabase-schema.sql

# 3. Behaviour of the assignment trigger
psql -q -d sr_check_test -f test/self-assignment-check.sql

# 4. Self-assignment is rejected even with the trigger disabled
psql -q -d sr_check_test -f test/self-assignment-check-direct.sql

# 5. Clean up
dropdb sr_check_test
```

What to check:
- [ ] Both schema applications exit 0 (no errors, only `NOTICE` lines)
- [ ] `users_coach_not_self` appears exactly once in `pg_constraint`
- [ ] Every self-assignment case reports `violates check constraint "users_coach_not_self"`
- [ ] A legal assignment (`coach_uid <> uid`) and clearing a coach both succeed
- [ ] The trigger promotes a newly assigned coach to `is_leader` and does not demote them when the assignment is cleared

There is also a translation audit that needs no database:

```bash
python3 test/audit_i18n.py
```

It reports duplicate dictionary keys, any non-Ethiopic characters that crept
into the Amharic file, and any `t("...")` key in `src/` with no translation.

---

## If Something Breaks

| Problem | Fix |
|---|---|
| Tour doesn't appear | `localStorage.clear()` in console, refresh |
| Blank screen | Check console for red errors (F12 → Console) |
| Old labels still showing | You're viewing a cached version — hard refresh (`Cmd+Shift+R`) |
| Build fails | Read the error message — usually a missing import or typo |
| Form doesn't save | Make sure you're in bypass mode or have a valid Supabase session |

---

## Quick Pre-Push Checklist

- [ ] `npx tsc --noEmit` — no errors
- [ ] `npm run build` — builds successfully
- [ ] Onboarding tour appears on first login
- [ ] Dashboard tabs use plain language
- [ ] Monthly form tabs: Walk with God, Personal Life, Relational Life, Ministry Impact
- [ ] Quarterly form tabs: My Growth Plan, My Key Goals, My Main Tasks, Coach's Review
- [ ] Admin tabs: Reports & Reviews, Settings, Team Members
- [ ] No jargon (CMO, KDA, PDP, TL, Heart Walk, Ministry Effectiveness) visible in UI
