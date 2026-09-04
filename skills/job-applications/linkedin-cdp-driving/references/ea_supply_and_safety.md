# LinkedIn Easy Apply — supply reality & safety gate (2026-08-15)

## Safety-reminder gate
Clicking "Easy Apply" opens a "Job search safety reminder" scam-prevention modal
("Review job post" / "Continue applying"). The real application form appears ONLY after
clicking **"Continue applying"**.
- Detect by button TEXT `/Continue applying/i` (class/role detection is unreliable).
- Click it (real `page.mouse.click` at center) before the form-fill loop.
- The modal may appear 10-12s after the EA click — poll up to ~15s, not 6s.

## f_EA URL filter is ignored
`?f_EA=true` in the search URL does NOT filter to Easy Apply. The feed returns off-LinkedIn
"Hire Feed" / "Quik Hire Staffing" REMOTE recruiter spam with `easy:false` (no real EA button).
Real EA is only forceable via the All-filters panel — which HANGS the browser under automation.
Fix: scrape cards, keep only those whose markup contains an "Easy Apply" button
(`easy:true` parsed from card text). Don't trust the URL param.

## No 5-hour date filter
LinkedIn date buckets: Past 24 hours / Week / Month. `f_TPR=r18000` (5h in seconds) silently
becomes Past 24 hours. Honor "last 5h" by parsing each card's relative time
(`/(\d+)\s*(minute|min|hour|hr)/i` -> minutes/60 or hours) and keeping `<=5`.

## Postings close fast
A card showing an EA button can show "No longer accepting applications" minutes later
(EA button gone). Re-verify the EA button is present immediately before applying; treat a
missing EA button as "closed", not a code bug.

## Supply reality (Bengaluru + EA + last 5h)
Often EMPTY. Recent Software-Engineer+Bengaluru feeds are ~all remote/off-LinkedIn spam.
Do NOT spam low-fit posts to hit a quota. Skip anything scoring <60% vs the profile
(14y full-stack/IAM/AI engineer; see linkedin-easy-apply skill for the hard facts).

### Conclusive evidence (2026-08-15, multiple live queries)
The intersection is not just "often empty" — when the feed is in this state it is
**structurally zero**. Verified across every query shape (no-keyword Bengaluru; "Full Stack"
+ Bengaluru; "Software Engineer" + pan-India; several other keywords), each a single light
pass:
- **Every Software Engineer / Full Stack / Frontend / Developer card = `easy:false`**
  (external/remote "Hire Feed" / company-ATS apply — NOT Easy Apply, cannot be submitted by
  the EA pipeline).
- **Every `easy:true` (real Easy Apply) card = non-engineering**: Regional Sales Manager,
  Senior Assurance Associate, Creative Content/Social Lead, Business Strategy Associate,
  **Mathematics Specialist – Remote**, Engineering Manager. None scores >=60% for the profile.
So a request like "apply to 5 relevant Easy Apply jobs now" is **not fulfillable** when the
feed is in this state — there are 0 qualifying roles. Don't burn cycles re-probing the same
empty intersection (multi-pass probes also freeze the browser). The correct moves:
  (A) let the Option-B cron (5568f9f701e4, every 30m) catch relevant EA roles as they POST;
  (B) if operator insists on 5 NOW, offer A=attempt the `easy:false` external-ATS roles (higher
      hang/field-block risk, one fresh browser per role), B=lower the bar (off-profile EA —
      advise against), or C=keep strict relevance and wait for the cron. Default recommendation
      is C. Reported honestly with the evidence; never spam irrelevant jobs under operator's name.

## Relevance score (compact)
title must match eng keywords; deny non-eng domains (nurse/teacher/accountant/tax/sales/...);
score = 40 + min(skillHits,8)*7 + seniority/fullstack/react/iam bonuses, cap 100; keep >=60.
