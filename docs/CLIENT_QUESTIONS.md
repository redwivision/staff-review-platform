# Client questions

> **In a hurry?** The five that actually block development are in
> [CLIENT_TOP_5.md](./CLIENT_TOP_5.md) — send those first. This file is the full
> list, for later.

Open questions about the review platform, written so the client can answer in
plain language. Each one says **why it matters** and **what changes depending on
the answer** — so you can see which ones are worth a conversation and which are
already settled.

Status legend:

- **ANSWERED** — we have this, it's recorded, no action needed.
- **PARTLY ANSWERED** — the main behaviour is decided; one detail is defaulted.
- **DEFERRED** — the client parked it for a specific meeting or moment.
- **NEEDED** — we cannot build the next part correctly without it.
- **NICE** — improves the result, doesn't block work.
- **FYI** — something they should know, no decision required.

Answers from 2026-10-08 are quoted verbatim from Roza Wesene; the interpretation
below each quote is ours and is what STATUS.md and the backlog are built on.

---

## Part 1 — Access and roles (highest priority)

We now know the shape of the system: **the app is for administrators' eyes.
Members interact only with their coach, and a coach sees only their own
trainees' work.** That is a much tighter model than the app currently enforces,
and it's what makes 5,000 users workable. These questions pin down the edges.

### Q1. ANSWERED (2026-10-08) — Can a member see anyone besides their own coach?

**ANSWERED — the staff directory is for administrators only.** Roza, 2026-10-08:

> The admin is the one who see staff directory which is Bayush. But I am
> planning Nati he is the organisation system and Teche person we need to add
> him as well to help Bayush.

- **Recorded decision:** no member browses or searches the staff directory.
  Named administrators today: **Bayush** (active), **Nati** (planned —
  organisation-systems/IT person, to be added as a second admin).
- A member still sees **their own coach's** contact details — that is the
  confirmed access model and is unaffected: "directory" here means the
  browsable list of everyone, which is admin-only.
- **This unblocks L2:** the RLS rewrite can now use the strictest model —
  self / self+trainees / admin — with no open question left.
- **Open follow-through:** provision Nati's account once the admin-role split
  (Q3) is shaped, so he gets the right level of access on day one.

### Q2. NEEDED — What exactly does a coach see?

We assume a coach sees their trainees' **submitted** reviews and their own
draft-in-progress work. Please confirm:

- Can a coach **see a trainee's form before the trainee submits it**? (Recommend:
  **no** — that removes the temptation to coach the answer.)
- Can a coach see **other coaches'** trainees? (Recommend: **no**.)
- Can a coach **edit** a trainee's form, or only their own? (Currently: only their
  own — the schema blocks a coach from writing a member's review.)

### Q3. ANSWERED (2026-10-08) — Is the admin role one role, or several?

**ANSWERED — separate roles, yes.** Roza, 2026-10-08:

> Separate role is good

- **Recorded decision:** the client wants the admin role split rather than one
  `is_admin` boolean. The shape is still open. The three suggested splits were:
  **platform owner** (settings, accounts), **review administrator** (runs the
  cycle, approves summaries), **people/HR admin** (roles and assignments) — and
  Nati's arrival (Q1) is the first real case for it.
- **Why it still matters:** splitting after 5,000 people have data is not
  straightforward, so this is pre-scale work, not a nice-to-have. Today the
  schema has a single `is_admin` flag (STATUS.md L17), so this is a
  **schema + RLS + UI change** — now confirmed as wanted, waiting only on
  "who gets which permissions".
- **Still needed (one line):** which permissions does Nati get? Suggested
  default: Nati = review administration (sign-off, reports), Bayush = platform
  owner (settings, accounts). Say yes/no and the split is fully specified.

### Q4. NEEDED — Should anyone see activity logs, and who?

The app records an audit trail (who viewed or changed what). We assume **admins
only**.

- **Is that right, or do coaches need to see their own trainees' activity too?**
- **How long should the log be kept?** It's currently kept indefinitely. For 5,000
  users, that's a large table that will need a retention policy.

### Q5. NICE — Does anyone need an "organisation chart" view?

Nobody has asked for one, so we're assuming **no**: nobody needs to browse the
whole reporting line, and each person only sees their own corner of it.

**Is that safe to assume?** If yes, it's a large simplification and we can stop
worrying about rendering a 5,000-person tree.

---

## Part 2 — The coaching structure

### Q6. NEEDED — Where does the coaching assignment come from?

**ANSWERED (partly):** members do not choose their coach, and the structure is
fixed — they know they can't choose. Good, that matches how the app behaves.

Still open, and it changes what we build:

- **Is the structure fixed for the whole year, or does it change each quarter?**
- **Where does the app get it from?** An admin types it in, or is it synced from
  an HR system / spreadsheet / other directory?
- **Who maintains it?** If admins maintain it by hand in the app, the Coach
  Assignments board is the right tool. If it's imported, we need to know the
  format and how often.

### Q7. PARTLY ANSWERED (2026-10-08) — What happens when the structure changes mid-quarter?

**Partly answered — the admin makes the change; the rest is defaulting.**
Roza, 2026-10-08:

> The admin will change the suprvious

That settles *who* changes it (an admin, from the assignment board) but not
quite what happens to the in-progress review. **Recorded default, unless
objected to:** the change behaves exactly as it does today — the new coach
takes over, the previous coach loses access immediately, the review keeps
**one** coach in its history, and no assignment-history table is built.
One line of confirmation ("yes, previous coach loses it") closes this fully;
if they later need "who coached whom across the quarter", that is a schema
change — much cheaper to add now than after 5,000 records exist.

The original question, for context:

Concrete scenario: a trainee's coach changes while their review is in progress.

- Should the **new coach** be able to see and continue the in-progress review?
- Should the **old coach** lose access immediately?
- Should the review show **both** coaches' names in the history?

Right now the app stores only the *current* coach (`users.coach_uid`), so a change
**overwrites** the old assignment and the previous coach loses access
immediately. That's usually right, but if a client needs an audit trail of who
coached whom across a quarter, we have to store assignment history too. **That's a
meaningful schema change — worth deciding before 5,000 records exist.**

### Q8. NEEDED — Is one coach allowed many trainees?

We've assumed yes, with no fixed limit. Is there a maximum (for example, no more
than 15 trainees per coach)? If there is, that's a validation rule we should add
so the admin finds out at assignment time instead of the coach drowning later.

### Q9. NICE — Who is allowed to be assigned as a coach?

Currently any staff member can be assigned as a coach, and the database promotes
them to a leader automatically. Should coaches need to be **verified or approved**
before they can be assigned? If yes, the assignment board needs a pending state.

---

## Part 3 — The review cycle itself

### Q10. ANSWERED (2026-10-08) — Is "Coach submitted" the final step, or is there an approval?

**ANSWERED — the three-step flow is confirmed; admin approval is required.**
Roza, 2026-10-08:

> Member submit-coach review- admin approve

That is exactly what the app does: member submits → coach completes → admin
signs off, including the decline-and-resubmit loop. No change needed. Two
small notes that are *ours*, not the client's: "Approved" in the UI is derived
from whether a reviewer name is stored rather than being a stored status, and
only an admin can decline (a coach cannot send back) — both stay as built
until told otherwise.

### Q11. NEEDED — Can a review be reopened after it's final?

If someone realises a mistake next quarter, can they edit a finalised review, or
is it permanently locked? Locking is cleaner for reporting; reopening needs an
audit trail to avoid losing the original.

### Q12. NEEDED — Which quarters and years are actually in use?

The app assumes July–June fiscal years and lets you pick a quarter and year.
At 5,000 users this list will get long.

- **Are the fiscal quarters fixed, or has the client's year changed?**
- **Do you need to lock or archive old years** so they can't be edited?

### Q13. NICE — Do coaches need reminders or deadlines?

Nothing currently nudges anyone. The app could show "3 of 12 reviews overdue" on
the admin dashboard. Useful, but it's a feature, not a fix — only build it if the
client says chasing people is a real problem.

---

## Part 4 — Scale and performance

### Q14. DEFERRED (2026-10-08) — How many people use this *at the same time*?

**Deferred by the client — decided at an upcoming meeting.** Roza, 2026-10-08:

> You will do this when you meet with Sean and DS team

- **Action:** schedule that meeting; the answer lands there, together with Q15.
- **Default until then:** build the server-side approach anyway — search +
  paging through a `search_users` RPC. It is the only design that holds up at
  5,000 regardless of the answer, so nothing is blocked; the meeting can only
  make it *more* necessary, not less.

The original question, for context:

This is the single biggest unknown and it changes the size of the remaining work
by an order of magnitude.

- **Roughly how many concurrent users** at peak (say, 20, or 500, or 2,000)?
- Is it **gently used over months** (each person reviews their own form once a
  quarter), or **used intensely in a two-week window** each quarter?

Gently-used needs almost nothing more. A concentrated push with many people online
at once needs more work on live updates and server-side loading.

### Q15. DEFERRED (2026-10-08) — Will an admin ever need all 5,000 people on one screen?

Decided at the same Sean/DS meeting as Q14 (Roza, 2026-10-08). **Default until
then:** yes — server-side filtering and paging gets built either way, per the
note under Q14.

The original question, for context:

- Is the admin's job **"handle one case at a time"** (search, act, move on) — or
  **"review the whole population"** (sort, filter, bulk-approve)?

If it's one at a time, we can make search fast and stop there. If it's the whole
population, we need server-side filtering and paging, which is a bigger build.

### Q16. FYI — Is the 5,000 number real yet, or a plan?

Worth being concrete about which of these it is:

- 5,000 people on day one,
- 5,000 within a year, with a few hundred to start,
- or a smaller pilot first that will grow.

Same code either way, but it changes how urgently the performance work matters.

**Still open — not covered in the 2026-10-08 round.** Worth asking with the
Sean/DS answers, since it is the stage question (pilot vs full rollout).

### Q17. FYI — Demo/bypass mode is enabled in production

**Still open — not covered in the 2026-10-08 round.** This one was displaced
from the first five by the workflow question (Q10). It still needs a yes/no
before launch; recommendation stands: off in production, kept locally.

There's a built-in "try it as any role" feature with no environment guard, so
anyone who can reach the live URL can sign in as a Platform Owner. It reads no
real data (the database returns nothing for a fake user), but it does expose the
full interface.

**Should this be disabled on the live site?** Recommend yes, and keeping it only
on a separate internal preview. This is a decision to make before launch, and it's
much easier to turn off now than after people know the URL exists.

---

## Part 5 — Language and output

### Q18. NEEDED — Which languages, and is PDF bilingual?

The interface is fully bilingual English/Amharic, including the app's own
buttons. But **exported PDFs are English-only** even in Amharic mode.

- **Do coaches and members need Amharic PDFs?** If yes, that's real work —
  the PDF is built from a fixed template.
- **Which language should a document default to** for each person?

### Q19. NICE — Is Amharic the only second language?

Easy to add a third if it's needed, but the dictionary and layout work scale with
the number of languages. Better to know now.

---

## Part 6 — Data and privacy

### Q20. NEEDED — Where is this data stored, and is that acceptable?

The app currently stores review data in **Supabase's cloud database (US
region)**. For personal data about named individuals, that may not satisfy the
client's data-protection obligations.

- **Has the client confirmed hosting location** is acceptable?
- **Do they need a specific region** (Ethiopia/EU)?
- **Is there a data-retention requirement** — e.g. delete reviews after N years?

This one can have a long lead time (contract review, migration), so it's worth
raising early even though the app itself works today.

### Q21. NEEDED — Who should be able to export data?

The admin reports page can export **PDFs**, individually or in bulk (with a
section picker). There is **no CSV/Excel export** — I checked, and none exists.
Confirm that **admins are the only people who should be able to export**, and
whether exports should be recorded in the audit log. Right now they are not:
the log is only written for sign-off, decline, and form saves.

**Also worth asking:** if the client expects to open results in Excel, that is a
real need and a small feature to add. Better to find out now than after launch.

### Q22. FYI — Emails and names are in the roster

Every profile includes an email address and a name, and (currently) any signed-in
user can read them all. Once access is tightened per Q1, this becomes a non-issue,
but it's worth confirming the client is comfortable with **names and work emails
being stored centrally** at all.

---

## Part 7 — Nice to have (only if there's budget and appetite)

- **Email notifications** when a review is assigned, submitted, or overdue.
- **File attachments** (evidence, documents) on a review.
- **Multiple coaches per trainee** — e.g. a subject coach plus a mentor.
- **A printable cohort/progress report** for the whole population.
- **Analytics** — completion rates by department, quarter-over-quarter trends.
- **Multi-language PDF export** (see Q18).

---

## Part 8 — Questions already answered (for reference)

| # | Question | Answer |
|---|---|---|
| — | Who picks the coach? | **Nobody.** The structure is fixed and members know they can't choose. |
| — | Who sees the app? | Administrators. |
| — | What does a member do? | Interacts with their coach only. |
| — | What does a coach see? | Only their own trainees' work. |
| Q1 | Who can see the staff directory? | **Admins only** (Bayush now, Nati planned). Members don't browse the roster. 2026-10-08. |
| Q3 | One admin flag or separate roles? | **Separate roles.** Shape (who gets what) is the one follow-up. 2026-10-08. |
| Q7 | Coach changes mid-quarter? | **Partly:** admin makes the change. Default recorded: previous coach loses access, no history table. 2026-10-08. |
| Q10 | Is coach-submitted the final step? | **No — member submit → coach review → admin approve.** Confirmed as built. 2026-10-08. |
| Q14, Q15 | Concurrency / 5,000 on screen? | **Deferred** to a meeting with Sean and the DS team; server-side paging is built regardless. 2026-10-08. |
