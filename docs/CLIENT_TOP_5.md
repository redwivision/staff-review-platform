# Top 5 questions for the client

**Status as of 2026-10-08: four of these are answered or parked. One is still
open.**

| # | Question | Status |
|---|---|---|
| 1 | Who can see the staff directory? | **ANSWERED** — admins only (Bayush now, Nati planned). |
| 2 | One admin flag, or separate roles? | **ANSWERED** — separate roles; shape is the follow-up. |
| 3 | What happens if the coach changes mid-quarter? | **PARTLY** — admin makes the change; default recorded (previous coach loses access, no history). |
| 4 | Concurrency / 5,000 on screen? | **DEFERRED** — decided at the meeting with Sean and the DS team. |
| 5 | Should demo mode be off on the live site? | **STILL OPEN** — this was the one not asked on 2026-10-08 (the workflow question Q10 took its place, and that one is answered). Needs a yes/no. |

So the only blocker-question left from this set is **#5**. The remaining
follow-ups (exact admin-role shape for Nati, Q16 pilot-vs-5,000) ride along
with the Sean/DS meeting or the next message.

---

**Purpose:** these are the five answers that would let me finish the security
work and lock in the right approach for 5,000 users. Everything else can wait.
The message below is what was sent; it stays here as the record of what was
asked and how it was phrased.

Copy the block below and send it as-is. Each question is phrased so it can be
answered in a sentence or two. If an answer is "not sure", that is a useful
answer too — it tells me what to build defensively.

---

## Message to send

> Hi,
>
> The review system is built and working end to end: members fill in their
> review, their coach writes the evaluation, and an administrator signs it off.
> I've also made it handle a 5,000-person staff list.
>
> Before I finish the last part — making sure each person can only see their own
> data — I need to confirm five things. These are the only open items.
>
> **1. Who should be able to see the staff directory?**
> I've built it so a person sees their own profile, their coach, and — if they
> are a coach — the people they coach. An administrator sees everyone.
> I need to know if a regular member should also be able to browse and search
> the company list (for example, to look up a colleague's email). If not, I'll
> lock it down to the three groups above.
>
> **2. Is one administrator enough, or do you need separate admin roles?**
> Right now "administrator" is a single yes/no. That covers review sign-off,
> people management, and system settings. If, say, HR should be able to manage
> staff but not sign off reviews, tell me and I'll split it.
>
> **3. What happens to an in-progress review if someone's coach changes?**
> If a coach changes halfway through a quarter, what should the member see: the
> new coach's feedback, both coaches' feedback, or nothing until the next
> quarter? I need to store the history either way — I just need to know what to
> show.
>
> **4. How many people will use this at once, and will an administrator ever
> need to see all 5,000 at once?**
> This decides whether reviews load instantly or whether I add paging and
> searching. A rough "maybe 200 at a time, but yes we need to search everyone"
> is enough — you don't need exact numbers.
>
> **5. Should the demo mode be switched off on the live site?**
> There's a "demo mode" that shows sample data and lets anyone click through as
> a fake administrator, without touching real data. It's useful for training
> people, so I'd like to keep it — but if you'd rather it wasn't reachable on
> the live site, I'll turn it off there and keep it for local testing.
>
> One more thing you can decide later, whenever suits: the forms and PDFs are
> currently in English and Amharic. If you want exported PDFs in Amharic too,
> just let me know and I'll add it.
>
> Thanks,
> [your name]

---

## Why these five — and what came back

| # | What it unblocks | Outcome (2026-10-08) |
|---|---|---|
| 1 | The access rules in the database. This is the main outstanding item — right now anyone signed in can technically read every profile, which is more access than we agreed. | **Answered: admins only.** Strictest model confirmed, RLS rewrite ready to start. |
| 2 | Whether `is_admin` stays one flag. | **Answered: separate roles.** New scope — schema + RLS + UI split; shape is the follow-up. |
| 3 | Whether coaching assignments need a history table. | **Partly:** admin makes the change. Default: no history table, previous coach loses access. |
| 4 | Whether to add server-side search and paging for 5,000 users. | **Deferred** to the Sean/DS meeting. Built anyway — it's the only approach that holds at that size. |
| 5 | Whether the demo/bypass screen is reachable on the live site. | **Not asked.** Still open — see the follow-up message below. |

## Follow-up still to send (question 5 + two ride-alongs)

> One thing we didn't cover last time: the app has a built-in **demo mode**
> on the live site — anyone with the URL can click through as a fake
> administrator (it touches no real data). Should I switch it off on the live
> site and keep it only for internal testing? I'd recommend yes.
>
> And whenever convenient, two small ones: is this starting as a **pilot with
> a few hundred people**, or 5,000 from day one? And do exported **PDFs need
> to be in Amharic** as well as English?

## Notes

- The full list of 22 questions, including hosting, data retention, and
  long-term features, is in [CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md). Send
  those later; do not send them all at once.
- Questions 1 and 5 are the two that carry real risk if guessed wrong, which is
  why they lead.
- No question here needs a technical answer. If the client answers in plain
  language, that is enough.
- Answers are quoted verbatim in [CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md);
  the interpretations there are what STATUS.md and the backlog use.
