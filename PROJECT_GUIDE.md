# Asseso — Everything You Need to Know

> This document is your single source of truth. Read it before your presentation.

---

## Table of Contents
1. [What Is This App?](#1-what-is-this-app)
2. [How It Works (Simple Version)](#2-how-it-works-simple-version)
3. [Tech Stack Explained Like You're 10](#3-tech-stack-explained)
4. [System Architecture](#4-system-architecture)
5. [Database Design (Firestore)](#5-database-design)
6. [Frontend Design](#6-frontend-design)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [The Complete User Journey](#8-the-complete-user-journey)
9. [File Map — What Does What](#9-file-map)
10. [Deployment — How It Gets to Vercel](#10-deployment)
11. [How Changes Flow (Git → Vercel → Users)](#11-how-changes-flow)
12. [Environment Variables](#12-environment-variables)
13. [Common Issues & Fixes](#13-common-issues--fixes)
14. [Quick Reference Commands](#14-quick-reference-commands)

---

## 1. What Is This App?

**Asseso** is a staff performance review platform for the Africa Region team. It replaces paper/digital forms with a web app where:

- **Staff members** fill out quarterly self-reviews (Development Reviews) and quarterly summaries
- **Coaches/Team Leaders** evaluate their staff and compile summaries
- **Admins** see everything, generate PDF reports, and use AI to synthesize reviews

Think of it as a digital HR performance review system, purpose-built for a ministry context.

---

## 2. How It Works (Simple Version)

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  STAFF MEMBER │────▶│  COACH / TL     │────▶│    ADMIN     │
│  fills form   │     │  evaluates &    │     │  sees all,   │
│  (self-review)│     │  submits        │     │  exports PDF │
└─────────────┘     └─────────────────┘     └──────────────┘
       │                    │                       │
       ▼                    ▼                       ▼
  ┌─────────────────────────────────────────────────────┐
  │              FIREBASE FIRESTORE (Database)           │
  │  • users/         — who's who                       │
  │  • developmentReviews/ — self-review forms          │
  │  • quarterlySummaries/ — TL evaluation forms        │
  │  • activityLogs/ — edit audit trail                 │
  │  • followUpTasks/ — coaching follow-ups             │
  │  • coachingRequests/ — coach nomination workflow    │
  │  • meetings/ — scheduled meetings                   │
  └─────────────────────────────────────────────────────┘
```

**The two main forms:**

| Form | Who fills it | What it captures |
|------|-------------|-----------------|
| **Development Review** | Staff member | Self-reflection on 4 areas: Heart, Personal Life, Relational Life, Ministry Effectiveness |
| **Quarterly Summary** | Staff + Coach | General info, Personal Dev Plan, Critical Objectives (CMO), Key Assignments (KDA), TL Evaluation |

---

## 3. Tech Stack Explained

| Technology | What It Does | Why It Matters |
|-----------|-------------|----------------|
| **React 19** | Builds the user interface (buttons, forms, pages) | Everything the user sees and clicks |
| **TypeScript** | JavaScript with type safety — catches errors before they happen | Prevents bugs like "undefined is not a function" |
| **Vite** | Dev server + build tool — makes development fast | When you run `npm run dev`, Vite is what starts |
| **Tailwind CSS 4** | Utility-first CSS framework — styles everything | All the colors, spacing, layouts come from here |
| **Firebase Auth** | Handles login/signup | Users sign in with email + password |
| **Firebase Firestore** | Cloud database (NoSQL) | All data lives here — reviews, users, logs |
| **Express.js** | Backend API server | Only used for one thing: the AI synthesis endpoint |
| **Google Gemini AI** | Generates AI-powered review synthesis | Admin can generate a 1-page AI summary of evaluations |
| **jsPDF** | Generates PDF files in the browser | "Export to PDF" button |
| **Motion** | Animation library | Smooth transitions between views |
| **Lucide React** | Icon library | All the little icons (User, Save, Heart, etc.) |

### How They Connect
```
User's Browser
    │
    ├── React + Vite (UI) ──────── reads/writes ────▶ Firebase Firestore (data)
    │                                                     │
    │                                                     ├── /users
    │                                                     ├── /developmentReviews
    │                                                     ├── /quarterlySummaries
    │                                                     ├── /activityLogs
    │                                                     ├── /followUpTasks
    │                                                     ├── /coachingRequests
    │                                                     └── /meetings
    │
    └── Express Server (only for AI) ── calls ──▶ Google Gemini API
```

---

## 4. System Architecture

### Single-Page Application (SPA)
The entire app is ONE HTML page (`index.html`). React handles all the "navigation" by showing/hiding different components based on state. There are no separate HTML pages.

### State-Driven Navigation
```
currentTab state:
  "my-reviews"  → Staff member sees their own reviews
  "team-reviews" → Coach sees their coached staff
  "admin"       → Admin dashboard (with sub-tabs: tracking, control, users)
  "meetings"    → Meeting scheduler
```

### Real-Time Updates
The app uses Firestore's `onSnapshot()` — this means when data changes in the database, every connected user's screen updates AUTOMATICALLY. No need to refresh.

### Mock Data Mode
There's a toggle for offline/mock data mode (stored in `localStorage`). This is useful when Firebase isn't configured. All data lives in the browser's localStorage instead.

---

## 5. Database Design

### Firestore Collections

#### `users/{uid}`
```json
{
  "uid": "abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "Ministry Coordinator",
  "isLeader": false,
  "isAdmin": false,
  "createdAt": 1700000000000
}
```
- **Document ID** = Firebase Auth UID
- `isLeader` = true means this person can evaluate others
- `isAdmin` = true means full access to everything

#### `developmentReviews/{reviewId}`
```json
{
  "id": "abc123_1st_2025-2026",
  "userId": "abc123",
  "quarter": "1st",
  "year": "2025-2026",
  "status": "Draft" | "Submitted",
  "staffMemberName": "John Doe",
  "ministryAssignment": "Youth Ministry",
  "supervisorName": "Jane Leader",
  "monthsCovered": "July - October 2025",
  "heart": {
    "strengths": ["", "", ""],
    "needsImprovement": ["", "", ""],
    "suggestedActionPoints": ["", "", ""]
  },
  "personalLife": { ... },
  "relationalLife": { ... },
  "ministryEffectiveness": { ... },
  "updatedAt": 1700000000000,
  "lastUpdatedBy": "Team Member",
  "leaderSectionComments": {}
}
```
- **Document ID pattern:** `{userId}_{quarter}_{year}` — ensures one review per person per quarter
- Each of the 4 quadrants has 3 sub-fields, each with 3 text inputs = 36 total fields

#### `quarterlySummaries/{summaryId}`
```json
{
  "id": "abc123_1st_2025-2026_summary",
  "userId": "abc123",
  "status": "Draft" | "Submitted" | "CoachSubmitted" | "Declined",
  "coachUid": "coach_uid_here",
  "coachName": "Coach Name",
  "quarter": "1st",
  "year": "2025-2026",
  "staffName": "John Doe",
  "teamLeaderName": "Jane Leader",
  "dateJoinedStaff": "2018",
  "reviewerNamePosition": "",
  "supervisedBySince": "2022",
  "presentPositionSince": "2023",
  "position": "Ministry Coordinator",
  "date": "2025-09-15",
  "suggestions": ["", ""],
  "pdp": { "heart": {...}, "personalLife": {...}, "relationalLife": {...} },
  "cmo": [ { "objective": "", "desiredResult": "" }, ... ],
  "kda": [ { "assignment": "" }, ... ],
  "evaluation": {
    "overallEffectiveness": "One of the best" | "Satisfactory" | "Ineffective",
    "strengths": ["", "", ""],
    "weaknesses": ["", "", ""],
    "lackConfidence": "",
    "readyForGreaterResp": "Yes" | "No",
    "recommendReassignment": "Yes" | "No",
    "teamLeaderSignature": "",
    ...
  },
  "additionalComments": "",
  "updatedAt": 1700000000000
}
```
- **Document ID pattern:** `{userId}_{quarter}_{year}_summary`
- `coachUid` / `coachName` tracks which coach is evaluating this summary
- `status` workflow: `Draft` → `Submitted` (by staff) → `CoachSubmitted` (by coach) → `Declined` (by admin, sends back)

#### `activityLogs/{logId}`
```json
{
  "id": "unique_id",
  "userId": "staff_uid",
  "staffName": "John Doe",
  "editedBy": "Jane Leader",
  "editorUid": "leader_uid",
  "activityType": "review" | "summary",
  "quarter": "1st",
  "year": "2025-2026",
  "action": "Draft Saved",
  "timestamp": 1700000000000
}
```

#### `coachingRequests/{requestId}`
```json
{
  "id": "req_memberUid_coachName",
  "memberId": "staff_uid",
  "memberName": "John Doe",
  "coachName": "Jane Leader",
  "status": "pending" | "approved" | "rejected",
  "acceptedByCoach": "pending" | "accepted" | "rejected",
  "coachUid": "leader_uid"
}
```
- This is the coaching nomination workflow: Staff nominates a coach → Admin approves → Coach accepts

#### `followUpTasks/{taskId}`
- Tracks coaching follow-up progress for each staff member's review quadrants
- Auto-generated from review progress, can be manually overridden by admins

#### `meetings/{meetingId}`
- Scheduled coaching/review meetings

#### `requirementSettings/{settingsId}`
- Admin-configurable settings for which review sections are mandatory

### Data Relationships
```
users (uid)
  ├── developmentReviews (userId = user.uid)     — 1 user has many reviews
  ├── quarterlySummaries (userId = user.uid)     — 1 user has many summaries
  ├── activityLogs (userId = user.uid)           — audit trail
  └── coachingRequests (memberId = user.uid)     — coaching relationships

quarterlySummaries
  └── coachUid → users.uid                      — links summary to its coach
```

---

## 6. Frontend Design

### Component Hierarchy
```
App.tsx (monolithic — 5,485 lines)
├── Auth Screen (login/signup)
├── Main Dashboard
│   ├── Tab: "My Quarterly Reviews" (staff view)
│   │   ├── ReviewCard (clickable)
│   │   └── SummaryCard (clickable)
│   ├── Tab: "Team Evaluation Center" (coach view)
│   │   ├── Staff list with coached members
│   │   └── Summary cards for each staff
│   ├── Tab: "Access Directory (Admin)"
│   │   ├── Sub-tab: "tracking" — Follow-up tasks
│   │   ├── Sub-tab: "control" — Admin reports & scheduling
│   │   └── Sub-tab: "users" — User role management
│   └── Tab: "Meetings"
├── ReviewFormEditor (modal)     — The Development Review form
├── SummaryFormEditor (modal)    — The Quarterly Summary form
├── AdminReports (modal)         — Admin report view + AI synthesis
├── AdminCoachingPanel (modal)   — Coaching oversight
├── CoachingNominations (modal)  — Staff nominate coaches
├── CoachingInvitations (modal)  — Coach accept/reject
├── UserManagement               — Role management
├── ActivityLog                  — Audit trail view
└── PDF Export                   — jsPDF generation
```

### The Two Main Forms (Form Editors)

#### ReviewFormEditor (Development Review)
- **5 tabs:** Header → Heart → Personal Life → Relational Life → Ministry Effectiveness
- Each quadrant has: Strengths (3 fields) + Needs Improvement (3 fields) + Suggested Actions (3 fields)
- Progress bar shows completion percentage
- Staff fills this out; leaders can view and add section comments

#### SummaryFormEditor (Quarterly Summary)
- **6 tabs:** General & Suggestions → PDP → CMO → KDA → TL Evaluation → Additional Comments (3rd quarter only)
- Staff fills tabs 1-4 (PDP, CMO, KDA, Suggestions)
- Coach fills tab 5 (TL Evaluation)
- Tab 6 is only for 3rd quarter

### Styling
- **Tailwind CSS** — utility classes directly in JSX (e.g., `className="bg-slate-50 rounded-xl p-5"`)
- **Dark mode** — toggled via a button, uses Tailwind's `dark:` prefix
- **Responsive** — grid layouts adapt: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Motion** — page transitions and animations via `motion/react`

---

## 7. User Roles & Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Staff Member** | Fill own reviews, fill own summaries, submit to coach, nominate coaches | See others' reviews, evaluate anyone |
| **Coach/Team Leader** | See coached staff's summaries, fill TL Evaluation, submit to admin, schedule meetings | Modify staff's self-review quadrants (read-only) |
| **Admin** | See everything, manage users, generate PDFs, AI synthesis, decline evaluations, manage follow-ups | — (full access) |

### How Roles Work
- `isLeader` flag on user profile → unlocks coach/leader features
- `isAdmin` flag OR email = `lewikb13@gmail.com` → unlocks admin features
- Firestore security rules enforce these permissions at the database level

### Coaching Workflow
1. Staff member goes to "My Coaches" and nominates someone by name
2. Admin sees the request in the Admin Coaching Panel and approves it
3. The nominated coach gets an invitation and accepts/rejects
4. Once accepted, the coach can see that staff member's summaries

---

## 8. The Complete User Journey

### Staff Member Flow
1. **Sign up** → email + password + name + role
2. **My Quarterly Reviews** tab shows their reviews and summaries
3. Click **"New Review"** → opens ReviewFormEditor → fill out the 4 quadrants → Save
4. Click **"New Summary"** → opens SummaryFormEditor → fill Section 1 (General Info) + tabs 2-4 (PDP, CMO, KDA) → Save
5. Click **"Submit to Coach"** → locks the form, sends to their coach

### Coach Flow
1. **Team Evaluation Center** tab shows staff they're coaching
2. Click on a staff member's summary → fills out **TL Evaluation** tab (tab 5)
3. Clicks **"Submit to Admin"** → locks evaluation, sends to admin

### Admin Flow
1. **Access Directory** → "control" sub-tab
2. Sees all submitted evaluations in a grid
3. Can **Export to PDF** (single or bulk)
4. Can click **"AI Synthesize"** to generate a 1-page AI summary via Gemini
5. Can **Decline** evaluations (with reason) → sends back to coach for corrections
6. **"users"** sub-tab → manage who is a leader, who is an admin

---

## 9. File Map

```
staff-review-platform/
├── src/
│   ├── App.tsx                    ← THE main file (5,485 lines, monolithic SPA)
│   ├── main.tsx                   ← React entry point (renders App)
│   ├── firebase.ts                ← Firebase initialization + config
│   ├── types.ts                   ← TypeScript interfaces (all data shapes)
│   ├── constants.ts               ← Review sections, quarter info
│   ├── utils.ts                   ← Helper functions (create reviews, calculate progress)
│   ├── index.css                  ← Global styles + Tailwind
│   ├── components/
│   │   ├── ReviewFormEditor.tsx   ← Development Review form (4 quadrants)
│   │   ├── SummaryFormEditor.tsx  ← Quarterly Summary form (6 tabs) ★ WE EDITED THIS
│   │   ├── AdminReports.tsx       ← Admin report dashboard + AI synthesis ★ WE EDITED THIS
│   │   ├── AdminCoachingPanel.tsx ← Coaching oversight for admins
│   │   ├── ActivityLog.tsx        ← Audit trail view
│   │   ├── CoachingInvitations.tsx← Coach accept/reject
│   │   ├── CoachingNominations.tsx← Staff nominate coaches
│   │   └── UserManagement.tsx     ← Admin role management
│   └── utils/
│       └── pdfExport.ts           ← PDF generation ★ WE EDITED THIS
├── server.ts                      ← Express server (only for Gemini AI endpoint)
├── index.html                     ← Single HTML shell
├── package.json                   ← Dependencies + scripts
├── vite.config.ts                 ← Vite build config
├── tsconfig.json                  ← TypeScript config
├── firebase.json                  ← Firebase project config
├── firestore.rules                ← Database security rules
├── firebase-blueprint.json        ← Data schema documentation
├── .env.example                   ← Environment variable template
└── .gitignore                     ← Files excluded from git
```

---

## 10. Deployment

### Current Setup
- **GitHub repo:** `https://github.com/redwivision/staff-review-platform`
- **Branch:** `main`
- **Hosting:** Vercel (connected to GitHub — auto-deploys on push to `main`)
- **Database:** Firebase Firestore (separate from hosting)
- **Auth:** Firebase Authentication (separate from hosting)

### How Vercel Deployment Works
1. You push code to `main` branch on GitHub
2. Vercel detects the push automatically
3. Vercel runs `npm run build` → creates `dist/` folder
4. Vercel deploys the static files to its CDN
5. Your live site updates (usually takes 30-60 seconds)

### Build Process
```bash
npm run build
# This runs TWO commands:
# 1. vite build          → builds React frontend → dist/
# 2. esbuild server.ts   → bundles Express server → dist/server.cjs
```

### Important Note About the Server
The Express server (`server.ts`) is **only used for the Gemini AI endpoint**. The main app is purely client-side (React + Firebase). On Vercel, the server isn't actually used — the AI synthesis might work differently in production (or may not be deployed at all if Vercel is set up for static hosting only).

---

## 11. How Changes Flow

```
You edit code locally
    │
    ▼
git add . && git commit -m "your message"
    │
    ▼
git push origin main
    │
    ▼
GitHub receives the push
    │
    ▼
Vercel detects the change → triggers build
    │
    ▼
Build succeeds? → Deployed to production URL
Build fails? → Vercel shows error, site unchanged
```

**To test locally before pushing:**
```bash
npm install          # install dependencies (first time only)
npm run dev          # starts local dev server on http://localhost:3000
```

---

## 12. Environment Variables

These are secrets that the app needs but shouldn't be in the code:

| Variable | Purpose | Where to Set |
|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase auth | Vercel dashboard → Settings → Environment Variables |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth | Vercel dashboard |
| `VITE_FIREBASE_PROJECT_ID` | Firebase auth | Vercel dashboard |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase auth | Vercel dashboard |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase auth | Vercel dashboard |
| `VITE_FIREBASE_APP_ID` | Firebase auth | Vercel dashboard |
| `VITE_FIREBASE_DATABASE_ID` | Firestore database ID | Vercel dashboard |
| `GEMINI_API_KEY` | AI synthesis | Vercel dashboard (server-side only) |

**IMPORTANT:** Variables prefixed with `VITE_` are exposed to the browser. All others are server-side only.

---

## 13. Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| App shows blank white screen | Missing env vars or build error | Check Vercel build logs, ensure env vars are set |
| Login doesn't work | Firebase config wrong | Verify env vars match Firebase project settings |
| Changes not showing on live site | Build might have failed | Check Vercel dashboard → Deployments → see build log |
| `npm run dev` fails | Missing `node_modules` | Run `npm install` first |
| TypeScript errors | Code changes broke types | Run `npm run lint` to check |
| Firestore permission denied | Security rules blocking | Check `firestore.rules` — user might not have the right role |

---

## 14. Quick Reference Commands

```bash
# First time setup
npm install

# Development (local testing)
npm run dev                  # Starts on http://localhost:3000

# Type checking (find errors without running)
npm run lint                 # Runs tsc --noEmit

# Build for production
npm run build                # Creates dist/ folder

# Start production server locally
npm run start                # Runs the built server on port 3000

# Clean build artifacts
npm run clean                # Removes dist/ folder

# Git workflow
git status                   # See what files changed
git add .                    # Stage all changes
git commit -m "message"      # Commit with message
git push origin main         # Push to GitHub → triggers Vercel deploy
```

---

## Appendix: What We Changed (The Review Comment Fix)

The review comment said: "From the first information page will include: Date of Joined staff, In position since (month/year), Reviewer Name, Supervised by current team leader since (month/year)"

**These fields already existed** but were poorly labeled and organized. We redesigned Section 1 of the Quarterly Summary form to be crystal clear:

### Before
- 7 flat fields in a grid, no grouping
- Labels like "Supervised By TL Since (Mo/Yr)" — confusing abbreviations
- No hint text explaining what to enter

### After
- **3 visual cards** with icons and headers:
  1. **Staff Identity** — Staff Name, Team Leader Name, Reviewer Name & Position
  2. **Role & Timeline** — Current Position, Date Joined Staff, In Present Position Since, Supervised By Current Team Leader Since, Date Completed
  3. **Staff Suggestions** — Suggestion 1, Suggestion 2
- **Every field has hint text** (e.g., "Month/Year when the current Team Leader started supervising")
- **No abbreviations** — "TL" → "Team Leader"
- **Consistent labels** across the form, admin reports, and PDF export

### Files Changed
1. `src/components/SummaryFormEditor.tsx` — Redesigned header tab
2. `src/components/AdminReports.tsx` — Updated admin report labels
3. `src/utils/pdfExport.ts` — Updated PDF export labels
