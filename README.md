# Africa Region Staff Quarterly Review Platform
### System Architecture & Technical Documentation

This interactive digital portal optimizes and manages the staff development review process for National Ministries in the Africa Region. It transitions a traditionally manual, offline, or highly disjointed process (previously conducted via separate Word/PDF forms or complex Google Forms) into a single, unified, real-time application.

The codebase strictly adheres to the structure, questions, and action-plan parameters found in the original **Staff Quarterly Development forms** (Team Member Copy, Team Leader Copy, and Summary Form).

---

## 1. System Vision & User Roles

The platform supports three tiers of accessibility, governed by database metadata and verified securely via Google Firebase Authentication:

### A. Team Member (Staff)
* **Default Status:** Every newly signed-up user is initialized as a Team Member.
* **Responsibilities:**
  * Complete their individual quarterly **Development Review Form** (assessing Heart, Personal Life, Relational Life, and Ministry Effectiveness quadrants).
  * Access scheduled feedback meetings with their supervisors.
  * Synchronize meetings directly to their **Google Calendar** via custom dynamic templates.
  * View finalized evaluation summaries compiled by their Team Leaders (View-Only mode for accountability).

### B. Team Leader
* **Responsibilities:**
  * Edit or view their assigned staff members' Development Review forms to guide discussion.
  * Compile, refine, and sign off the official **Quarterly Review Summary Forms** for each quarter.
  * Schedule interactive feedback sessions that instantly update onto the respective staff member's live dashboard.

### C. Platform Owner (`lewikb13@gmail.com`)
* **Exclusive Powers:**
  * Access the **User Access Control Directory** (Admin tab).
  * Manually promote any registered staff member to a **Team Leader**, or demote them.
  * The owner is automatically hardcoded as a Team Leader in Firestore security rules to ensure they can fully test and manage all roles.

---

## 2. Directory Structure & Key Code Modules

```
├── .env.example                  # Documents required runtime secret bindings (GEMINI_API_KEY, APP_URL)
├── firebase-blueprint.json       # Blueprint mapping Firestore entity schemas and security criteria
├── firestore.rules               # Production-ready Cloud Firestore access policy
├── metadata.json                 # Core application configuration, frames, and capabilities
├── package.json                  # Manages Vite, React, Tailwind CSS, Express, and Firebase dependencies
├── tsconfig.json                 # TypeScript compiler specifications
├── vite.config.ts                # Vite build engine configuration
├── src/
│   ├── main.tsx                  # Primary React mounting entry point
│   ├── App.tsx                   # Master application hub (Auth routing, Dashboards, Modals, Calendar sync)
│   ├── firebase.ts               # Firebase App, Authentication, and Multi-Database client instance
│   ├── types.ts                  # Shared type definitions mapping form structures
│   ├── constants.ts              # Canonical content of the quadrants (bullets, self-reflection guide questions)
│   ├── utils.ts                  # Clean initializers for new review/summary records
│   ├── index.css                 # Global CSS styles including Google Font imports and Tailwind configurations
│   └── components/
│       ├── ReviewFormEditor.tsx  # Fully featured, multi-tab quadrants editor
│       ├── SummaryFormEditor.tsx # Comprehensive summary form with exact PDP, CMO, and KDA mappings
│       └── UserManagement.tsx    # Administrator user access and role promotion directory
```

---

## 3. Data Flow & Database Schema

The database relies on **Google Cloud Firestore** for durable cloud persistence. It uses three major collections:

### A. `/users` (Schema: `UserProfile`)
Stores the profiles of registered staff and administrators.
```typescript
interface UserProfile {
  uid: string;         // Unique ID from Firebase Auth
  name: string;        // Staff Full Name
  role: string;        // Organizational Title
  email: string;       // Email Address
  isLeader: boolean;   // Access promotion flag (toggled by owner)
  createdAt: number;   // Timestamp
}
```

### B. `/developmentReviews` (Schema: `DevelopmentReview`)
Captures the core quadrants of the Development Review. Its Document ID is structured as `${userId}_${quarter}_2025-2026` to prevent duplicates and enable rapid lookups.
```typescript
interface DevelopmentReview {
  id: string;
  userId: string;
  quarter: "1st" | "2nd" | "3rd";
  year: string; // e.g., "2025-2026"
  status: "Draft" | "Submitted";
  staffMemberName: string;
  ministryAssignment: string;
  supervisorName: string;
  monthsCovered: string;
  heart: ReviewSectionData;
  personalLife: ReviewSectionData;
  relationalLife: ReviewSectionData;
  ministryEffectiveness: ReviewSectionData;
  updatedAt: number;
  lastUpdatedBy: string;
}
```

### C. `/quarterlySummaries` (Schema: `QuarterlySummary`)
Stores the compiled evaluation summaries, reflecting the official **Quarterly Review Summary Form**. The Document ID is structured as `${userId}_${quarter}_2025-2026_summary`.
* **1st Quarter:** Defines goals and priorities.
* **2nd Quarter:** Evaluates "Progress Made" and "Changes Needed" columns.
* **3rd Quarter:** Integrates standard ratings (`S` Satisfactory, `O` Outstanding, `NI` Needs Improvement), next steps, and supervisor additional comments.
* **Evaluation Section (All Quarters):** Allows Team Leaders to rate overall effectiveness, list top 3 strengths/weaknesses, address confidence issues, suggest reassignment, and sign off.

---

## 4. Security Rules Architecture (`firestore.rules`)

To prevent unauthorized read/write breaches:
1. **Authenticated Access:** All operations require a valid Firebase Auth credentials context.
2. **Read Controls:** Users can read *only* their own reviews and summaries. Team Leaders can read *all* documents.
3. **Write Controls:**
   - Members can modify *only* their own `developmentReviews` when they are in `Draft` state.
   - Leaders can edit *all* development forms and are the *sole* users permitted to write to `/quarterlySummaries`.
   - Access promotion on `/users` can only be performed by the platform owner (`lewikb13@gmail.com`).

---

## 5. Key Integrations & Dynamic Features

### Google Calendar Synchronization
The feedback meeting scheduler dynamically generates Google Calendar event URLs, encoding specific meeting attributes directly:
```typescript
const text = encodeURIComponent(`Quarterly Development Review (${meeting.quarter} Quarter) - Feedback Session`);
const formattedDate = meeting.date.replace(/-/g, "");
const formattedTime = meeting.time.replace(/:/g, "");
// Generates deep links for immediate calendar saving:
const link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&sf=true&output=xml`;
```

---

## 6. PDF Export & Official Documentation (v1)

The platform features a high-fidelity PDF generation engine (`src/utils/pdfExport.ts`) built with `jsPDF` that compiles review data into highly polished, print-ready documents. 

### A. Default Export (v1 of the PDF Export)
By default, the PDF focuses strictly on the **Team Leader (TL) Evaluation** and quarterly summary metrics. This includes:
* **Full Staff & Coach Profiles:** Automatically maps staff role position, date joined, date completed, quarter/year, supervisor, assigned coach, reviewer name, and current form status.
* **Core Performance Quadrants (PDP, CMO, KDA):** Focuses on Personal Development Plan reviews, Critical Mission Objectives (with achievement badges), and Key Development Assignments.
* **The TL Performance Assessment:** Compiles the supervisor's overall effectiveness evaluation rating (Outstanding, Satisfactory, Ineffective), Core Competencies & Top 3 Strengths, Areas for Improvement, Growth Warning/Confidence Gap notes, and specific Career Track or placement recommendations.

### B. Admin-Level Governance & Responsibility
The **Admin (Platform Administrator / National Director)** holds ultimate responsibility and controls what gets generated and certified on the PDF:
1. **Data Custody:** While the Team Leader compiles the initial assessment details, the Admin is responsible for reviewing and verifying the contents before they are published.
2. **Dynamic Sign-Off:** The PDF dynamically adjusts its validation blocks. If the Admin has reviewed and signed off on the document inside the platform, an official **"ADMINISTRATOR REVIEW SIGN-OFF"** stamp, alongside their custom digital name and date stamp, is embedded directly onto the PDF. Without this, the PDF reflects a pending/awaiting sign-off state.
3. **Configuration Power:** The Admin manages global submission parameters (controlling which quadrants must be complete before submission) and can configure quarterly deadlines, ensuring strict control over the input quality that ultimately populates the generated document.

---

## 7. How to Build & Deploy

### Development Mode
Boot the lightning-fast Vite development server:
```bash
npm run dev
```

### Production Build & Compilation
Compile the frontend code and bundles:
```bash
npm run build
```
This prepares a production-ready client bundle inside the `/dist` directory. All TypeScript code is strictly checked against strict compiler rules to guarantee zero runtime failures.
