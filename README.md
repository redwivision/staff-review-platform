# Asseso — Staff Development Review Platform

A web application for managing quarterly staff reviews, coaching workflows, and leadership evaluations within the Africa Region team.

---

## Overview

Asseso provides a structured framework for staff self-reflection, coach-led evaluations, and administrative oversight across three recurring review cycles per year. It is designed for ministry teams who need a simple, auditable process for tracking personal, relational, and professional growth.

**Live deployment:** [https://staff-review-platform.vercel.app/](https://staff-review-platform.vercel.app/)

---

## Documentation

All documentation lives in [`docs/`](./docs):

| Document | What it's for |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | **Start here for how it works.** Auth, sessions, storage, cookies, the database, and every RLS policy — with file/line references so you can verify any claim. Also documents the known gaps. |
| [docs/PROJECT_GUIDE.md](./docs/PROJECT_GUIDE.md) | A guided tour of the codebase and the engineering process, written as a learning curriculum. Read this first if you're new to the project. |
| [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) | How to test each role and form locally, plus a pre-push checklist. |
| [docs/STATUS.md](./docs/STATUS.md) | **What state is the project in right now.** Every flow, every limitation in one deduplicated list, what's done and what isn't. Start here if you just want the state of play. |
| [docs/REALTIME_GUIDE.md](./docs/REALTIME_GUIDE.md) | How to turn on Supabase Realtime, what the dashboard's 3 Settings steps mean, and how to verify live updates are actually flowing. |
| [docs/CLIENT_TOP_5.md](./docs/CLIENT_TOP_5.md) | **The 5 questions to send the client now.** Copy-paste ready and phrased for a non-technical reader. |
| [docs/CLIENT_QUESTIONS.md](./docs/CLIENT_QUESTIONS.md) | All 22 open questions for the client, ranked — for when the first five are answered. |

> `docs/` also holds the client's private reference PDFs. Those are deliberately
> kept out of git — see `.gitignore`.

---

## Features

- **Quarterly Development Review** — staff self-assess across four areas, shown in the UI as Walk with God, Personal Life, Relational Life, and Ministry Impact
- **Quarterly Summary Form** — staff compile progress on PDP goals, Critical Mission Objectives, and Key Deliverable Assignments
- **Coach Evaluation** — team leaders review and score submitted summaries; evaluations are routed to the admin for approval
- **Admin Dashboard** — view all evaluations, sign off or decline in bulk, export individual or bulk PDFs, and assign coaches
- **Coach assignment** — an admin assigns a coach to any staff member. The **Coach Assignments** tab (the default admin tab) lists everyone with their current coach, flags who still has none, and assigns inline; the **Team Members** tab holds the same control alongside role and admin permissions. One action sets the coaching relationship everywhere at once: the member sees their coach, the coach immediately gains access to that person's data, and they are marked Coach/Leader automatically. There is no nomination, approval, or acceptance step.
- **Flexible quarterly form** — fill and save your Quarterly Summary as soon as it's unlocked; you only *submit* it to your coach once an admin has assigned one to you
- **Role-based access** — roles: Staff, Coach/Leader, and Admin
- **Bypass / Demo Mode** — instant one-click login as any role (Platform Owner, Team Leader, or Member) with optional seeded mock data, so you can test any workflow without setting up accounts. Available in all environments (dev and production) with no environment guard. It opens the full interface, but real database reads return **no data** — every read still passes through RLS and no matching row exists. With the **Mock Data** toggle on, screens are instead fully populated from localStorage seeded data. See [ARCHITECTURE.md § 12](./docs/ARCHITECTURE.md#12-bypass--demo-mode).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Database | Supabase PostgreSQL |
| PDF Export | jsPDF |
| Animations | Motion (`motion/react`) |
| Hosting | Vercel (deploys on every push to `main`) |

There is no custom backend server. `server.ts` only serves static files and runs
Vite in development — all auth and data access goes through Supabase.
See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how auth, sessions and database
policies fit together.

---

## Project Structure

```
staff-review-platform/
├── src/
│   ├── components/
│   │   ├── ReviewFormEditor.tsx        # Monthly Development Review form
│   │   ├── SummaryFormEditor.tsx       # Quarterly Summary form (PDP, CMO, KDA, Evaluation)
│   │   ├── GuidedReviewForm.tsx        # Step-by-step guided review
│   │   ├── GuidedSummaryForm.tsx       # Step-by-step guided summary
│   │   ├── CoachAssignmentBoard.tsx    # Assign coaches (the default admin tab)
│   │   ├── StaffPicker.tsx             # Searchable people picker (replaces 5,000-option <select>s)
│   │   ├── Pagination.tsx              # Shared 25-per-page pager
│   │   ├── AdminReports.tsx            # Admin dashboard with controls and PDF export
│   │   ├── ActivityLog.tsx             # Audit trail view
│   │   └── UserManagement.tsx          # Admin role management + a second way to assign coaches
│   ├── utils/
│   │   ├── search.ts                  # Search, debounce, and pagination helpers
│   │   ├── pdfExport.ts                # PDF generation logic (English-only)
│   │   └── session.ts                  # Session lifetime guard
│   ├── i18n.tsx / i18n/am.ts           # English/Amharic toggle and dictionary
│   ├── supabase.ts                     # Supabase client initialization
│   ├── supabaseDb.ts                   # Data access layer (CRUD + realtime/poll subscriptions)
│   ├── dataLayer.ts                    # Unified write layer for forms and actions
│   ├── App.tsx                         # Root component, routing, auth state
│   ├── types.ts                        # TypeScript interfaces
│   └── constants.ts                    # Section definitions, quarter info
├── test/                               # Search unit tests, i18n audit, SQL rule tests
├── supabase-schema.sql                 # Database schema + RLS policies + realtime publication
└── vite.config.ts                      # Vite build configuration
```

A fuller map, with what each file is for, is in
[docs/PROJECT_GUIDE.md Appendix A](./docs/PROJECT_GUIDE.md#appendix-a-full-file-map).

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase project (create one free at [supabase.com](https://supabase.com))

### Installation

```bash
git clone https://github.com/redwivision/staff-review-platform.git
cd staff-review-platform
npm install
```

### Database Setup

Run once on your Supabase project:

1. Open **Supabase Dashboard → SQL Editor**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run**

This creates all 9 tables (users, development reviews, summaries, follow-up tasks, settings, schedules, activity logs, coaching requests, meetings), indexes, and Row-Level Security policies.

**The file is safe to re-run at any time** — every object uses `IF NOT EXISTS`,
`IF EXISTS` or `CREATE OR REPLACE`, so it doubles as the migration path when the
schema changes.

> **Important for schema changes:** `CREATE TABLE IF NOT EXISTS` does nothing if
> the table already exists. Any column you add to this file must *also* be added
> as an idempotent `alter table ... add column if not exists ...` — otherwise
> existing databases silently keep the old shape and the app breaks on a missing
> column. See [ARCHITECTURE.md § 13](./docs/ARCHITECTURE.md#13-applying-schema-changes).

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key
```

Get these from **Supabase Dashboard → Settings → API**. If the `.env` file is missing **or** Supabase auth is unavailable, the app still works — use the **Bypass buttons** on the login screen to log in instantly as Platform Owner, Team Leader, or Member (toggle **Mock Data** to seed rich testing data). Note: `.env` files are git-ignored, so for Vercel you set these variables in the dashboard (see [Deployment](#deployment)), never by committing them.

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start    # serves the built dist/ — there is no "preview" script
```

---

## Roles

| Role | Access |
|---|---|
| **Staff** | Fill and submit own Development Reviews and Quarterly Summaries |
| **Coach / Leader** | View coached staff, fill evaluation tab, approve summaries |
| **Admin** | View all evaluations, bulk sign-off/decline, export PDFs, assign coaches, manage roles |

**The quarterly form and your coach:** you don't need to wait for a coach to start working. As soon as a quarter is unlocked, you can open your Quarterly Summary, fill it in, and save it as a draft at any time. The **"Submit to Coach"** step is the only thing that requires a coach — until then you can keep drafting and saving freely. Your coach is assigned to you by an admin; there is nothing for you to request or approve.

The **first person to register** (while the `users` table is still empty) is
automatically promoted to Admin by a database trigger — no email address is
special-cased. After that, admins grant roles from the **Team Members** tab
(write access is enforced by the `users_admin_update` RLS policy). When an admin
assigns somebody a coach, the `sync_assigned_coach()` trigger marks that coach
`is_leader = true` in the database — leadership is never granted by the client,
and a person can never be set as their own coach.

---

## Testing

```bash
npm run lint                        # tsc --noEmit
npx tsx test/search.test.ts         # 25 assertions over the search helpers
python3 test/audit_i18n.py          # translation dictionary integrity
```

The database rules have their own tests, which need a local PostgreSQL:

```bash
createdb sr_test
psql -v ON_ERROR_STOP=1 -d sr_test -f test/auth-stub.sql
psql -v ON_ERROR_STOP=1 -d sr_test -f supabase-schema.sql
psql -d sr_test -f test/self-assignment-check-direct.sql   # 5/5 pass
psql -d sr_test -f test/self-assignment-check.sql           # trigger + CHECK
dropdb sr_test
```

Applying the schema twice in a row is expected to be clean — that is what makes
it re-runnable on a live project.

Config and test files for Playwright, Cypress and K6 exist in the repository
(`playwright.config.ts`, `cypress/e2e`, `tests/`, `load-test.js`) but those tools
are **not installed as dependencies**, so those commands will not run until you
add them. Browser-level behaviour has otherwise been verified by manual testing —
see [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md).

---

## Deployment

Deployed to Vercel at **https://staff-review-platform.vercel.app/**, on every
push to `main`.

Set the following environment variables in **Vercel → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

No server-side database setup is required on Vercel — Supabase is fully cloud-hosted.

Because both variables are `VITE_`-prefixed, they are compiled into the public
JavaScript bundle. That is expected and safe: the anon key is designed to be
public, and all real protection lives in the database's RLS policies. Never put
the Supabase **service_role** key or any other secret into a `VITE_` variable.

> **Before a deploy lands:** if you changed `supabase-schema.sql`, apply it to
> your Supabase project first (see [docs/PROJECT_GUIDE.md Appendix C](./docs/PROJECT_GUIDE.md#appendix-c-the-one-thing-only-you-can-do)).
> The app reads the database at runtime, so a new build will use the old schema
> until you do.

---

## License

MIT
