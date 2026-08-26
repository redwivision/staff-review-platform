# Testing Guide — Before You Push

> Run through this BEFORE committing. Takes about 5 minutes.

---

## Step 1: Install Dependencies (First Time Only)

```bash
cd "/Users/Learning/Desktop/staff-review /staff-review-platform"
npm install
```

If this fails, make sure you have Node.js installed: `node --version`

---

## Step 2: Type Check (Catches Errors Without Running)

```bash
npm run lint
```

**What this does:** Runs TypeScript compiler to check for syntax/type errors.

**What to look for:**
- ✅ No output = clean, no errors
- ❌ Any output starting with `src/` = there's an error in that file

**Pre-existing errors you can IGNORE:**
- Errors in `server.ts` about missing modules (express, path, etc.) — these are expected without full type setup
- Errors about "Cannot find module 'react'" — these happen when `node_modules` isn't fully installed

**Errors you MUST fix:**
- Anything in `src/components/SummaryFormEditor.tsx`
- Anything in `src/components/AdminReports.tsx`
- Anything in `src/utils/pdfExport.ts`
- Any "Duplicate identifier" or "Syntax error" messages

---

## Step 3: Build for Production

```bash
npm run build
```

**What this does:** Creates the production-ready `dist/` folder that Vercel will deploy.

**What to look for:**
- ✅ Ends with something like `✓ built in X.XXs`
- ❌ Any red error messages = build failed, don't push yet

**Common build errors:**
- `error TS...` → TypeScript error in your code, check the file/line number
- `RollupError` → Usually a missing import or syntax error

---

## Step 4: Run Locally (Visual Check)

```bash
npm run dev
```

This starts the app at **http://localhost:3000**. Open it in your browser.

### What to Test (5-minute checklist)

#### A. Login Flow
- [ ] Sign up with a test email (e.g. `test@example.com`)
- [ ] Log in with those credentials
- [ ] You see the dashboard

#### B. Section 1 — The Changed Part ⭐
- [ ] Click "New Summary" (or open an existing one)
- [ ] Click the **"General & Suggestions"** tab (first tab)
- [ ] You should see **3 cards** with headers:
  - "Staff Identity" (with a person icon)
  - "Role & Timeline" (with a briefcase icon)
  - "Staff Suggestions" (with a message icon)
- [ ] Each field has **hint text** below it in light gray
- [ ] Labels are clear — no "TL" abbreviations
- [ ] Fill in a few fields and click **Save Summary Draft**

#### C. Check Dark Mode
- [ ] Click the moon/sun icon in the header
- [ ] The Section 1 cards should look good in dark mode too
- [ ] Toggle back to light mode

#### D. Check Admin Reports View
- [ ] Go to "Access Directory (Admin)" → "control" sub-tab
- [ ] Click on a staff member to see their report
- [ ] The "General Information" section should show the updated labels:
  - "Current Position / Role" (not "Position / Role")
  - "Supervised By Current Team Leader Since" (not "Supervised By Leader Since")
  - "Reviewer Name & Position" should be visible

#### E. Check Responsive Layout
- [ ] Make the browser window narrow (mobile width)
- [ ] The cards should stack vertically (1 column)
- [ ] Make it wider again — should go to 2 or 3 columns

---

## Step 5: Stop the Dev Server

Press `Ctrl + C` in the terminal where `npm run dev` is running.

---

## Step 6: Commit and Push

```bash
git status                              # See what changed
git diff                                # Review the actual changes (optional)
git add src/components/SummaryFormEditor.tsx src/components/AdminReports.tsx src/utils/pdfExport.ts PROJECT_GUIDE.md TESTING_GUIDE.md
git commit -m "feat: redesign Section 1 with grouped cards, clear labels, and hint text"
git push origin main
```

**After pushing:**
1. Go to your Vercel dashboard: https://vercel.com/redwivision/staff-review-platform/deployments
2. Watch the build status — should say "Building" then "Ready" within 1-2 minutes
3. Click "Visit" to see your changes live
4. Repeat the visual checks from Step 4 on the live site

---

## What If Something Breaks?

### Build fails on Vercel
1. Go to Vercel → your project → "Deployments"
2. Click the failed deployment
3. Click "Build Logs" to see the error
4. Fix the error locally, push again

### Live site shows old version
- Vercel caches aggressively. Try hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- Or wait 2-3 minutes and try again

### Site shows blank screen
- Open browser console (F12 → Console tab)
- Look for red errors
- Most likely cause: environment variables not set in Vercel

---

## Quick Pre-Push Checklist

Before you push, confirm ALL of these:

- [ ] `npm run lint` — no errors in the files we changed
- [ ] `npm run build` — builds successfully
- [ ] `npm run dev` — Section 1 shows 3 grouped cards with hint text
- [ ] Dark mode works on Section 1
- [ ] Admin report shows updated labels
- [ ] You read PROJECT_GUIDE.md so you can explain your own app
