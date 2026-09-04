# LinkedIn EA modal detection — the "wrong div[role=dialog]" bug (XXXXXXX)

## Symptom observed
Jobs reported as `empty_modal` / `no-continue-submit` and skipped as "LinkedIn glitched."
On vision inspection the modal was ALWAYS fully rendered. Example: TCS job 4448212791 showed
step 1/4 contact-info (pre-filled), 2/4 resume already selected (OPERATOR_RESUME_ATS.pdf,
green check), 3/4 with empty required fields (TOTAL EXP? / NOTICE PERIOD / CURRENT CTC?).

## Root cause
LinkedIn renders MULTIPLE `div[role=dialog]`. `document.querySelector('div[role=dialog]')`
returns the FIRST one — frequently a hidden EMPTY accessibility overlay whose only text is
"This is a modal window." Any scan scoped to it (`m.querySelectorAll('input,button,...')`)
returns 0, so the bot falsely concludes "modal empty."

Confirmed via: `document.querySelector('div[role=dialog]')` existed but `modalText === "This is
a modal window."` while `document.querySelectorAll('input,...')` elsewhere returned 24 hidden
page inputs and the VISIBLE form was in a different dialog subtree.

## Fix (proven working this session)
1. Scope every field/button/radio scan to **`document`** (whole page), NOT a
   `querySelector('div[role=dialog]')` result.
2. Button location: search ALL `button` elements, prefer visible + non-disabled:
   `all.filter(b => rx.test(b.innerText))` then `vis = all.find(b => { const r=b.getBoundingClientRect();
   return r.width>0 && r.height>0 && !b.disabled; }) || all[0]`.
3. Modal-open detection: body TEXT regex (`/apply to |contact info|additional questions|resume|
   review your application/i`) AND a Next/Review/Submit button OR `N / pages` indicator.
4. Field-readiness poll: `document.querySelectorAll('input,textarea,select,div[role=radio]')`
   for ~12s; if still 0, re-click EA once and re-poll; only then report clean failure.
5. **Verify by vision** — screenshot + vision_analyze — before ever calling a modal "empty."
   The DOM-count-alone "glitch" claim was wrong 100% of the time this session.

## Answer-rule gaps found & fixed alongside this (add to answer bank)
- "TOTAL EXP?" / "total experience" / "overall experience" -> 14 (regex only matched full
  "experience" word, not "exp").
- "How soon can you join (in days)?" -> 0.
- "In last 90 days, how many days did you code?" -> 90.
- "How many team leads report to you?" -> 0.
- "How many concurrent client projects owned?" -> 3.
- "Accountable for delivery margin / project profitability?" -> Yes.
- "Comfortable with the budget of RupeeX LPA?" -> Yes.
- "Do you have 6+ professional software development experience + hands-on daily?" -> Yes.

## Cleanup rule (user, HARD)
After each job completes, delete `shot_*.png` + debug cruft. Keep only apply_one.cjs,
run_recursive.cjs, cdp_helper.cjs, applied.json. Never leave diagnostic PNGs — they mislead
the next session and waste disk.
