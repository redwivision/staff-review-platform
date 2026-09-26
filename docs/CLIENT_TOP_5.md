# Top 5 questions for the client

**Purpose:** these are the five answers that would let me finish the security work
and lock in the right approach for 5,000 users. Everything else can wait.

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

## Why these five

| # | What it unblocks | If unanswered |
|---|---|---|
| 1 | The access rules in the database. This is the main outstanding item — right now anyone signed in can technically read every profile, which is more access than we agreed. | I build the strictest version (own data + coach + trainees only), which is what the confirmed model describes. |
| 2 | Whether `is_admin` stays one flag. | Keep one flag. Fine for a small trusted group. |
| 3 | Whether coaching assignments need a history table. | I store history but show only the current coach's feedback. |
| 4 | Whether to add server-side search and paging for 5,000 users. | I add it anyway — it is the only approach that holds up at that size. |
| 5 | Whether the demo/bypass screen is reachable on the live site. | I turn it off in production and keep it locally. |

## Notes

- The full list of 22 questions, including hosting, data retention, and
  long-term features, is in [CLIENT_QUESTIONS.md](./CLIENT_QUESTIONS.md). Send
  those later; do not send them all at once.
- Questions 1 and 5 are the two that carry real risk if guessed wrong, which is
  why they lead.
- No question here needs a technical answer. If the client answers in plain
  language, that is enough.
