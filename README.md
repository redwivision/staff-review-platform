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
- **Admin Dashboard** — view all evaluations, generate AI-synthesized staff reports, export individual or bulk PDFs, and manage follow-up tasks
- **Coaching Requests** — any member can nominate a coach; coaches accept or decline, and become leaders on acceptance
- **Role-based access** — roles: Staff, Coach/Leader, and Admin
- **Bypass / Demo Mode** — full offline functionality with seeded mock data, no backend required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Database | Supabase PostgreSQL |
| AI Integration | Google GenAI (Gemini) |
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
│   │   ├── CoachingRequests.tsx      # Coach nomination and approval workflow
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

Get these from **Supabase Dashboard → Settings → API**. If the `.env` file is missing, the app runs in Bypass / Demo Mode with seeded mock data in localStorage.

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
| **Admin** | View all evaluations, export PDFs, generate AI reports, manage tasks and user roles |

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
