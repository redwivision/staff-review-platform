# Asseso — Staff Development Review Platform

A web application for managing quarterly staff reviews, coaching workflows, and leadership evaluations within the Africa Region team.

---

## Overview

Asseso provides a structured framework for staff self-reflection, coach-led evaluations, and administrative oversight across three recurring review cycles per year. It is designed for ministry teams who need a simple, auditable process for tracking personal, relational, and professional growth.

**Live deployment:** [https://redwivision.github.io/staff-review-platform/](https://redwivision.github.io/staff-review-platform/)

---

## Features

- **Quarterly Development Review** — staff self-assess across four areas: Heart, Personal Life, Relational Life, and Ministry Effectiveness
- **Quarterly Summary Form** — staff compile progress on PDP goals, Critical Mission Objectives, and Key Deliverable Assignments
- **Coach Evaluation** — team leaders review and score submitted summaries; evaluations are routed to the admin for approval
- **Admin Dashboard** — view all evaluations, export individual or bulk PDFs, and manage follow-up tasks
- **Coaching Requests** — any member can nominate a coach; coaches accept or decline, and become leaders on acceptance
- **Flexible quarterly form** — fill and save your Quarterly Summary as soon as it's unlocked; you only *submit* it to your coach once they've confirmed the coaching relationship
- **Role-based access** — roles: Staff, Coach/Leader, and Admin
- **Bypass / Demo Mode** — instant one-click login as any role (Platform Owner, Team Leader, or Member) with optional seeded mock data, so you can test any workflow without setting up accounts. Available in all environments (dev and production).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Database | Supabase PostgreSQL |
| PDF Export | jsPDF, html2canvas |
| Animations | Framer Motion |
| Testing | Playwright (E2E), K6 (load) |
| Hosting | Vercel |

---

## Project Structure

```
staff-review-platform/
├── src/
│   ├── components/
│   │   ├── ReviewFormEditor.tsx      # Monthly Development Review form
│   │   ├── SummaryFormEditor.tsx     # Quarterly Summary form (PDP, CMO, KDA, Evaluation)
│   │   ├── AdminReports.tsx          # Admin dashboard with controls and PDF export
│   │   ├── AdminCoachingPanel.tsx    # Admin coaching oversight & approvals
│   │   ├── CoachingInvitations.tsx   # Coach accept/decline incoming requests
│   │   ├── CoachingNominations.tsx   # Staff nominate their coach
│   │   ├── UserManagement.tsx        # Admin role management
│   │   └── ...
│   ├── utils/
│   │   ├── pdfExport.ts              # PDF generation logic
│   │   └── ...
│   ├── supabase.ts                   # Supabase client initialization
│   ├── supabaseDb.ts                 # Data access layer (CRUD + polling subscriptions)
│   ├── dataLayer.ts                  # Unified write layer for forms and actions
│   ├── App.tsx                      # Root component, routing, auth state
│   ├── types.ts                      # TypeScript interfaces
│   └── constants.ts                  # Section definitions, quarter info
├── supabase-schema.sql               # Database schema + RLS policies
└── vite.config.ts                    # Vite build configuration
```

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
npm run preview
```

---

## Roles

| Role | Access |
|---|---|
| **Staff** | Fill and submit own Development Reviews and Quarterly Summaries |
| **Coach / Leader** | View coached staff, fill evaluation tab, approve summaries |
| **Admin** | View all evaluations, export PDFs, manage tasks and user roles |

**The quarterly form and your coach:** you don't need to wait for your coach to start working. As soon as a quarter is unlocked, you can open your Quarterly Summary, fill it in, and save it as a draft at any time. The **"Submit to Coach"** step is the only thing that requires a confirmed coach (admin-approved **and** coach-accepted) — until then you can keep drafting and saving freely.

The email `lewikb13@gmail.com` is auto-promoted to Admin on signup. Any member who accepts a coaching invitation is automatically promoted to Coach/Leader. Admins can promote/demote roles from the **Team Members** tab.

---

## Testing

```bash
# Unit and integration
npm run lint

# E2E (Playwright)
npx playwright test

# Load test (K6)
k6 run load-test.js
```

---

## Deployment

The application is deployed via Vercel on every push to `main`.

Set the following environment variables in **Vercel → Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

No server-side database setup is required on Vercel — Supabase is fully cloud-hosted.

---

## License

MIT
