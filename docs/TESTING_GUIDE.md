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

## Step 3: Test the Onboarding Tour (Staff View)

1. On the login screen, click **Lewis KB** (the admin bypass button)
2. **The onboarding tour should appear automatically** — it walks you through:
   - Welcome message
   - "My Reviews" tab
   - How the 3-step process works
   - (If admin) "Admin Dashboard" tab
3. Click **Got it!** to finish the tour
4. **If the tour doesn't appear**: clear localStorage again (`localStorage.clear()` in console) and refresh

---

## Step 4: Test the Dashboard (Staff View)

You should see:
- **Tab bar**: "My Reviews" | "Team Reviews" | "Admin Dashboard" (no jargon)
- **A guidance banner** at the top saying "Start by opening a quarter below"
- **3 quarter cards** (1st, 2nd, 3rd) with status badges

What to check:
- [ ] Tab names are plain language (no "CMO", "KDA", "PDP")
- [ ] Guidance banner shows for first-time users
- [ ] Quarter cards show "Not Started" or "In Draft" or "Submitted"

---

## Step 5: Test the Monthly Form (Walk with God tab)

1. On the **1st Quarter** card, click **Open Form** next to "Monthly Form"
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
2. On the **1st Quarter** card, click **Open Form** next to "Quarterly Summary"
3. You should see tab bar: **General & Suggestions | My Growth Plan | My Key Goals | My Main Tasks | Coach's Review**

What to check:
- [ ] Tab names use plain language (no "PDP", "CMO", "KDA", "TL Evaluation")
- [ ] "My Growth Plan" shows 3 categories: Walk with God, Personal Life, Relational Life
- [ ] "My Key Goals" shows the Ministry Impact bullets at the top (the context guide)
- [ ] "My Main Tasks" shows assignment fields
- [ ] "Coach's Review" shows the evaluation form (locked for staff)
- [ ] Banner says: "You are drafting your Quarterly Review Summary..."

---

## Step 7: Test as a Coach (Sarah Leader)

1. Go back to login page (click your name in top-right → Logout)
2. Click **Sarah Leader** bypass button
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

## Step 8: Test as Admin (Lewis KB)

1. Log out, log in as **Lewis KB**
2. Click **"Admin Dashboard"** tab (not "Access Directory")
3. You should see sub-tabs: **Reports & Reviews | Settings | Team Members**
4. Click **Reports & Reviews**
5. You should see all 3 staff members with their evaluation status

What to check:
- [ ] Tab says "Admin Dashboard" (not "Access Directory")
- [ ] Sub-tabs say "Reports & Reviews", "Settings", "Team Members" (not "Oversight Compliance", "Deadlines", "User Management")
- [ ] Staff evaluations are visible
- [ ] "Coaches' Feedback" section (not "Team Evaluation Center")

---

## Step 8b: Assign a Coach (the only way a coaching relationship starts)

1. Still logged in as **Lewis KB**, click the **Team Members** sub-tab
2. Find **John Staff** and look at the **"Assigned Coach"** column
3. Open the dropdown — it should list the other staff members, not be empty
4. Pick **Sarah Leader**, then press **F5** to refresh

What to check:
- [ ] The dropdown lists every *other* staff member (a person is never offered as their own coach)
- [ ] Choosing "No Coach" clears the assignment
- [ ] Sarah Leader now shows **Coach / Leader** in her own Access Level, even if she was a plain member before

Now log out, log back in as **Sarah Leader**, and check the flip side:

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
