# Learn Software Engineering With Asseso

> This guide does two jobs at once:
> 1. It teaches you **software engineering and web development** from the ground up.
> 2. It uses **Asseso** (the real app in this folder) as the live, working example
>    we study as we learn.
>
> You don't need to know any programming to start. You learn by doing — and this
> project is a real app with real users, real security, and real deployment. That's
> the best kind of classroom.

---

## How To Use This Guide

Think of it like a course, not a reference book. It has **Parts** (A–E). Each Part
has **concepts** (explained simply), **concrete examples from our code**, and a short
**"Try It"** exercise. Read them in order the first time. After that, use the
**Quick-Reference Appendix** at the end for things like commands.

**A quick warning before you start:** some parts of this app intentionally use
special jargon (PDP, CMO, KDA, TL). That's a requirement from the client — it's their
real HR vocabulary. Don't be scared of the words; they're just labels on forms.

---

## Table of Contents

**Part A — The Mindset (What IS software engineering?)**
- [A1. What software engineering really is](#a1-what-software-engineering-really-is)
- [A2. The app in one sentence](#a2-the-app-in-one-sentence)
- [A3. Vocabulary cheat sheet](#a3-vocabulary-cheat-sheet)

**Part B — Web Fundamentals (the tech behind Asseso)**
- [B1. How the web works](#b1-how-the-web-works)
- [B2. The three sides of a web app](#b2-the-three-sides-of-a-web-app)
- [B3. Your exact tech stack, explained](#b3-your-exact-tech-stack-explained)

**Part C — Inside This Codebase (a guided tour)**
- [C1. Reading a project folder](#c1-reading-a-project-folder)
- [C2. The main file (App.tsx)](#c2-the-main-file-apptsx)
- [C3. The database design](#c3-the-database-design)
- [C4. The two important forms](#c4-the-two-important-forms)
- [C5. How authentication works](#c5-how-authentication-works)
- [C6. How permissions work (who can do what)](#c6-how-permissions-work-who-can-do-what)

**Part D — The Engineering Process (how real projects run)**
- [D1. Version control with Git](#d1-version-control-with-git)
- [D2. Deployment (getting it live)](#d2-deployment-getting-it-live)
- [D3. Testing like an engineer](#d3-testing-like-an-engineer)
- [D4. Security — why it matters and what we did](#d4-security--why-it-matters-and-what-we-did)
- [D5. Scaling to many users (weak wifi included)](#d5-scaling-to-many-users-weak-wifi-included)

**Appendix (reference — keep these handy)**
- [Appendix A. Full file map](#appendix-a-full-file-map)
- [Appendix B. Commands you'll use](#appendix-b-commands-youll-use)
- [Appendix C. The ONE thing only you can do](#appendix-c-the-one-thing-only-you-can-do)
- [Appendix D. Common issues & fixes](#appendix-d-common-issues--fixes)
- [Appendix E. Known limitations (honest review)](#appendix-e-known-limitations-honest-review)
- [Appendix F. Scaling to a large roster (5,000 users)](#appendix-f-scaling-to-a-large-roster-5000-users)

---

# PART A — THE MINDSET

## A1. What software engineering really is

A common myth: "software engineering is writing lots of code." It's not. Code is only
a small part. Software engineering is:

> **Turning a real-world problem into a reliable solution that real people can use —
> and keeping that solution working and safe as it grows.**

An engineer mostly does these things, in a loop:

1. **Understand the problem.** What does the user actually need?
2. **Design a solution.** What parts do we need? How do they fit together?
3. **Build it.** Write code, in small pieces.
4. **Test it.** Does it do the right thing? Does it break?
5. **Ship it.** Get it to real users.
6. **Keep it running.** Fix bugs, make it faster, keep it secure, handle more users.

You'll see **all six steps done for real** in this project. That's what makes Asseso a
great thing to learn from — it's not a toy. It went through all of it.

---

## A2. The app in one sentence

**Asseso is a website that replaces paper performance-review forms** for a staff
team, so staff fill out reviews online, team leaders evaluate them, and admins see
everything and export PDF reports.

That one sentence already tells us the **users and the jobs**:

| Person | Their job in the app |
|--------|---------------------|
| **Staff member** | Fill out their own review forms |
| **Coach / Team Leader** | Evaluate the staff they coach |
| **Admin** | See everything, manage people, make PDF reports |

Most real apps start exactly like this: **"instead of paper, do it on a computer."**
That's a valid product idea. The engineering challenge is making it fast, safe, and
able to handle lots of people.

---

## A3. Vocabulary cheat sheet

Before we go further, here are the words you'll keep seeing, in plain English:

| Word | Plain meaning |
|------|---------------|
| **Frontend** | Everything the user sees and clicks (the "visible part") |
| **Backend** | The part that stores/manages data and enforces rules (the "engine room") |
| **Database** | A place that stores data so it can be read and changed reliably |
| **API** | A set of rules for how software talks to other software |
| **Client** | The browser/app on the user's device |
| **Server** | A computer "in the cloud" that runs code and stores data |
| **Deploy** | Publish your app so real users can reach it |
| **Bug** | A mistake in the code that makes it behave wrongly |
| **Repo / Repository** | A folder that stores your code and its full history |

You don't need to memorize these. They'll make sense as you see them in action.

---

# PART B — WEB FUNDAMENTALS

## B1. How the web works

When you open a website, three things happen, in order:

1. **Your browser asks a server** for the page ("give me this website").
2. **The server sends back the files** (HTML, CSS, JavaScript).
3. **Your browser runs those files** to draw the page on your screen.

With an old-style website (called a "multi-page app"), the server sends a whole new
HTML page every time you click something. That's slow because the browser re-downloads
and redraws everything.

Asseso is a different, more modern kind: a **Single-Page Application (SPA)**.
- The browser downloads **one** main page at the start.
- After that, React (the frontend library) **swaps parts of the page in and out**
  instantly without re-downloading anything.
- It feels like a smooth app instead of a clicky website.

That's why our `index.html` is tiny (less than 1 KB) — it's just a shell. Everything
else is JavaScript that runs in the browser.

### Try It
Open `index.html` in this folder. Notice it barely contains anything. Then look at
`src/main.tsx` — it's the actual starting point: it grabs the `<div id="root">` from
the HTML and tells React "render the whole app here."

---

## B2. The three sides of a web app

Almost every web app has three parts. Asseso has all three:

```
┌─────────────────────┐
│  1. FRONTEND        │   React + TypeScript + Vite + Tailwind
│   (what users see)  │   Lives in ./src  — runs in the browser
└──────────┬──────────┘
           │ reads / writes data (secrets hidden)
           ▼
┌─────────────────────┐
│  2. BACKEND         │   Supabase (a "Backend-as-a-Service")
│   (data + rules)    │   PostgreSQL database + Auth + Row-Level Security
└─────────────────────┘
```

An important pattern to learn: **separation of concerns.** Each part has one job, and
they talk through clear interfaces (the Supabase API). Keeping them separate makes the
app easier to understand, test, and change.

> **A real "backend" note:** Most apps use a backend you write yourself (like the
> Express.js server you'll see). Asseso mostly uses **Supabase** as its "backend,"
> which means the database, login system, and security rules are all provided by a
> cloud service. That's a very common modern approach — it saves a ton of work. The
> small Express server just serves the app files for local development (Vercel hosts
> the live site directly, so the Express server isn't used in production).

---

## B3. Your exact tech stack, explained

A "tech stack" is just the list of technologies a project uses. Here is Asseso's, with
*why each one is there*:

| Technology | What it does | Why it's here |
|-----------|-------------|---------------|
| **React 19** | Builds the user interface | The visible part of the app |
| **TypeScript** | JavaScript with type safety | Catches whole classes of bugs before you even run the app |
| **Vite** | Build tool + dev server | Makes development fast; `npm run dev` starts it |
| **Tailwind CSS 4** | Styling system | All the colors, spacing, rounded corners come from here |
| **Supabase** | Cloud database + auth + security | Where all the real data lives |
| **Supabase Auth** | Login / sign up | Email + password accounts |
| **jsPDF** | Creates PDF files in the browser | The "Export to PDF" button |
| **Motion** | Animation library | Smooth transitions between screens |
| **Lucide React** | Icon library | The little icons (User, Save, Heart…) |
| **Express** | A web server | Serves the app locally for development (`npm run dev`) |

### About TypeScript (this is worth learning well)
TypeScript = JavaScript + **types**. A type describes the shape of your data. When you
write `name: string`, you've told TypeScript "this is text." If you later try to use it
as a number, TypeScript complains **before** the user ever sees it. This turns a whole
category of "mystery bugs" into obvious, early errors.

You can see this in action in `src/types.ts` — that file defines the exact shape of a
"Development Review", a "Quarterly Summary", a "User", etc. The whole rest of the app
trusts those shapes, so when the app says "this is a review," TypeScript knows exactly
what fields a review has.

### How to check your types
```bash
npm run lint     # runs: tsc --noEmit  → "type check, don't create files"
```

---

# PART C — INSIDE THIS CODEBASE

Now we study the actual project. This is the core of learning: **reading real code.**

## C1. Reading a project folder

Open the project folder. Don't be overwhelmed — every file has a purpose. Here's the
mental map:

```
staff-review-platform/
├── src/                 ← THE entire frontend lives here
│   ├── main.tsx         ← entry point (React starts here)
│   ├── App.tsx          ← the main component (the whole app)
│   ├── supabase.ts      ← connects to Supabase
│   ├── supabaseDb.ts    ← talks to the database (data layer)
│   ├── dataLayer.ts     ← the "safe" way writes happen
│   ├── types.ts         ← the shapes of all data (very important)
│   ├── utils/           ← helper functions (like PDF export)
│   └── components/      ← separate, reusable UI pieces
├── server.ts            ← Express server (local dev file server + Vite middleware)
├── index.html           ← the single-page shell
├── supabase-schema.sql  ← the database rules (security + tables)
├── package.json         ← list of packages + the commands
├── vite.config.ts       ← build settings
└── tsconfig.json        ← TypeScript settings
```

**The single most useful skill you can build:** being able to open a project you've
never seen and figure out "what does each file do?" Start by reading `package.json` —
it tells you the commands (`scripts`) and the packages (`dependencies`).

### Try It
Open `package.json` and find the `"scripts"` section. We have commands called `dev`,
`build`, `start`, `lint`, `clean`. Can you guess what each does from its name? Now
check — they match Appendix B at the end of this guide.

---

## C2. The main file (App.tsx)

`App.tsx` is the biggest file (thousands of lines). It is the **top-level component**:
it decides *what screen to show* based on a piece of state called `currentTab`.

Here is the core React idea, and it's the single most important concept in React:

> **The UI is a *function* of your data/state.** When the state changes, the screen
> re-draws to match. You never manually "edit" the page — you change the state and
> React updates the screen for you.

In plain terms: `currentTab` is a variable that says `"my-reviews"` or `"admin"` or
`"meetings"`. Wherever that value is, React shows the matching screen. Clicking a
navigation button *changes* `currentTab`, and React instantly redraws.

```js
// Pseudo-code of the idea (not exact real code):
const currentTab = userClickedOnTab;      // e.g. "admin"
if (currentTab === "admin")  showAdminPanel();
if (currentTab === "meetings") showMeetings();
```

**A note on size:** `App.tsx` is very large. An experienced engineer would probably
split it into smaller files. That's a real lesson: big files are harder to read and
test. This project is honest about that — it's listed in Appendix E as a known
limitation, and we already made it much better for users by *lazy-loading* the
separate components (see D5).

### Reusable components
One of React's superpowers: you write a piece of UI **once** as a "component" and reuse
it. Look in `src/components/`. Each file is one reusable piece:

- `ReviewFormEditor.tsx` — the Development Review form
- `SummaryFormEditor.tsx` — the Quarterly Summary form
- `AdminReports.tsx` — the admin's report screen
- `UserManagement.tsx` — the screen admin uses to change people's roles
- …and more.

### Try It
In `src/App.tsx`, find the string `currentTab`. What controls which tab is shown?
Search for `setCurrentTab(` to see what changes it. This one exercise teaches you how
almost the whole app is wired together.

---

## C3. The database design

The database is PostgreSQL (via Supabase). Think of a database as **a set of
structured tables**, like organized spreadsheets where every row has a fixed list of
columns and every row has a unique `id`.

Here are the main tables. I'll use "shape" notation (id, fields) so you can picture them:

### `users` — who's who
- `uid`, `name`, `email`, `role`, `isLeader`, `isAdmin`, `createdAt`
- `uid` equals the auth login id (ties a login to a profile).

### `development_reviews` — the self-review forms
- `id`, `userId`, `quarter`, `year`, `status`
- Then the four review areas: Heart, Personal Life, Relational Life, Ministry
  Effectiveness. Each area has Strengths / Needs Improvement / Suggested Actions.

### `quarterly_summaries` — the coach evaluation forms
- `id`, `userId`, `status`, `coachUid`, `coachName`, `quarter`, `year`
- Sections: General Info, PDP, CMO, KDA, TL Evaluation.

### Other tables
- `activity_logs` — an **audit trail**: who changed what, and when.
- `coaching_requests` — **retired**. It backed the old "staff nominates, admin
  approves, coach accepts" workflow. The app no longer reads or writes it; the
  table is kept only so historical rows keep their access rules. Live coach
  assignments live in `users.coach_uid` instead.
- `follow_up_tasks`, `meetings`, `requirement_settings` — supporting data.

Be careful: keep the **table names** (`quarterly_summaries`, `development_reviews`)
separate from the **database shapes** (like `quarterlySummaries`). The code often uses
camelCase (`quarterlySummaries`) while the database table uses snake_case
(`quarterly_summaries`). The mapping layer (`supabaseDb.ts`) translates between them.

### Try It
Open `supabase-schema.sql`. It's the *blueprint* for the whole database — run it and
you create every table and every security rule. Skim it. Even if the SQL looks foreign
now, notice how it's just "recipe instructions" telling the database what to build.

---

## C4. The two important forms

The heart of the product is two forms. Understanding these two screens tells you what
the whole product does.

### Development Review (self-review) — `ReviewFormEditor.tsx`
- The **staff member** fills this out about themselves.
- Organized into 4 tabs (Heart, Personal Life, Relational Life, Ministry Effectiveness).
- Shows a progress bar ("how much have you filled in?") — that's computed in code, not
  stored; the app counts filled fields.

### Quarterly Summary (coach evaluation) — `SummaryFormEditor.tsx`
- The **staff member** fills the first sections (personal details, Personal Dev Plan,
  Critical Objectives / CMO, Key Assignments / KDA).
- The **coach** fills the TL Evaluation section.
- Has a status that moves through a workflow: `Draft → Submitted → CoachSubmitted → Declined`.

**Important:** the staff member does **not** have to wait for a coach before they start
their Quarterly Summary. As long as a quarter is *unlocked* (by the admin), they can open
the form, fill it in, and **save as a draft** at any time. The only step that needs a coach
is the final **"Submit to Coach"** button — until then they can keep drafting and saving
freely.

A coach exists as soon as an **admin assigns one**. There is no nomination, no approval,
and no acceptance step.

Admins can assign coaches from two places, both of which write the same `users.coach_uid`
column:

| Where | What it is for |
|---|---|
| **Admin Dashboard → Coach Assignments** (the default tab) | Answering "who still needs a coach?". Lists every staff member with their current coach, a count of unassigned people, and an inline dropdown to assign or clear. |
| **Admin Dashboard → Team Members** | The full access-control table, which also covers roles and admin permissions. |

The Coach Assignments board lives in `src/components/CoachAssignmentBoard.tsx`. In the
code the "do I have a coach" test is the `myHasVerifiedCoach` flag in `App.tsx`, which is
simply "does `users.coach_uid` point at me?", passed into `SummaryFormEditor.tsx` as
`hasVerifiedCoach`.

The database enforces the invariant that nobody coaches themselves in two independent
places: the `trg_sync_assigned_coach` trigger, and the `users_coach_not_self` table-level
`CHECK` constraint. The trigger also promotes a newly assigned coach to leader. The
`CHECK` exists as defence in depth for writers that never fire the trigger.

The word **"status"** here is powerful — it's a **state machine**: the form can only be
in certain states, and only certain transitions are allowed. This is a real software
engineering concept you'll use again and again.

### Try It
Open `src/types.ts`. Find the type for the summary's `status`. What are the allowed
values? Now look at `src/utils.ts` for `calculateReviewProgress` — can you guess how it
turns "some fields filled" into a percentage?

---

## C5. How authentication works

Authentication = **proving who you are** (logging in).

Asseso uses **Supabase Auth**, which handles the tricky parts securely:
- Passwords are **never stored as plain text** — they're hashed (scrambled) so even the
  database owner can't read them.
- Login uses email + password, and Supabase returns a **session token** the app uses to
  prove "I'm logged in as this person."

In the code you'll see functions like `supabaseSignIn` and `supabaseSignUp` in
`supabaseDb.ts`. These are thin wrappers around Supabase's login/signup.

### Why this matters for security
A common beginner mistake is trusting the frontend ("the user said they're admin, so
they are"). **That is unsafe** — anyone can edit a browser's data. The correct rule:

> **The frontend is just a window. The *database* is the one that decides the truth.**

That's why this app reads "am I an admin?" from the *database*, not from something the
browser invented. We'll see this again in C6 and D4.

### Try It
Look at `src/supabase.ts`. Can you see where the app connects to Supabase (the URL and
the anon key)? Note: these come from environment variables, not hard-coded — which is
the secure way (see Appendix D / env variables).

---

## C6. How permissions work (who can do what)

There are three levels of "who can do what":

| Role | In the app |
|------|-----------|
| **Staff Member** | Fill their own reviews and Quarterly Summaries; submit the summary to their coach once one is confirmed |
| **Coach / Team Leader** | Evaluate the staff they coach |
| **Admin** | See everything, manage users, export PDFs, decline evaluations |

There are **two layers of permission**, and both matter:

1. **The UI layer (frontend):** Decide which *buttons and screens* to show. E.g., the
   Admin tab only appears for admins. This is about *looks and convenience*.
2. **The database layer (backend):** Decide whether a request is *allowed*. This is
   called **Row-Level Security (RLS)** and it's in `supabase-schema.sql`. This is the
   layer that actually *enforces* the rules.

Role flags:
- `isLeader` on a user → unlocks coach/leader features. Set automatically when an
  admin assigns that person as somebody's coach.
- `isAdmin` on a user → unlocks admin features. **Only the database decides this.**

And the relationship itself:
- `coachUid` on a user → **who coaches this person.** This single column is the
  source of truth: the database's `is_coach_of()` reads it for RLS, and the app
  reads it to decide who can see whose data. Assign a coach in Team Members and
  that person's access changes immediately.

Here is the key lesson:

> **Always enforce security in the database (RLS), not just in the UI.**
> The UI can be bypassed. The database cannot — well, not without the real keys.

### Try It
Look for the RLS helper functions in `supabase-schema.sql`, like `is_admin_user` and
`is_coach_of`. If you can't follow the SQL yet, that's okay — just notice that *these
functions are the security gate*, and read the plain-English version in D4.

---

# PART D — THE ENGINEERING PROCESS

This is how real projects actually run, and how Asseso was (and is) engineered.

## D1. Version control with Git

Git is a **time machine for your code**. It records every change so you can:
- See what changed and why.
- Go back if you break something.
- Save a "snapshot" (a **commit**) with a message explaining what you did.

Here's the daily rhythm:

```bash
git status            # what has changed?
git diff              # show me the actual changes, line by line
git add .             # "stage" the changes (put them in the box)
git commit -m "..."   # take the snapshot, with a message
git push origin main  # upload to GitHub (which triggers deployment)
```

### Commit messages are communication
A good commit message explains the *why*, not just the *what*. Bad: `"stuff changed"`.
Good: `"Harden admin check so roles come only from the database"`. Future you (and
collaborators) will thank you.

### Try It
Run `git log --oneline -5` in this folder. You'll see the recent history of this
project — real commits describing real work, including the security fixes we'll talk
about in D4.

---

## D2. Deployment (getting it live)

"Deployment" is the process of making your app reachable by real users. For Asseso:

1. You **push** code to GitHub (branch `main`).
2. **Vercel** (the hosting service) notices the push automatically.
3. Vercel runs `npm run build`, which turns your source into a `dist/` folder of
   optimized, ready-to-serve files.
4. Vercel serves those files on the internet — usually live within about a minute.

This "push → auto-build → auto-deploy" setup is called **continuous deployment (CD)**.

```bash
npm run build
# does two things:
#   1. vite build           → builds the React frontend → dist/
#   2. esbuild server.ts    → bundles the Express server → dist/server.cjs
```

### Environment variables
Real secrets (the Supabase URL and anon key, the AI key) are **not** in the code. They
live in Vercel as "environment variables." That way:
- Secrets aren't accidentally uploaded to GitHub.
- Each environment (dev vs. production) can have its own values.

Variables starting with `VITE_` are visible to the browser (that's how the frontend
gets the Supabase keys — it needs them, and the anon key is designed to be public).
Anything else stays server-side only. See Appendix D for the exact list.

### Try It
Find `.env.example` in the folder. Compare it to `src/supabase.ts` — see how the code
reads `import.meta.env.VITE_SUPABASE_URL`? That's how environment variables flow into
the frontend.

---

## D3. Testing like an engineer

Engineers test because users will try things the developer never imagined. There are a
few kinds of testing in the real world:

- **Manual testing:** You click through the app and check it behaves. Fast, but
  humans forget things.
- **Type checking (`npm run lint`):** TypeScript's built-in check. Already catches a
  huge class of bugs.
- **Build test (`npm run build`):** Proves the whole app can compile into something
  shippable. If the build fails, don't deploy.
- **Automated tests:** Code that tests other code (e.g., Playwright, Cypress, k6).
  Not fully set up here yet — noted as future work in Appendix E.

The CLI guide for this project is written in `TESTING_GUIDE.md` — it's your
step-by-step checklist to click through the app and confirm each feature works.

**Engineers' golden rule:** *"If it isn't tested, it's already broken somewhere."*
Before you push, at minimum run both `npm run lint` and `npm run build`.

### Try It
Run both commands:
```bash
npm run lint     # type check — should print nothing (no errors = good)
npm run build    # full build — should succeed
```
If either fails, you've found a bug. That's the job!

---

## D4. Security — why it matters and what we did

Security is about making sure **only the right people can do the right things** with
the data. For a system holding sensitive HR reviews, this is not optional.

When we reviewed this app, we found (and fixed) real problems. This is exactly what a
security review looks like. Here's what we found and what we did — in plain words:

1. **Anyone could read everything and even promote themselves to Admin.**
   The database doors (RLS) weren't locked. → We turned on Row-Level Security and
   wrote rules so a normal user sees only their own data.
2. **"Am I admin?" was decided by the website using an email address.**
   That's forgeable. → Now the database itself decides; only the first user to sign up
   (or an existing admin) gets admin powers.
3. **A user could get promoted to Coach by pretending to approve their own request.**
   → Now self-nomination is rejected and a single user can't approve themself.
4. **If the database hiccupped, the app silently showed "no data."**
   That's dangerous — an admin might think records were deleted. → Now it waits and
   warns instead of quietly pretending everything is fine.
5. **Deletes by coaches were being thrown away.**
   → Now they're recorded so the audit trail (who changed what) actually works.

The security rules all live in **`supabase-schema.sql`**. But here's the crucial
honest bit: **these rules are written, but not yet applied to the live database.** That
can only be done through the Supabase dashboard with an account that owns the project
— which we explain, step by step, in **Appendix C**. Until that's done, the security
rules are inert. This is a perfect real-world example of *the difference between
"written" and "shipped."*

> **Lesson for you:** Security isn't a feature you add at the end. It's a set of rules
> enforced at the data layer, reviewed regularly, and actually applied to production.

---

## D5. Scaling to many users (weak wifi included)

"Scaling" means: *can this keep working when lots of people use it?* A version that
works for 3 users can collapse at 5,000. Things we consider:

**1. Not asking for too much data.**
An early version of the app had every user download ALL the data every 30 seconds.
With thousands of users that's a flood. → We changed it so a normal staff member only
fetches **their own** records, and admins/leaders fetch what they actually need.

**2. Update speed.**
Now the app tries **Supabase Realtime** first (instant push updates), and only falls
back to polling (checking every ~30s) if Realtime isn't enabled. Push is far more
efficient at scale.

**3. Fast initial load — critical on weak wifi.**
This is the one you (the user) specifically asked about. A huge app is painful on
slow wifi. We cut the initial download by almost half:
- **Before:** the whole app (including the PDF generator and every admin screen) was
  one ~1.34 MB file (371 KB when compressed).
- **After:** the first screen only downloads ~735 KB (202 KB compressed). Everything
  else — PDFs, admin panels, forms — is **lazy-loaded**: it only downloads **when a
  user actually opens it**.

This is the **code-splitting / lazy-loading** trick, a standard engineering
performance technique. Professional apps use exactly this to stay fast on mobile and
slow networks.

### Try It
Look at the top of `src/App.tsx` and find `React.lazy` and `Suspense`. That's the
performance trick in action. Now run `npm run build` and look at the size line for the
main `index-*.js` chunk — that's what users download first. Compare it to what a
single-big-file version would be.

---

# APPENDIX — REFERENCE

## Appendix A. Full file map

```
staff-review-platform/
├── src/
│   ├── App.tsx                    ← main component, whole app + tab navigation
│   ├── main.tsx                   ← React entry point (starts the app)
│   ├── supabase.ts                ← Supabase client setup (URL + anon key)
│   ├── supabaseDb.ts              ← data access (reads/writes + realtime/poll)
│   ├── dataLayer.ts               ← the "safe" unified write layer
│   ├── types.ts                   ← TypeScript shapes for ALL data ★ READ THIS
│   ├── constants.ts               ← review sections, quarter info
│   ├── utils.ts                   ← helpers (create reviews, progress calc)
│   ├── index.css                  ← global styles + Tailwind
│   ├── components/
│   │   ├── ReviewFormEditor.tsx   ← Development Review form (4 quadrants)
│   │   ├── SummaryFormEditor.tsx  ← Quarterly Summary form (6 tabs)
│   │   ├── AdminReports.tsx       ← admin reports
│   │   ├── ActivityLog.tsx        ← audit trail view
│   │   └── UserManagement.tsx     ← admin roles + assign a staff member's coach
│   │                                (the ONLY way a coaching relationship starts)
│   └── utils/
│       ├── pdfExport.ts           ← PDF generation (lazy-loaded)
│       └── session.ts             ← session lifetime guard (idle + browser-restart)
├── server.ts                      ← Express dev server (Vite + static file serving)
├── index.html                     ← single HTML shell
├── supabase-schema.sql            ← database blueprint + security rules
├── package.json                   ← dependencies + scripts
├── vite.config.ts                 ← Vite build config
├── tsconfig.json                  ← TypeScript config
└── .env.example                   ← environment variable template
```

## Appendix B. Commands you'll use

```bash
npm install             # first time: download all dependencies
npm run dev             # start local dev server → http://localhost:3000
npm run lint            # type check (tsc --noEmit) — find errors
npm run build           # create production build (also tests it compiles)
npm run start           # run the built app locally after `build`
npm run clean           # remove the dist/ build folder

# Git
git status              # what changed?
git diff                # show the changes in detail
git add .               # stage changes
git commit -m "msg"     # snapshot + message
git push origin main    # upload → triggers deploy
```

## Appendix C. The ONE thing only you can do

> This is the one manual step I (the assistant) cannot do for you, because it needs
> your Supabase login. It applies the database security rules from D4. Without it,
> those rules are written but NOT active. Takes about 5 minutes and is safe to re-run.

**Step-by-step:**
1. Go to **https://supabase.com** and sign in with the account that owns the project.
2. On the left click **"SQL Editor"**.
3. Click **"+ New query"**.
4. Open `supabase-schema.sql` in a text editor (Notepad / TextEdit / VS Code).
5. Select all, copy it.
6. Paste into the big box (replacing anything there).
7. Click **"Run"**.
8. You should see **"Success. No rows returned."**

If you get a red error, copy the red message and send it back — we'll fix it.

**One thing to know about the file's structure:** it creates the **tables first,
then the helper functions**, and that order is deliberate. The functions read the
`users` table, and Postgres checks a function's code the moment you create it. If
the functions came first, the whole script would fail on a brand-new project with
`relation "public.users" does not exist`. If you ever reorganise the file, keep
tables above functions.

**Optional but recommended:** enable Realtime for faster updates:
1. Supabase → **"Database"** → **"Replication"**.
2. Click **"Enable Realtime"**.
3. Turn on the toggle for these tables: `users`, `development_reviews`,
   `quarterly_summaries`, `coaching_requests`, `meetings`, `follow_up_tasks`,
   `activity_logs`, `requirement_settings`, `review_schedules`.
   If skipped, the app still works (it just falls back to checking every ~30s).

## Appendix C2. The trap that will bite you later

> This is the single most common way to break a live app with this project. Read
> it before you add a column to the schema.

**The problem.** `CREATE TABLE IF NOT EXISTS users (...)` is a **no-op** if the
table already exists. Look closely at that word — `IF NOT EXISTS`. Postgres
checks "does a table called `users` exist?", finds one, and moves on. It does
**not** read the column list and add anything.

So imagine you add a new column:

```sql
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_new_column TEXT      -- <-- you added this
);
```

You paste the file into the SQL Editor, it says **"Success. No rows returned."**,
and you walk away happy. But your database still has the old `users` table with
no `brand_new_column`. The app then fails at runtime with:

```
column "brand_new_column" of relation "users" does not exist
```

...and because some of those failures are swallowed by empty `catch` blocks in
the UI, you may not even see an error. The data just quietly stops saving.

**This is not hypothetical.** It is exactly what happened with `users.coach_uid`.

**The rule.** Every new column needs **two** lines: one inside the
`CREATE TABLE` block (for brand-new databases) and one `ALTER TABLE` beside it
(for databases that already exist):

```sql
-- inside the CREATE TABLE block, for fresh databases:
CREATE TABLE IF NOT EXISTS users (
  ...
  coach_uid TEXT,
  ...
);

-- right below it, for databases that already exist:
alter table public.users add column if not exists coach_uid text;
```

`add column if not exists` is safe to run on a database that already has the
column (it does nothing) and safe on one that doesn't (it adds it). Existing
rows get `NULL`, which is what you want.

**How to check whether the database actually has it.** Run this read-only query
in the SQL Editor — it never changes anything:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
```

Compare the result against the tables in `supabase-schema.sql`. Anything missing
is a change that never reached your database.

**The habit to build:** after any schema change, re-run the whole file, then run
the query above and confirm. It takes twenty seconds and it is the difference
between "I think I deployed it" and "I verified it deployed".

**One more thing to know.** If RLS is enabled and the script dies partway
through, your policies may be left dropped. That is *fail-closed* — nobody gets
access, including you — rather than fail-open, so it is annoying but not
dangerous. Read any red error message rather than assuming it worked.

## Appendix D. Common issues & fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Blank white screen | Missing env vars, or build error | Check Vercel build log; ensure env vars are set |
| Login doesn't work | Supabase config wrong | Verify `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` |
| Changes not live | Build failed | Vercel → Deployments → see error |
| `npm run dev` fails | `node_modules` missing | Run `npm install` |
| TypeScript errors | Code broke types | Run `npm run lint` to see exactly where |
| Permission denied in DB | RLS blocks the request | Check the user's role; review RLS in `supabase-schema.sql` |

### Environment variables (reference)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase public/anon key (starts with `eyJ...`) |

`VITE_` variables are visible to the browser. All others are server-side only.

## Appendix E. Known limitations (honest review)

A good engineer is honest about what's not done yet. These are the current gaps:

- **`App.tsx` is a very large single file.** It works, and we already lazy-loaded its
  parts, but splitting it into smaller files would be cleaner for future developers.
- **Monthly Development Review form** is de-prioritized; the guided flow focuses on the
  Quarterly Summary.
- **No email/push notifications.** (Planned: Supabase Edge Functions + SendGrid.)
- **No file uploads.** (Planned: Supabase Storage.)
- **Single role per user** — no hybrid staff+coach. (Planned: multi-role.)
- **Hardcoded July–June fiscal quarters.** (Planned: admin-configurable.)
- **Offline mode** is dev-only, not real offline support.
- **PDF** uses a static template (no custom branding/logos).
- **Web-only** — no native mobile app yet.
- **Coach matching is manual** (an admin assigns each coach in Team Members).
- **Session lifetime is capped at 8 hours.** If a tab is left alone overnight, or the
  browser is closed/restarted, the next visit starts at the login screen instead of
  resuming where the user was. The limit is a single constant,
  `IDLE_LIMIT_MS` in `src/utils/session.ts`.
  *Consequence to be aware of:* opening the app in a **second tab** also counts as a
  fresh browser session, so that tab returns to login (and clears the shared session,
  which signs the first tab out too). This is deliberate — the data is sensitive —
  but it is stricter than strictly necessary.
- **Automated test tooling** (Playwright/Cypress/k6) isn't installed yet. The
  search helpers do have real unit tests (`test/search.test.ts`, run with
  `npx tsx test/search.test.ts`) and the database rules have SQL tests — but
  there is no browser automation yet.
- **`npm audit` reports 5 dependency advisories** (2 high, 3 moderate) inherited
  from the Vite/React toolchain. They are in build-time dependencies, not in the
  code this app ships to browsers, so they are not an exploitable runtime risk
  today — but they should be cleared by a dependency bump, and the fix should be
  tested because a major Vite bump can break the build.
- **A normal user can type into the leader/coach section of their own form** — a small
  data-integrity gap (not a security hole). Planned fix.
- **Exported PDFs are always English**, even when the app is set to Amharic:
  `src/utils/pdfExport.ts` takes no language parameter.

---

## Appendix F. Scaling to a large roster (5,000 users)

The app is now built on the assumption that the `users` table holds **several
thousand** people, not fifty. Everything below came from measuring what actually
breaks, not from guessing.

### What we changed

**1. Nobody can pick a coach from a dropdown any more.**
A `<select>` with 5,000 `<option>`s inside it is unusable *and* slow: the browser
has to build 5,000 DOM nodes, and once the page had 25 of those rows on it, the
tab locked up. Four places did this — the coach board, the Team Members table,
the meeting scheduler, and the activity log filter. All four now use
`src/components/StaffPicker.tsx`: type a few letters, get a ranked list.

The picker deliberately **shows at most 60 matches at a time**
(`SEARCH_RESULT_CAP` in `src/utils/search.ts`) and then tells you how many it
didn't show. Rendering 5,000 rows is the bug, not the solution.

**2. Every big list is paginated.** 25 rows per page, with range numbers, via
`src/components/Pagination.tsx`. This covers the coach board, Team Members, the
coach directory, and the admin reports table.

**3. Search is debounced.** Typing a name used to re-filter the entire roster on
*every keystroke*. Now there's a short pause (`useDebouncedValue`) before the
filter runs, so you can finish typing the name first.

**4. We deleted some accidental O(n²) loops.** These were the real performance
killers, and they were easy to miss:
- Rendering a coach's name was a `.find()` **inside a `.map()`** — 25 × 5,000.
  Now a single `Map` is built once and read O(1).
- "Is this person already assigned?" was `array.includes()` inside a loop. Now a
  `Set`.
- The admin export and the bulk-decline buttons were calling `.find()` on the
  whole summaries array per user. Now one keyed `Map`.
- `AdminReports` was scanning every summary for every staff member
  (5,000 × 30,000). Now one indexed pass.

**5. `users` finally has indexes.** The table had *no indexes at all*, and it was
re-sorted in full on every realtime event. Added in `supabase-schema.sql`:
`created_at`, `coach_uid`, `lower(name)`, and a partial index on unassigned
staff (`WHERE coach_uid IS NULL`) for the coverage count.

**6. `getAllStaff()` no longer does `select("*")`.** It names the eight columns
it maps. Cheaper, and a future column can't leak into every browser by accident.

### What is still a real limitation (be honest about this)

The fixes above are **client-side**. The roster is still downloaded whole, in
one request, into every browser. That's fine for a few thousand rows, but it's
the next thing to fix, and it needs a real decision:

- **Privacy first.** The `users_select_authenticated` RLS policy is
  `USING (true)`, so *every* signed-in user can read *every* profile — including
  `is_admin`, `is_leader`, and who reports to whom. For 5,000 people that's the
  whole company directory in everyone's browser, for a regular member who only
  needs their own data. This should become self-only for members, with admin
  access via a server-side, paginated search.
- **Realtime is a full refetch.** `subscribeStaff()` re-runs the whole roster
  query on *any* change to *any* `users` row. With thousands of staff, one
  permission change re-downloads the roster for every connected client. It needs
  to be narrowed to the columns that matter, or moved to targeted refreshes.
- **Reviews and summaries are still fetched in bulk.** An admin evaluation
  matrix can build ~15,000 derived rows in memory. Pagination hides the DOM cost
  but not the download and the derivation. This wants server-side pagination
  and aggregation, or an index/view.
- **`localStorage` bypass mode doesn't scale.** The offline bypass stores a copy
  of the roster in `localStorage` (~5 MB at 5,000 users, rewritten on every
  assignment). It's a development feature and should be treated as one.

**Rule of thumb for this codebase:** if a loop's length depends on how many
people are in the database, it belongs in a `useMemo`, a `Map`/`Set`, or on the
server. Never in the render path.

### The three questions to answer before 5,000 real users

1. **Who is allowed to see the full roster?** (RLS + a `users_directory` view or a
   `search_users` RPC with server-side paging.)
2. **Should members see their coach's name only, or the whole coaching tree?**
3. **What is the live-load ceiling?** One admin reviewing 5,000 people at once is a
   different problem from 5,000 people each reviewing one report.

---

## Final words (read this)

You now have the tools to understand *how* this app works and *how* real software
projects run. The biggest skill you're building isn't "memorize this stack" — it's:

**"Read a real project, figure out what problem it solves, and know where the rules
are enforced."**

Do the **Try It** exercises. Run `npm run lint` and `npm run build`. Then do the one
manual task in **Appendix C**. That act — writing rules and *actually applying them to
the real system* — is the difference between a student and an engineer.

You're building something real. That's the best way to learn.
