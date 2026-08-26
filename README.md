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
- **Coaching Requests** — staff can nominate a coach; coaches accept or decline
- **Onboarding Tour** — guided walkthrough on first login
- **Role-based access** — four roles: Staff, Team Leader, Admin, and Super Admin
- **Demo / Bypass Mode** — full offline functionality with seeded mock data, no Firebase required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend / Auth | Firebase Authentication |
| Database | Cloud Firestore |
| AI Integration | Google GenAI (Gemini) |
| PDF Export | jsPDF, html2canvas |
| Animations | Framer Motion |
| Onboarding | intro.js |
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
│   │   ├── OnboardingTour.tsx        # First-login guided tour
│   │   └── ...
│   ├── utils/
│   │   ├── pdfExport.ts              # PDF generation logic
│   │   └── ...
│   ├── App.tsx                       # Root component, routing, auth state
│   ├── firebase.ts                   # Firebase initialization
│   ├── types.ts                      # TypeScript interfaces
│   └── constants.ts                  # Section definitions, quarter info
├── firestore.rules                   # Firestore security rules
├── firebase.json                     # Firebase project configuration
└── vite.config.ts                    # Vite build configuration
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/redwivision/staff-review-platform.git
cd staff-review-platform
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_ID=your_firestore_database_id
```

> In **Bypass / Demo Mode** (no `.env` file), the app runs fully offline with seeded mock data. Firebase is optional.

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
| **Team Leader** | View coached staff, fill TL Evaluation tab, approve summaries |
| **Admin** | View all evaluations, export PDFs, generate AI reports, manage tasks |
| **Super Admin** | All admin capabilities plus user role management |

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

Firestore security rules must be deployed separately from the Firebase Console:

1. Go to Firebase Console → Firestore → Rules
2. Paste the contents of `firestore.rules`
3. Click **Publish**

---

## License

MIT
