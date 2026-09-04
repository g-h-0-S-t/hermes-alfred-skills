---
name: linkedin-cdp-driving
description: "Drive LinkedIn LINKEDIN_PORT Chrome via CDP; computer_use freezes it."
version: 1.0.0
author: Hermes Agent (Hermes curator)
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [LinkedIn, CDP, Puppeteer, Chrome, Automation, Job-Agent, Browser-Freeze]
    category: job-applications
    surfaces: [desktop, cli, whatsapp]
---

# LinkedIn CDP driving (this machine) — anti-freeze discipline

## When to Use
- Any request to apply on LinkedIn, scrape LinkedIn jobs, navigate the LinkedIn job list,
  or fill a LinkedIn Easy Apply form on THIS machine (XXXXXXX, LINKEDIN_PORT Chrome).
- The browser appears hung on LinkedIn (CDP `http=000`) — diagnose per references/linkedin_cdp_freeze.md.
- You were about to reach for `computer_use`/`cua_browser_*` on LinkedIn — STOP and use raw CDP instead.

user's LinkedIn lives in a dedicated Chrome at `http://127.0.0.1:LINKEDIN_PORT`
(profile `XXXXXXX/chrome-profile`). Drive it with **raw CDP only**.
The single most important lesson from XXXXXXX-15: **cua-driver / `computer_use` /
`cua_browser_*` on LinkedIn FREEZES the browser.** Use puppeteer-core + Node, never UIA.

## THE FREEZE — TWO DISTINCT ROOT CAUSES (do not conflate)
- Symptom: browser main thread stops answering. `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version`
  returns `http=000` (CDP `/json` is served by the main thread) while the port stays
  LISTENING. Windows Event Log shows **Event ID 1002 "Application Hang"** for chrome.exe.
  Child renderer/gpu/utility processes stay `Responding=True` — it is the *browser* thread,
  not one tab.

- CAUSE A (UIA / computer_use — still valid): cua-driver's **UIA accessibility-tree walk**
  over LinkedIn's enormous DOM blocks the main thread (confirmed: `computer_use capture
  mode='som'` triggered it). `--disable-gpu` does NOT fix it. NEVER use `computer_use` /
  `cua_browser_*` on LinkedIn. Use raw CDP.

- CAUSE B (CDP page crash on load — the one that actually bit the EA pipeline, XXXXXXX):
  The LINKEDIN_PORT profile had ~30 extensions loaded AND Chrome's default `/dev/shm` on this machine
  is tiny. Result: **every** `page.goto` (even `example.com`) crashed the renderer with
  "Navigating frame was detached" / "Session closed" — NOT a LinkedIn-specific issue.
  DIAGNOSIS TRICK: open a FRESH profile with `--no-sandbox --disable-gpu --disable-dev-shm-usage`
  and the same goto works. So the fault is the profile's extensions + shared-memory, fixable
  without losing the login: relaunch the SAME LINKEDIN_PORT profile with `--disable-extensions
  --disable-dev-shm-usage`. After that, a 10-keyword collect + multiple applies runs with
  ZERO crash. **This means the old "one light pass per browser, relaunch between navigations"
  rule is NO LONGER NEEDED** once the profile is launched with the hardening flags above —
  sustained CDP work is fine. Keep ONE rule: if LINKEDIN_PORT is ever relaunched, use the flag set in
  the Relaunch flags section (extensions + dev-shm disabled), not the old 5-flag set.
- Sustained **CDP** interaction also freezes it. The hard rule, reproduced repeatedly:
  **ONE light CDP pass per fresh browser, NEVER multiple sequential LinkedIn navigations
  in one browser session.** A single pass (one `page.goto` + one `page.evaluate` read, or
  one apply attempt) survives. But a *sequence* of navigations in one session freezes it —
  e.g. a node script that loops 6 keyword searches (`page.goto` x6) in one browser hangs it
  (`http=000`) every time. Scroll-marathons and the All-filters panel (many sequential
  clicks/waits) also freeze it. So: relaunch a FRESH browser before EACH navigation burst
  (kill chrome, spawn, wait for `http=200`, then exactly one pass). This is the single most
  common cause of "the browser seems frozen" mid-task.
- **Concrete repro that broke the bot (XXXXXXX-15):** the EA driver's `collectJobs` did
  **14 sequential keyword `page.goto` calls + a 6× `window.scrollBy(0,1500)` loop per query**
  inside ONE browser session. That reliably froze Chrome (Event 1002, `http=000`) every run.
  The fix: a collect is a SINGLE query, ONE `page.goto`, ONE ~3.5s read, NO scroll marathon
  (LinkedIn renders ~7-9 cards initially; that's enough). Multiple keywords = relaunch a
  fresh browser per keyword, one pass each. A single apply attempt (goto detail -> mouse-click
  EA -> dismiss safety -> fill -> submit) is fine in one session; it's the *collect marathon*
  that kills it.
- **Keep the EA driver SIMPLE (XXXXXXX-15 lesson).** A "universal" rewrite that (a) added an
  LLM classifier to auto-fill every unanswered field and (b) a 14-query collect-marathon is
  exactly what made the skill "messed up". operator explicitly wanted it simple again. The
  proven-good shape: profile-only fill (NO LLM — banned, it corrupts forms like putting "Yes"
  into a years-of-experience field), EA opened via a REAL mouse click at the button center
  (synthetic `clickText` is a no-op on LinkedIn React), safety-reminder dismissed by clicking
  "Continue applying", one light pass per job. Unanswered required fields -> logged GAP, job
  skipped (never submitted incomplete).
  - **XXXXXXX REFINEMENT:** the bot must REASON from user's profile (not a static table) and
    a CONSTRAINED LLM oracle is now permitted — see "EVOLUTION XXXXXXX" below. The destructive
    auto-fill that corrupted forms stays banned; the LLM is text-only.
- **Detached-Chrome cleanup pitfall:** CDP scripts spawn Chrome with `detached:true`. If the
  node script is killed by `timeout` (or crashes), its `finally` never runs, so the *detached*
  Chrome child is left ALIVE and often FROZEN (`http=000`). After any killed/timeout'd CDP
  script, always `taskkill /F /IM chrome.exe` yourself, then relaunch fresh. Don't trust the
  script's cleanup to have run.

## Relaunch flags (use these, always)
```
"C:/Program Files/Google/Chrome/Application/chrome.exe" --remote-debugging-port=LINKEDIN_PORT \
  --user-data-dir="XXXXXXX/chrome-profile" --disable-extensions \
  --no-sandbox --disable-gpu --disable-software-rasterizer \
  --disable-dev-shm-usage --no-first-run \
  --hide-crash-restore-bubble --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding --disable-background-timer-throttling
```
**The `--disable-extensions` + `--disable-dev-shm-usage` flags are MANDATORY** (XXXXXXX
finding): the ~30 extensions loaded in this profile + the machine's tiny `/dev/shm` were
crashing the renderer on EVERY page (even `example.com`), which looked like a "LinkedIn
freeze". With these flags a 10-keyword x multiple-apply run completes with zero crash. Logged
into LinkedIn stays intact (cookies live in the profile, not extensions). Resume-attached EA
does NOT need any extension.
Health probe before any work: `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version` must return
JSON. If it times out -> browser is hung -> `taskkill /F /IM chrome.exe` then relaunch.

## Do / Don't
- DO read the page via `page.evaluate(...)` and click via real trusted input
  (`page.mouse.click(cx,cy)` after `el.boundingBox()`). React buttons ignore synthetic
  `.click()` inside `page.evaluate`; a real mouse click at the button's center works.
- DO one operation per browser session when possible; relaunch fresh between heavy steps
  (e.g. between separate job applications) to dodge the sustained-drive freeze.
- DON'T use `computer_use`/`cua_browser_*` on LinkedIn. Ever.
- DON'T run the All-filters panel via automation (it hangs). Filter post-hoc in JS instead.
- DON'T marathon-scroll. Read the ~7-9 cards LinkedIn renders initially; new ones appear
  on the next periodic pass.

## Easy Apply specifics (XXXXXXX-15)
- **Safety-reminder gate:** clicking "Easy Apply" first opens a *"Job search safety
  reminder"* scam-prevention modal ("Review job post" / "Continue applying"). The real
  form only appears AFTER clicking **"Continue applying"**. Detect that button by its
  TEXT (class/role detection is unreliable) and dismiss it before the form loop.
- **`f_EA=true` is IGNORED via URL.** The search returns off-LinkedIn "Hire Feed" / "Quik
  Hire Staffing" REMOTE recruiter spam (`easy:false`). Real EA is only forceable via the
  All-filters panel (which hangs). Fix: scrape cards, then keep only those whose markup
  contains an "Easy Apply" button (`easy:true` from card text).
- **`f_TPR` IS a reliable posted-within filter (CORRECTED XXXXXXX).** Earlier notes claimed
  `f_TPR=r18000` "silently becomes 24h" and to parse each card's "X minutes/hours ago" text. Both
  are WRONG. `f_TPR=r18000` (5h), `r43200` (12h), `r86400` (24h) ARE honored server-side and return
  only jobs posted in that window. The post-time TEXT is almost never present in search card snippets
  (cards show "Company review time" or "Applied", not "X hours ago"), so a text-parser `ageHours` filter
  STARVES the run (every card → ageHours=999 → skipped → 0 jobs). CORRECT FIX: put `f_TPR=<window>` in
  the search URL (let LinkedIn filter by time) and apply ONLY a relevance filter on the returned cards;
  do NOT try to parse posted-time text to decide recency. To make the window configurable, compute
  `TPR = WINDOW_HOURS<=5 ? 'r18000' : (WINDOW_HOURS<=12 ? 'r43200' : 'r86400')` and build search URLs
  with it. "Last 5 hours" -> use `r18000` directly; it works.
- **Postings close fast:** a card with an EA button can show "No longer accepting
  applications" minutes later (EA button gone). Re-verify the button is present immediately
  before applying; treat a missing EA button as "closed", NOT a code bug.
- **Supply reality:** the "EA + XXXXXXX + last 5h" intersection is often EMPTY. Do not
  spam off-LinkedIn/remote/low-fit posts to hit a quota — skip <60% relevance.

## Health-gated periodic watchdog pattern (Option B, live as cron 5568f9f701e4)
- `no_agent` cron (survives model 503s), every 30 min, silent when nothing qualifies.
- Each run: ensureBrowser (relaunch if LINKEDIN_PORT down) -> ONE light scrape (`scrape_XXXXXXX.cjs`)
  -> filter `easy && XXXXXXX && <=5h && score>=60` -> apply at most ONE job via
  `apply_one.cjs` -> log to `ea_applied_b.json` / `ea_skip_b.json` (never re-applies).
- Reuse `XXXXXXX/job-apply/cdp_helper.cjs` (`withPage` helper) and run Node with
  `PYTHONPATH`/`PYTHONHOME` UNSET: `env -u PYTHONPATH node script.cjs`.

## WORKING EA-DRIVER PATTERN (XXXXXXX, proven end-to-end)
A single puppeteer-core driver (`XXXXXXX/job-apply/linkedin_apply_30min.cjs`) now
runs the whole collect→fill→submit→verify loop in ONE browser session (safe with the
hardening flags). Key learned details:

- **Easy Apply modal does NOT expose `role=dialog` / `.artdeco-modal`** — `document.querySelector`
  for those returns null even when the form is up. Detect the open modal by body TEXT:
  `/apply to |contact info|additional questions|resume|review your application|work authorization|application questions|attach/i`
  AND the presence of a Next/Review/Submit button, OR a `N / pages` progress indicator.
- **The EA button click is RACY** — one `el.click()` often does not open the modal. Retry loop:
  for k in 0..5, click (re-find the button each retry) then poll ~2.2s for the open-text above;
  stop on first success. Without this retry, ~1-in-3 jobs silently fail with `modal_noopen`.
- **Contact step is PRE-FILLED from the profile.** Email/First name/Last name/Mobile/Phone-country
  already hold the right values. Re-typing clears them and fails. Rule: for any contact field,
  if `value` (or `selectedOptions[0].textContent` for a SELECT) is non-empty, LEAVE IT ALONE and
  report `prefilled`. Only fill when empty. The "Phone country code" select holds "XXXXXXX (XXXXXXX)"
  — a country, not a phone number; never stuff the phone digits into it.
- **NEVER expose the "Hermes Agent" persona/identity when filling job applications.** user's internal
  agent name ("Hermes Agent") is private. On "Which AI tools do you use daily?" and similar, the answer
  must name the TOOLS (Hermes, omniroute, Antigravity, Kilo Code, Cursor, Ollama/LM Studio) — never
  the "Hermes Agent" identity or "my agent". Keep that internal. The full AI-tools phrasing and the rest
  of the profile-driven answer bank live in `references/ea-answer-map.md`.
- **Fill from the REAL profile; only queue when genuinely unknown (XXXXXXX correction).**
  Skill-year questions ("years with Python/Java/Angular/PostgreSQL…"), total-experience,
  notice-period, and compensation fields ARE answerable from user's verified profile data
  (the `SKILL_YEARS` map in the driver + CTC XXXXXXX/expected XXXXXXX). These are REAL facts,
  not fabrication — answer them, do NOT skip the job to `needs_review`. ONLY queue to
  `needs_review` when a required field has no basis in the profile (e.g. a novel
  company-specific question like "why do you want to work here"). user's standing instruction:
  use everything at your disposal to actually FILL the form, not to skip it.
- **Resume:** never upload a file; the in-account stored ATS resume auto-attaches. If a resume
  picker is shown, select "operator_XXXXXXX_Resume_ATS.pdf" only; otherwise leave default untouched.
- **Collect "last 30 min":** LinkedIn has NO native "posted in last 30 minutes" filter (closest
  is Past 24h). Use `f_TPR=r86400&sortBy=DD` then parse each card's real "X minutes ago" text
  (`/\b(\d+)\s*(minutes?|mins?|hours?|hrs?|days?)\b/i`) and keep `postedMinutes <= 30`. Reality
  check: only ~2-4 relevant EA jobs appear in any 30-min window — do NOT pad the count with
  off-profile roles to hit a quota. A "50 jobs" request = a RECURRING sweep that accumulates
  over the day, not 50 in one pass.
- **Relevance pre-filter (user's profile focus, XXXXXXX):** operator is a **JavaScript / frontend /
  full-stack / UI dev** (Node backend + AI-integration ok). Before applying, reject non-matching roles.
  Use `RELEVANT = /javascript|typescript|front[- ]?end|full[- ]?stack|node\.?js|nodejs|react|vue|
  angular|ui developer|user interface|web developer/i` and `IRRELEVANT = /embedded|firmware|automotive|
  autosar|matlab|vlsi|verilog|rtl|plc|scada|mechanical|civil|hardware|asic|fpga|kernel driver|golang|
  java(?!script)|python(?!.*react)|rust|spring boot/i`. A card is relevant only if `RELEVANT.test(txt) &&
  !IRRELEVANT.test(txt)`. This caught the embedded-C "777 Trinity" and Golang roles that the keyword
  search surfaced. Reality check: in any 5h window only ~1 relevant JS/frontend EA role posts in XXXXXXX —
  that is the honest supply, not a bug; widen `WINDOW_HOURS` (12/24) for more volume rather than padding
  with off-profile posts.
- **Verify each submission** by re-opening `https://www.linkedin.com/jobs/view/<id>/` and checking
  for "Application submitted". Save a screenshot as proof (vision-confirm the "Application
  submitted" text — do not trust the script's own boolean).
- **Daily limit / session throttle:** if "You've reached today's Easy Apply limit" appears, STOP
  (do not loop). Same for a vanished EA button across many jobs.

## FORM-FILL REACT GOTCHAS (XXXXXXX, verified while fixing the EA driver)
LinkedIn's Easy Apply form is a React app. Naive DOM filling fails in specific, reproducible
ways. Capture these so you don't re-derive them each session. Full detail + snippets in
`references/form-fill-react-gotchas.md`.

- **Text inputs reject synthetic `.value` sets AND `page.type()` sometimes lands in the wrong field when the element is matched by index/selector.** LinkedIn field IDs are guillemet characters (`«rf»`) which break CSS selectors, so `page.$('#«rf»')` fails. RELIABLE method (XXXXXXX): collect `{id, aria-label}` in-page, then for each field call `await page.evaluate(i=>document.getElementById(i)?.focus(), id)` from Node, followed by `page.keyboard.down('Control'); page.keyboard.press('A'); page.keyboard.up('Control'); page.keyboard.press('Backspace'); page.keyboard.type(ans,{delay:30})`. Focus-by-ID avoids the guillemet-selector problem and the wrong-field issue. (The in-page `getOwnPropertyDescriptor(...).set.call(e,v)+dispatchEvent` trick is for the contact email/phone only, which ARE pre-filled controlled inputs you should LEAVE ALONE.)
- **Radios/checkboxes: click the VISIBLE `role=radio`/`role=checkbox` DIV, not the hidden
  `<input>`.** LinkedIn renders a visually-hidden `<input type=radio>` plus a clickable
  `<div role="radio" aria-label="Yes">`. A `.click()` (synthetic OR trusted) on the `<input>`
  does nothing — React's handler is on the div. CRITICAL (XXXXXXX, re-verified): an
  **in-page `el.click()` / synthetic `.click()` on the div is ALSO a no-op** — React ignores it.
  The ONLY click that registers is a **trusted `elementHandle.click()` from Node**
  (`const h=(await page.$$('div[role=radio]'))[idx]; await h.click({delay:50})`), with a real
  `page.mouse.click(cx,cy)` at the div's `boundingBox()` center as fallback. Same for checkboxes.
  - **Radio question-climb (pick the option) — CORRECTED XXXXXXX:** the ancestor-climb method
    (read ancestor `innerText`, strip yes/no, cut at first '?') is WRONG — it yields "(unlabeled radio)"
    because the question text is NOT an ancestor of the radio. In LinkedIn's DOM the question `<div>`
    (e.g. "How many years of work experience do you have with AWS?*") is a **PRECEDING SIBLING** of
    the `<fieldset>` that contains the `role=radio` divs, often 1-2 siblings back. Correct extractor:
    `const fs = radio.closest('fieldset') || radio.closest('div[role=group]'); let node = fs || radio.parentElement;
    for (let i=0;i<12 && node;i++){ let sib=node.previousElementSibling; while(sib){ const t=(sib.innerText||'').replace(/\s+/g,' ').replace(/\b(yes|no)\b/gi,'').trim(); const qi=t.indexOf('?'); if(qi>=0) return t.slice(0,qi+1); sib=sib.previousElementSibling; } node=node.parentElement; } return '';`
    Then map `q` → Yes/No via the answer bank and click the option whose `optText === answer`
    (case-insensitive). Do NOT rely on the div's `aria-label` (only "Yes"/"No").
  - **Yes/No radio for "years of experience with X" — NEW PITFALL XXXXXXX:** LinkedIn renders
    "How many years of work experience do you have with <Tech>?" as a **Yes/No radio**, but the
    answer bank returns a NUMBER (e.g. aws→3). Since `'3' !== 'yes'`, the radio is never clicked and
    the form can't advance. FIX (radio branch only): `if (a && optText==='yes' && /year|experience|
    familiar|have you|do you have|worked with|knowledge of/i.test(q)) a = 'Yes';` before the
    optText===a check. (For the same question as a TEXT input, still return the number.)
- **Consent/agreement CHECKBOXES must be auto-checked (XXXXXXX, NEW):** the driver handled text/
  radio/select but NEVER clicked checkboxes, so consent boxes stayed unchecked → "This field is
  required" → STUCK on the final step. LinkedIn renders the consent text in a SIBLING container
  (not a `<label for>`), and the checkbox `id` is an obfuscated guillemet string, so `labelFor`/
  `closest('label')` return empty. FIX (in-page, after radio handling): for each
  `input[type=checkbox]` that is unchecked, walk `start=cb.closest('div,li,label,span')||cb.parentElement`,
  then `node=start; for i in 0..10: sib=node.previousElementSibling; while(sib){ txt+=(sib.innerText||'');
  sib=sib.previousElementSibling } node=node.parentElement;` lowercased. If
  `/consent|agree|terms|privacy|authoriz|permission|process (my )?data|i confirm|accept|data for the
  purpose|store.*process/i` matches AND NOT `/follow (this )?(company|employer)|subscribe|newsletter|
  email updates|keep me informed|notify/i` → `cb.click()`. Leave "follow company"/"subscribe" unchecked.
  Confirmed working: Energy Exemplar "has my consent to collect, store, and process my data" box now
  auto-checks and the form advances to Submit.
- **ALREADY_APPLIED must NOT be classified as `failed` (XXXXXXX, NEW):** when a job is already
  applied, LinkedIn REMOVES the Easy Apply button, so the detail page yields `NO_EA_BUTTON`. The old
  driver treated that as a failure and parked the id in `failed`, causing (a) re-attempts that can't
  re-open the form and (b) the id never landing in `applied`. FIX: before reporting `no_ea_button`,
  check the detail page body for `/application submitted|application status|you applied|applied \d+
  (hour|day|minute|week)|submitted an application|withdrew application/i`; if matched, set
  `error='already_applied'`. The runner must then push the id to `applied` (not `failed`). Vision
  confirms: TCS "Team Lead P2P" and "Intune Administrator" both showed "Application submitted 1 hour
  ago" with no EA button — genuinely already applied, not failures. Always vision-check a detail page
  before concluding "no EA button = broken".
- **Radio/checkbox OPTION text ("Yes"/"No") lives on the `role=radio` `aria-label`, NOT the
  `<input>`'s label.** `labelFor(input)` returns empty for these. Read the option text from
  `closest('[role=radio]').getAttribute('aria-label')`.
- **Question labels are SPLIT across a `<p>` + a nested `<span>`.** LinkedIn renders
  "How many years of work experience do you have with" in a `<p>` and "Java?*" in a child
  `<span>`. `labelFor` (which reads `closest('label')`/aria) returns only the truncated prefix.
  FIX: a `questionTextFor(el)` helper that climbs ancestors and reads the PARENT container's
  full `textContent` (aggregates the `<p>` + nested span), slicing up to the first "?" (keeping
  a trailing "*"). Without this, skill-year inputs get labels like "...do you have" with no
  skill name → `answerFor` can't match → field skipped → form can't advance.
- **Contact email is PRE-FILLED as read-only text, not an editable input value.** `dumpContact`
  scanning `<input>` placeholders/aria for "mail" misses it (LinkedIn shows email in a
  non-input element). Verify contact by checking the page body `innerText` contains the email
  (regex `/your@email\.com/`) rather than an input `.value`.
- **LinkedIn input IDs are guillemet characters (`«rf»`, `«rg»`)** — INVALID as CSS selectors
  (`page.$('#«rg»')` fails/misbehaves). Use `el.name` (`[name="radio-group-«rh»"]`) or
  `page.$$('input[type=text]')` indexing for selectors instead of `el.id`.
- **Modal detection:** the EA modal does NOT expose `role=dialog`/`.artdeco-modal` (returns
  null even when open). Detect by body TEXT (`/contact info|additional questions|review your
  application/i`) — see the WORKING EA-DRIVER PATTERN section above.

## EVOLUTION XXXXXXX — profile-reasoning brain + constrained LLM fallback
user's explicit correction: *"Why are you using a script? I expect Hermes Agent to always actively
answer the questions based on my personal and professional data and life's information!"* The
bot's "brain" must be user's real profile (held by the agent), not a hand-maintained
question→answer regex table. The earlier v3 failure was the OPPOSITE extreme (an LLM that
auto-filled every field and corrupted forms). The proven shape is a THREE-TIER answer dispatch:

1. **Instant regex** for structured fields (salary/CTC-with-LPA-awareness, notice-period, years,
   skill-years, location, consent/commute/budget/onsite, "Do you have 6+ experience"→Yes,
   AI-tools→name the TOOLS not "Hermes Agent", project-link→GitHub). Zero latency.
2. **Profile reasoning** for derived facts — e.g. "Have you completed Bachelor's Degree?" →
   scan `PROFILE.education` for B.Tech/Bachelor → "Yes". This was the exact bug that stuck 3
   jobs earlier: the static table had no education rule, so it returned null and the radio was
   never clicked.
3. **Constrained LLM oracle** (ONLY when tier 1&2 return null): POST the question + PROFILE to
   the free Kilo gateway (`nvidia/nemotron-3.5-lightning:free`, append `:free`). The LLM returns
   a TRUTHFUL text string ONLY — it never touches the DOM. The script types that string via the
   safe keyboard method (focus-by-id + Ctrl+A + type, delay 30).
- **HARD GUARD still in force:** any code that programmatically SETS field values or clicks the
  form (the original destructive auto-fill) is BANNED. The LLM is a text oracle; the script is
  the only "hands". This distinction is what keeps forms clean.
- This is the correct reading of "evolve your skills, Hermes Agent — let's go.": make the answering
  profile-aware, then add an LLM fallback so novel questions self-resolve instead of dying.

### Single-tab discipline (user, XXXXXXX)
Drive LinkedIn in EXACTLY ONE tab. Both `cdp_helper.withPage` and `run_recursive.cjs` reuse
`pages[0]`; never `browser.newPage()`. Relaunch Chrome with the hardening flags so sustained
single-tab multi-navigation is freeze-free. All search-scrape + per-job apply happen in that
one tab.

### WRONG-DIALOG SCOPING — false "empty modal" / "no submit" (XXXXXXX, CORRECTED)
The single most damaging misdiagnosis this engagement: jobs reported as `empty_modal` /
`no-continue-submit` were NOT LinkedIn glitches — **the bot grabbed the wrong dialog.** LinkedIn
renders MULTIPLE `div[role=dialog]` elements; `document.querySelector('div[role=dialog]')` returns
the FIRST one, which is frequently an EMPTY accessibility overlay whose only text is
"This is a modal window." Scoping field/button/radio scans to that first dialog returns 0, so the
bot concluded the modal was empty and bailed. In EVERY case this session, a vision screenshot
proved the modal was fully rendered (contact-info form, resume step with the file already selected,
etc.).

FIX (in apply_one.cjs / any LinkedIn CDP scanner):
- Scope ALL field/button/radio scans to **`document`** (whole page), never to a
  `querySelector('div[role=dialog]')` result.
- When locating Continue/Submit/Next, search ALL `button` elements and **prefer a visible,
  non-disabled one** (`getBoundingClientRect().width>0 && height>0 && !disabled`).
- Modal-open detection: body TEXT (`/apply to |contact info|additional questions|resume|review your
  application/i`) AND a Next/Review/Submit button OR a `N / pages` indicator. Do NOT use
  `querySelector('div[role=dialog]')` as scope.
- Poll up to ~12s for `input,textarea,select,div[role=radio]` (whole document) before concluding
  empty; re-click EA once if still none; only then report a clean failure.
- **ALWAYS vision-confirm (screenshot + vision_analyze) before concluding a modal is "empty".**
  The empty-modal conclusion was wrong, but the DOM-count-alone "glitch" claim was wrong 100% of
  the time this session — never trust a field count to mean "LinkedIn glitched."

### Vision-confirm + screenshot cleanup (user, XXXXXXX, HARD)
- Vision-confirm (screenshot + `vision_analyze`) at EVERY step of an application AND after a
  successful submission — do not trust the script's own `submitted` boolean or a DOM count.
- After EACH job application completes (success or fail), **DELETE the screenshots and temp
  files immediately** (`shot_*.png`, debug cruft). Keep only the working scripts
  (`apply_one.cjs`, `run_recursive.cjs`, `cdp_helper.cjs`) and `applied.json`. Never leave
  diagnostic PNGs lying around — stale screenshots mislead the next session and waste space.

### Past-24h collect + global newest-first (run_recursive.cjs)
Searches: `f_TPR=r86400&sortBy=DD`. Scrape each in the SAME tab; capture per-card
`{id, postedText, url}` where postedText = "X minutes/hours ago". `ageHours()` keeps `<=24`;
merge across searches and sort by ageHours ASC (newest first); apply in that order; dedup via
applied.json. One light pass per run; re-run accumulates (LinkedIn result sets shift between
loads, so a second pass surfaces jobs the first missed).

Full answer-bank + dispatch detail: `references/ea-profile-reasoning.md`.

## RECURRING SWEEP (how to run the "apply to latest N jobs" request)
Never run the driver as a hand-rolled `node sweep &` / `nohup ... &` daemon — Hermes' terminal
is a non-tty shell and **kills backgrounded `&` processes** ("stdin is not a tty", exits). Instead
use a Hermes **cron job** (every 15 min, `deliver=all`): each run heals LINKEDIN_PORT (`node heal_9222.cjs`
relaunches the profile if the port is dead), runs `node linkedin_apply_30min.cjs run`, and
accumulates in `applied_30min.json` until a target (e.g. 50). The cron survives session restarts
and model 503s. `heal_9222.cjs` probe: `curl -s -m5 http://127.0.0.1:LINKEDIN_PORT/json/version`.
- references/ea-answer-map.md — profile-driven answer bank, radio click recipe, "no Hermes Agent" rule.
- references/ea-profile-reasoning.md — XXXXXXX evolution: profile object, 3-tier dispatch,
  constrained LLM oracle, single-tab + empty_modal + past-24h-newest-first guidance.
- references/linkedin_cdp_freeze.md — Event 1002 evidence, reproduction, diagnosis recipe.
- references/ea_XXXXXXX_fixes.md — session receipts: wrong-dialog false "empty modal" proof, radio
  preceding-sibling extractor, Yes/No-for-years radio fix, f_TPR server-side (not text-parse),
  JS/frontend relevance pre-filter, screenshot auto-cleanup.
- references/ea_XXXXXXX_checkbox_alreadyapplied.md — consent-checkbox auto-check snippet + already_applied
  misclassification fix (NO_EA_BUTTON false-positive on already-submitted jobs).
- references/ea_supply_and_safety.md — safety-reminder gate, f_EA-ignored, 5h filter, score.
- references/ea_driver_simplicity.md — keep the EA driver SIMPLE: no LLM, mouse-click EA, single light pass; what the "universal" v3 broke.
- references/form-fill-react-gotchas.md — React form-fill: trusted typing, role=radio click, split-label questionTextFor, email-verify, guillemet IDs.
- CANONICAL DRIVER (XXXXXXX, current working pair): `XXXXXXX/job-apply/apply_one.cjs`
  (applies ONE job URL, fills every field from the verified profile + answer bank, submits, returns
  JSON with `submitted`/`confirm`/`unanswered`) and `XXXXXXX/job-apply/run_recursive.cjs`
  (scans the 6 relevant EA searches, applies up to N via `apply_one.cjs` per job, dedups in
  `applied.json`, skips throttled jobs). Run with `env -u PYTHONPATH node apply_one.cjs <url>` or
  `MAX_PER_RUN=5 node run_recursive.cjs`. The answer bank + field-fill logic live in `apply_one.cjs`
  (mirrored in `references/ea-answer-map.md`). NOTE: LINKEDIN_PORT background runs in Hermes' non-tty shell
  die ("stdin is not a tty", exit 1) — run foreground with a long timeout, or via cron; dedup makes
  re-runs safe. Do NOT follow the user-owned `linkedin-easy-apply` SKILL's LLM/marathon guidance.
- OUTDATED / BROKEN: the user-owned `linkedin-easy-apply` SKILL was rewritten into a complex
  "universal" v3 that (a) calls the Kilo LLM to auto-fill every unanswered field (BANNED —
  corrupts forms) and (b) runs a 14-keyword × 6-scroll `collectJobs` marathon that FREEZES
  this Chrome (Event 1002). It also opens EA via synthetic `clickText` (no-op on React).
  The SKILL itself is USER-OWNED — Hermes Agent cannot `skill_manage` it. operator must run
  `hermes curator adopt linkedin-easy-apply` to let Hermes Agent own/patch it. NOTE THE FILE/SKILL
  DISTINCTION: the SKILL is outdated, but the SCRIPT `XXXXXXX/job-apply/linkedin-easy-apply.cjs`
  (49KB) is the MATURE, ROBUST working engine — its scanner (`scanScript` + `questionTextFor`),
  profile-driven `decide()`/`answerFor`, resume selection, and Next/Review/Submit orchestration
  are sound. It is the better driver than `linkedin_apply_30min.cjs` (whose scanner is too weak
  for skill-year/radio questions and was the source of the "infinite Review loop" bug). Use
  `linkedin-easy-apply.cjs` with an `applicant.profile.json` (email/phone/CTC/SKILL_YEARS/
  answers) and the `--disable-extensions --disable-dev-shm-usage` launch flags. The React
  form-fill gotchas above were developed and verified against this script.
  Do NOT follow the user-owned SKILL's LLM/marathon guidance.

## Setup

Raw CDP driving for LinkedIn — anti-freeze discipline.

**Personal data needed:**
- `XXXXXXX` — your home directory
- `LINKEDIN_PORT` — Chrome debug port (default: LINKEDIN_PORT)
- `CHROME_PROFILE` — Chrome user data directory name

**Dependencies:**
- Node.js
- Chrome with `--remote-debugging-port=LINKEDIN_PORT`
- Logged-in LinkedIn session

**Placeholders used:** XXXXXXX, LINKEDIN_PORT, CHROME_PROFILE
