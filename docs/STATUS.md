# Current State, Flows and Limitations

**The single authoritative reference for where this project actually is.**

Everything here was verified against the code, not written from memory. It
replaces the scattered "known gaps" lists that used to sit in three different
files and occasionally contradict each other.

- **Last verified:** 2026-09-26, against commit `039c9ee`
- **How to re-verify:** see [How to re-check this document](#how-to-re-check-this-document)

Other docs and what they are for:

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How it works, with `file:line` references |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | How to test each role by hand |
| [REALTIME_GUIDE.md](./REALTIME_GUIDE.md) | Supabase Realtime setup and verification |
| [CLIENT_TOP_5.md](./CLIENT_TOP_5.md) | The five questions to send now, copy-paste ready |
| [CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md) | All 22 open questions for the client |
| [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) | Learning walkthrough of the codebase |

---

## 1. The one-paragraph summary

A Supabase-backed React app where staff fill in a **Development Review** each
quarter, their **coach** completes a **Quarterly Summary** evaluation, and an
**administrator** signs it off. It is built and working for a small
organisation, and has been hardened for a **5,000-user** roster. The access
model is confirmed by the client (admins see everything; a coach sees only
their trainees; a member sees only their own forms and their own coach), but
**the database does not yet enforce that model** — that is the main outstanding
piece of work.

---

## 2. Current state by area

| Area | State | Notes |
|---|---|---|
| Auth (email + password) | **Working** | Supabase Auth. First registered user is auto-promoted to admin by a database trigger. |
| Development Review (self) | **Working** | 5 tabs, 4 required quadrants, autosave, validated submit. |
| Quarterly Summary (coach eval) | **Working** | 6 sections, locked until the member submits, validated submit. |
| Admin sign-off | **Working** | Sets reviewer + date; "Approved" is derived from that, not a stored status. |
| Decline & resubmit loop | **Working, undocumented** | Admin declines with a reason; coach edits and resubmits. See [flow 8](#flow-8-admin-decline-and-coach-resubmit). |
| Bulk sign-off / decline / PDF | **Working, undocumented** | Admin can select many rows and act. See [flow 9](#flow-9-bulk-admin-actions). |
| Coach assignment | **Working** | Two admin entry points; typeahead picker; `users_coach_uid` + trigger keeps `is_leader` in sync. |
| Meeting scheduling | **Working** | Reachable from the Team Reviews toolbar for coaches/leaders. |
| Follow-up tasks | **BROKEN — no UI** | Handlers and DB policies exist, but nothing renders. See [L8](#l8-follow-up-tasks-have-no-ui). |
| Activity/audit log | **Working, admin-only UI** | Coaches can read it via RLS but the UI hides it from them. |
| PDF export | **Working, English only** | Includes a section customizer (default vs custom). |
| Bilingual EN/AM | **Working** | 831 dictionary entries, audited. The PDF customizer modal is **not** translated. |
| Quarter locking | **Working, undocumented** | Admin sets per-quarter start/due dates and an unlock time. |
| Realtime live updates | **Configured but unverified** | Publication is set by the schema. Never confirmed in a browser; falls back to 30s polling. |
| Scale to 5,000 users | **Partly done** | UI is fixed. Data layer is not — see [Section 5](#5-scaling-to-5000-users). |
| RLS access model | **NOT enforced as agreed** | See [L2](#l2-everyone-can-read-every-profile). |
| Demo/bypass mode | **Working, exposed in production** | See [L1](#l1-demo-bypass-mode-is-public-in-production). |

---

## 3. The confirmed access model

The client has confirmed:

| Role | What they should see |
|---|---|
| **Administrator** | Everything |
| **Coach** | Only their own trainees' submitted work, plus their own draft |
| **Member** | Only their own forms, plus their own coach's contact details |
| **Coach assignment** | Fixed structure. Members do not choose and know they cannot. |

**The database does not currently enforce this.** `users_select_authenticated`
is `USING (true)`, so any signed-in user can still read every profile. This is
[L2](#l2-everyone-can-read-every-profile), and it is the top outstanding item.

---

## 4. Flows

Sixteen flows the app implements. Every step below was read out of the code.

### Flow 1: Registration and first admin
1. Visitor signs up. The client sends `is_leader: false, is_admin: false` — it
   cannot grant itself privilege.
2. `users_insert_self` RLS allows the insert, own row only.
3. `trg_bootstrap_first_admin` promotes the very first row to admin. It only
   fires when the table is empty, so it cannot be replayed.
4. Everyone after that registers as an ordinary member and must be promoted
   by an existing admin.
*Code: `supabase-schema.sql:738-758`, `App.tsx:777-823`*

### Flow 2: Login
1. `getSession()` → `supabaseGetUser(uid)`.
2. If the row is missing, the app **fabricates an unprivileged profile** and
   tries to create the row. Errors here are swallowed.
3. Profile lands in React state.
*Code: `App.tsx:543-569`, `App.tsx:798`. See [L3](#l3-fabricated-profile-on-any-read-error).*

### Flow 3 — Session lifetime
1. On boot, `shouldRequireLogin()` checks a per-tab marker and an 8-hour idle
   limit (`IDLE_LIMIT_MS`).
2. If required: clear the markers, drop any bypass profile, sign out.
3. Otherwise mark the session live, then load the profile.
**Consequence:** a second tab counts as a fresh session, so it returns to login
and signs the first tab out too. Deliberate — the data is sensitive.
*Code: `utils/session.ts:15-21`, `App.tsx:499-540`*

### Flow 4 — Member completes their Development Review
1. Dashboard quarter card → `handleSelectMyReview` creates or reuses the record.
2. `ReviewFormEditor`, guided by default.
3. Autosaves; "Save Progress Draft" keeps status `Draft`.
4. "Submit to Leader" validates all 4 required quadrants, then sets `Submitted`.
*Code: `App.tsx:1422-1457`, `ReviewFormEditor.tsx:160-209`*

### Flow 5 — Leader adds feedback to a member's review
1. Team Reviews → pick a member → `handleSelectStaffReview`.
2. Leader view: inline comments per section, plus Finalize / Request-Revision.
3. "Save Feedback & Actions" persists.
*Code: `App.tsx:1459-1492`, `ReviewFormEditor.tsx:265-294`*

### Flow 6 — Member completes the Quarterly Summary
1. Quarter card → `handleSelectStaffSummary` → `SummaryFormEditor`.
2. Draft freely while the quarter is unlocked.
3. "Submit to Coach" requires: a verified coach **exists**, plus team leader
   name and time-in-position. Otherwise it alerts.
4. On submit, status becomes `Submitted` and sections 1–4 lock.
*Code: `SummaryFormEditor.tsx:241-278`, `App.tsx:1494-1607`*

### Flow 7 — Coach completes the TL Evaluation
1. Coach opens a `Submitted` summary; the evaluation tab unlocks.
2. Requires `overallEffectiveness` and `teamLeaderSignature`.
3. "Submit to Admin" sets `CoachSubmitted` and locks the form.
*Code: `SummaryFormEditor.tsx:280-317`*

### Flow 8: Admin decline and coach resubmit
1. Admin declines; a reason is **required**.
2. Status becomes `Declined`, `declinedBy`/`declinedAt` are stamped, and any
   prior sign-off is cleared.
3. The coach sees the reason banner, edits, and the button relabels itself
   **"Resubmit to Admin"**.
*Code: `App.tsx:2000-2060`, `SummaryFormEditor.tsx:413-442`*

### Flow 9: Bulk admin actions
1. Admin selects rows in the overview table.
2. Bulk **sign off**, **decline** (reason modal), or **export PDF**.
3. A progress modal advances ~300ms per item.
*Code: `App.tsx:1781-1957`, `App.tsx:3337-3420`*

### Flow 10 — Admin sign-off
1. Admin signs off from the overview table.
2. Sets `evaluation.formReviewedBy` and the date, and writes an activity log.
3. The UI then displays "Approved / Signed Off" — **derived from the reviewer
   field, not a stored status**.
*Code: `App.tsx:1730-1778`, `AdminReports.tsx:116-121`*

### Flow 11 — Assigning a coach (two entry points)
**A. Coach Assignments board** — the **default** admin sub-tab. Searchable
picker, "only unassigned" filter, 25 rows per page.
**B. Team Members tab** — the same control inline.
Both write `users.coach_uid`; the `trg_sync_assigned_coach` trigger promotes the
person to leader automatically, and `users_coach_not_self` blocks self-assignment.
*Code: `App.tsx:4215-4280`, `CoachAssignmentBoard.tsx`, `UserManagement.tsx`,
`supabase-schema.sql:331`, `supabase-schema.sql` (CHECK)*

### Flow 12 — Scheduling a review meeting
1. Team Reviews toolbar → "Schedule Review Meeting" (coaches/leaders only).
2. Pick a staff member (typeahead), quarter, date, time, notes.
3. Saved with a composite id. A Google Calendar link is offered.
*Code: `App.tsx:4576-4675`, `App.tsx:2149-2214`*

### Flow 13 — Activity / audit log
`logActivity` fires on sign-off, decline, and form saves. Admins see the list
with search, staff filter, type filter, 10 per page.
*Code: `App.tsx:1609-1646`, `ActivityLog.tsx:14-57`*

### Flow 14 — Demo / bypass mode
1. Toggle Mock Data → seeds localStorage.
2. Click a role button (Platform Owner / Team Leader / Team Member).
3. `handleBypassLogin` writes a fake profile. Sign-out clears all 7 keys.
*Code: `App.tsx:825-1410`, `App.tsx:2421-2459`*

### Flow 15 — PDF export
Single or bulk. A **"Configure PDF Export"** modal lets the admin choose
Default or a Custom Selection, with per-section include toggles.
**The modal is hardcoded English and not translated.**
*Code: `App.tsx:5262-5446`*

### Flow 16 — Settings, schedules and language
- **Requirement settings** — admin toggles which of the 4 quadrants are
  required; saves immediately.
- **Review schedules** — per-quarter start and due dates, an "unlocked" flag,
  and an unlock date/time. Members see `🔒 Locked by Admin` until then.
- **Language** — EN/AM toggle on the login screen and in-app, persisted to
  `staff_review_language`. `t()` silently falls back to English if a string is
  missing.
*Code: `App.tsx:4322-4377`, `App.tsx:4291-4308`, `App.tsx:243-265`*

---

## 5. Scaling to 5,000 users

**Done — the UI:**
- No native `<select>` for people anywhere. A dropdown of 5,000 options was the
  original blocker; four such controls now share a searchable picker capped at
  60 rendered matches.
- Every large list pages 25 at a time.
- Search is debounced and compares against a normalized, hoisted needle.
- Removed accidental O(n²) render work: coach names via `Map`, "already
  assigned?" via `Set`, admin export/decline via keyed `Map`, report
  aggregation in a single indexed pass.
- `users` has indexes: `created_at`, `coach_uid`, `lower(name)`, plus a partial
  index on unassigned staff.
- `getAllStaff()` names 8 columns instead of `select("*")`.

**Not done — the data layer:**
- The roster is still downloaded whole, into every browser.
- `users` changes trigger a full-roster refetch for every connected client.
- Reviews and summaries are fetched in bulk; an admin matrix can build ~15,000
  derived rows.
- `localStorage` bypass mode would hold a ~5 MB roster.

**The fix is a schema change**, gated on
[CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md) Q1–Q3: a `search_users` RPC that
filters and pages server-side, with RLS narrowed to self / self+trainees / admin.

---

## 6. Limitations

Every known limitation, in one list. `ARH` = ARCHITECTURE.md,
`PG` = PROJECT_GUIDE.md. Both now point here instead of keeping their own copy.

### Security and privacy

#### L1: Demo bypass mode is public in production
No environment guard. Anyone who can reach the live URL can sign in as
Platform Owner. It reads **no real data** (the database returns nothing for a
fake user) and mock data comes from localStorage — so it is a **UI exposure,
not a data breach**. Still, it should be off on the live site, and that is
easier to decide now than after the URL is known. *ARH §12, §15; PG; client Q17*

#### L2. Everyone can read every profile
`users_select_authenticated` is `USING (true)`. Any signed-in user can read all
5,000 profiles including `is_admin`, `is_leader`, emails, and reporting lines.
**This does not match the agreed access model.** The top outstanding item.
*ARH §8, §15; PG Appendix F; client Q1*

#### L3. Fabricated profile on any read error
`supabaseGetUser` returns `null` on any error, so a permission failure is
indistinguishable from a missing row. The app logs the user in as a fabricated
unprivileged profile rather than showing an error. *ARH §15*

#### L4. Two silent `catch` blocks on profile writes
A rejected write is completely silent. *ARH §15* (`App.tsx:564`, `:809`)

#### L5. Activity-log failures only reach the console
The UI can report success while the audit-trail write was denied. *ARH §15*

#### L6. `follow_up_tasks` has no coach check
Documented previously as "admin or actual coach". The policy contains **no
coach check**: any signed-in user can read the global coordination rows
(`user_id IS NULL`). *ARH §8*

#### L7. Audit log is kept indefinitely
No retention policy. At 5,000 users this table grows unbounded. *client Q4, Q20*

### Reliability and correctness

#### L8. Follow-up tasks have no UI
`handleSaveFollowUpTask` and `handleResetFollowUpDefaults` are **never called**,
`followUpTasks` state is loaded but never rendered, and `onViewStaffFollowUp` is
never passed — so both Follow-Up buttons in `AdminReports` are dead. The DB
table and its RLS policies are fine. **Earlier docs claimed admins can manage
these; that was false.** Either build the UI or remove the claim.

#### L9. Realtime is configured but never verified in a browser
The publication is created by `supabase-schema.sql` §6b, but end-to-end
delivery has not been confirmed. If it silently fails the app falls back to 30s
polling, so nothing breaks — which is exactly why it went unnoticed before.
*ARH §14, §15; REALTIME_GUIDE.md*

#### L10. The schema is ahead of the live database
Three commits of schema changes (self-assignment CHECK, `users` indexes,
realtime publication) are **written but not applied**. The live DB is behind
the file, so the publication is empty until it is re-applied. It is re-runnable.

#### L11. Meeting id hardcodes a fiscal year
The composite id contains `2025-2026`, so rescheduling in a later year
silently overwrites the same row. *`App.tsx:2156`*

#### L12. UI copy contradicts the real workflow
One form says "This form is done quarterly and will be submitted to HR", but
the flow is member → coach → **admin**. *`App.tsx:2921`*

#### L13. Language fallback is silent
`t()` returns the English key when a translation is missing, with no
user-visible signal that a string is untranslated. *`i18n.tsx:46`*

### Privacy of data at rest

#### L14. Data is hosted in Supabase's US region
No retention policy and no confirmed data-protection position. Worth raising
early — it can have a long lead time. *client Q20*

### Design and scope

#### L15. `App.tsx` is 5,482 lines
Hard to review and unsafe to change. *ARH §15*

#### L16. No email or push notifications
`review_schedules.notificationMessage` is stored and **never sent**, while the
UI implies notification. *`App.tsx:2107-2146`*

#### L17. Single admin flag, not split roles
One `is_admin` boolean covers platform owner, review administrator and
people/HR admin. Fine for a small trusted group. *client Q3*

#### L18. Hybrid staff + coach roles DO work — earlier docs said they didn't
`is_leader`, `is_admin` and `coach_uid` are independent, and a member who is
also assigned trainees keeps their own forms **and** gains Team Reviews. An
earlier "single role per user" limitation was simply wrong.

#### L19. `has_init_session` is dead code
Read and written, but behaviourally inert. The real guard uses
`staff_review_session_marker`. *ARH §15*

#### L20. No file uploads, offline mode, or native app
Offline/mock mode is dev-only. *PG Appendix E*

#### L21. Fiscal quarters are hardcoded July–June
Not admin-configurable. *client Q12*

#### L22. Exported PDFs are always English
Even in Amharic mode. The "Configure PDF Export" modal is also untranslated.
*client Q18*

#### L23. Only one coach per trainee
No subject-coach + mentor model. *client Q54*

#### L24. No browser automation
Playwright/Cypress/K6 configs exist but aren't installed. There **are** real
tests: 25 search assertions, an i18n audit, and SQL tests for the database
rules. *PG*

#### L25. `npm audit`: 1 high, 4 moderate
*Counted locally with `npm audit` on 2026-09-26. GitHub's security banner reports
2 high / 3 moderate for the same commit — the two tools classify overlapping
advisories differently. Re-run `npm audit` rather than trusting the banner.*
`browserslist` (high, build-time); `express`, `body-parser`, `qs`,
`baseline-browser-mapping` (moderate). The `qs` chain reaches `express`, a
**direct runtime dependency** of `server.ts`. Not reachable from browser code
today. Don't use `npm audit fix --force` — it would take a major `express` bump.

### Nice to have
No org-chart view, no cohort/analytics reporting, no coach reminders or
enforced deadlines, no printable cohort report, only EN/AM. *client §7*

---

## 7. Deliberately not built

So nobody mistakes these for bugs:

| Thing | Why |
|---|---|
| Member self-nomination of a coach | The client confirmed the structure is fixed and members cannot choose. `coaching_requests` is no longer a source of truth. |
| Coach accept/decline of an assignment | The assignment is final until an admin changes it. |
| Broadcast/Presence realtime channels | The app uses Postgres Changes. Migration is documented but not done. |

---

## 8. Open questions for the client

See [CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md) for all 22. The ones that gate
code:

| # | Question | Blocks |
|---|---|---|
| Q1 | What may a member see besides their own coach? | L2 — the RLS rewrite |
| Q7 | What happens to an in-progress review when the coach changes mid-quarter? | Assignment-history schema |
| Q14 | How many concurrent users? | Realtime architecture |
| Q15 | Will an admin ever need 5,000 rows on one screen? | Server-side paging |
| Q17 | Should bypass mode be disabled in production? | L1 |

---

## How to re-check this document

```bash
npm run lint                    # types
npm run build                   # compiles
npx tsx test/search.test.ts     # 25 search assertions
python3 test/audit_i18n.py      # translations
npm audit                       # advisory counts

# database rules (needs local PostgreSQL)
createdb sr_test
psql -v ON_ERROR_STOP=1 -d sr_test -f test/auth-stub.sql
psql -v ON_ERROR_STOP=1 -d sr_test -f supabase-schema.sql   # must be clean twice
psql -d sr_test -f test/self-assignment-check-direct.sql   # 5/5
dropdb sr_test
```

Line references drift when the code changes. If a claim here looks wrong,
trust the code and fix this file in the same commit.
