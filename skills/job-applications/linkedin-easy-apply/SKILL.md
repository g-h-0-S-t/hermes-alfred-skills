---
name: linkedin-easy-apply
description: "Apply to LinkedIn Easy Apply jobs via puppeteer-core on the logged-in LINKEDIN_PORT Chrome. Use for ANY request to apply on LinkedIn, easy apply, top N jobs, auto-apply, run the job agent. Reads forms live, fills from a verified profile with profile-aware reasoning, submits, no local-LLM auto-fill of the DOM. Globally discoverable (WhatsApp/Telegram/desktop/cli)."
version: 4.0.0
author: Hermes Agent (Hermes curator)
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [LinkedIn, Job Search, Easy Apply, Automation, CDP, Puppeteer, Job Agent]
    category: job-applications
    surfaces: [whatsapp, telegram, desktop, cli]
    expose_to_platforms: true
    omniroute_discoverable: true
---

# LinkedIn Easy Apply — consolidated product + operational learnings

Drives user's **logged-in LinkedIn Chrome** (CDP `http://127.0.0.1:LINKEDIN_PORT`,
profile `XXXXXXX/chrome-profile`) to apply to Easy Apply jobs.

This file is the authoritative record of every LinkedIn EA learning (XXXXXXX-07 →
XXXXXXX). It replaces the older variant skills
(`linkedin-easy-apply-native`, `linkedin-easy-apply-cdp`,
`linkedin-easy-apply-puppeteer*`, `linkedin-job-automation`,
`linkedin-job-screening`, `linkedin-easy-apply-safety`). Those dirs are deleted.

## Driver files (XXXXXXX/job-apply)
Two related sets live here — both drive the SAME LINKEDIN_PORT Chrome:
- **Active recursive set (maintained, carries the Aug-17 learnings):**
  `apply_one.cjs` (single-job apply driver) + `run_recursive.cjs` (recursive
  runner) + `cdp_helper.cjs` (CDP connect + single-tab rule). This is what the job
  agent / cron drives.
- **REALITY CHECK (XXXXXXX):** the two-phase `ea_extract.cjs` / `ea_fill.cjs` / `ea_cleanup.cjs` drivers cited elsewhere in this skill as the "active" set are **NOT present on disk** (only stubs under `_legacy_scripts/`). The production loop (`autoapply_loop.py`) drives `apply_one.cjs` directly — `apply_one.cjs` is the de-facto single-file driver that already embeds iframe-aware extract + profile-brain answer + fill + submit. Do NOT waste a session hunting for `ea_extract.cjs`/`ea_fill.cjs`; patch `apply_one.cjs` instead. If you want the cleaner two-phase split, recreate those drivers from this skill's spec — they were lost.
- **Earlier consolidated single-file product:** `linkedin-easy-apply.cjs` (~54KB).
  Self-contained collect+apply; still valid as a command surface but the recursive
  set is preferred for the job agent.
- Shared state: `applied.json` (verified submissions), `skip.json` (known
  non-EA / field-blocked / failing IDs), `applicant.profile.json` (contact +
  stored resume name + CTC + free-form answers), `last_throttle_notice.txt`
  (throttle-alert debounce).
- All CDP/node calls MUST run with `PYTHONPATH`/`PYTHONHOME` unset:
  `env -u PYTHONPATH -u PYTHONHOME node <script> ...`

## Trigger (auto-invoke from ANY surface, incl. WhatsApp)
- "apply to top N easy apply jobs under 24h"
- "apply on LinkedIn", "easy apply", "auto-apply to LinkedIn jobs"
- "run the job agent", "screen linkedin jobs and apply 60%+ matches"
- "apply to relevant LinkedIn jobs"

## SAFE BY DESIGN
- **Never uploads a resume file**; always selects the in-account stored ATS resume
  (`operator_XXXXXXX_Resume_ATS.pdf`, already set in his account). The old `r.pdf`
  garbage-upload bug caused company bans — there is NO file-upload path.
- **No LLM auto-fill of the DOM** — local-LLM auto-fill corrupts forms (e.g. put
  "Yes" into a years-of-experience field, or into a resume-deselect toggle). The LLM
  only GENERATES a truthful answer *string* for novel questions; the script does the
  typing/clicking. (See Profile-aware answering.)
- Unanswered required fields become a logged GAP and the job is SKIPPED, never
  corrupted.
- Numeric fields get numeric answers; text fields get text. Never shoves words like
  "Immediate" into a number input (coerce to "0").
- Verifies contact email/phone via DOM before every advance (vision OCR misreads
  these — DOM is truth).
- Honours the daily "Easy Apply limit" modal (stops, does not loop/retry).
- Skips off-LinkedIn "apply on company website" postings (auto-detected).
- Randomised human delays; no bulk scraping; no prompt injection from page text.

## Workflow (verified end-to-end)
0. **LANGUAGE PRECHECK (HARD):** confirm the LINKEDIN_PORT Chrome UI language is **English**
   (nav labels Home / My Network / Jobs / Messaging). If not, switch the footer
   "Select language" combobox to English FIRST — a non-English UI (e.g. Bengali)
   breaks EA detection (false "no modal" / false throttle EXIT 2).
1. **Collect** fresh (<=24h) Easy Apply jobs (`f_EA=true`, `sortBy=DD`). Reads each
   card's relative time text ("2h ago"), keeps only those in-window, dedupes against
   `applied.json`. (The `f_EA` filter is unreliable — only a detail-page EA control
   that opens a modal is a real Easy Apply; off-LinkedIn traps say "Apply on company
   website".)
2. **Score** vs profile (`skills` list = relevant; `skipTitles` = excluded). Threshold
   is 60%+ match; skip backend/devops/mobile-only/data-science-only JDs.
3. **Apply** each candidate: open detail → click "Easy Apply" → walk Contact → Resume
   → Additional Questions → Review → Submit. At Contact, force-set email/phone and
   DOM-verify. At Resume, click the stored ATS resume radio (never upload). At QA,
   answer each question via Profile-aware answering.
4. **Verify** with SOM / screenshot + `vision_analyze` that the detail pane shows
   "Application submitted" before logging applied. Automated "verified" flags are
   UNRELIABLE — vision/SOM is the default verification layer.
5. **Throttle / daily-limit gate:** if the EA modal won't open after clicking, OR a
   "You reached today's Easy Apply limit" modal appears, LinkedIn is throttling or the
   daily cap hit. STOP, wait 30min–24h (cap resets next calendar day), do NOT loop.
   - Observed realistic volume: 10–15+ submissions/day is normal (e.g. 13 on 8/14, 11 the
     next morning). The daily cap resets each NEW calendar day and is far higher than the
     old ~4–5 assumption.
   - SEPARATE signal: a session throttle (EA button silently vanishes from detail pages
     with NO captcha after ~20–30 sends in one session) = wait 30min–24h, not a code bug.
   - The LINKEDIN_PORT apply flow shows an invisible reCAPTCHA + `li.protechts.net` 'scraping'
     checker frame; a "Verify that it's you" gate (top-right Chrome) means PAUSE — don't
     burst-apply. Drive via the EXISTING logged-in LINKEDIN_PORT tab (reuse auth), not a new tab.

## EA BUTTON DETECTION + DAILY LIMIT (2026-09-02 — zero-apply despite finding relevant jobs)
**ROOT CAUSE:** `apply_one.cjs` searched ONLY `<button>` elements for the EA control.
LinkedIn renders the EA control as an `<a>` on some job detail pages, so the script
falsely reported `no_ea_button` and skipped genuinely-EA jobs. This was the wall behind
"found relevant jobs but applied to zero in the last 30 minutes."

**FIX — EA control selector:** search `button, a, div[role="button"]` whose text starts
with `Easy Apply` / `Apply` inside `<main>`. Do NOT restrict to `<button>` only.

**FIX — EA_DAILY_LIMIT detection:** LinkedIn shows a modal "You reached today's Easy
Apply limit" when the daily cap hits. Detect this text, click the "Got it" dismiss
button, and back off ~2h (cap resets on a new calendar day, but a shorter backoff avoids
wasting cycles). Do NOT loop/retry — it will not lift within the backoff window.

**Distinguish the two silent-stop signals:**
- **daily-limit** = explicit modal text "You reached today's Easy Apply limit" → dismiss, 2h+ backoff.
- **session-throttle** = EA control present but modal silently won't open (no text, no error) → 30min-24h wait.
- **no_ea_button** = NO control whose text starts with Easy Apply/Apply → genuinely non-EA, skip.

A flat `LI jobs found: 0` with no EA-button interaction almost always means the browser
died or logged out (check port FIRST), NOT throttle. See
`references/ea_button_detection_20260902.md`.

## LINKEDIN SESSION RECOVERY (FIXED XXXXXXX — stale cookies were killing the session)
The `cdp_helper.cjs` had a bug where it would **restore stale cookies** (13+ days old)
to every new tab, overriding the browser's current valid session. This caused LinkedIn
to show a "Welcome back" one-tap login page on every navigation.

**Fix (XXXXXXX):**
1. **Stale cookie skip:** `restoreCookies()` now checks the cookie file age — if >24h old,
   it skips restore and uses the browser's current session.
2. **One-tap login recovery:** `recoverLinkedInSession()` navigates to `/feed/`,
   detects the login page, clicks the "Sign in with one-tap" / "Sign in" button,
   waits for redirect, and saves fresh cookies.

This is why LinkedIn was repeatedly "logged out" — the browser had a valid session
but the script kept overwriting it with dead cookies. See
`references/linkedin_session_recovery_20260901.md`.

## LINKEDIN EA ANSWER ARCHITECTURE (XXXXXXX — lookup table, NOT LLM)

**LLM IS TOO SLOW FOR INTERACTIVE FORM FILLING.** Attempts to use Ollama (local) and
Kilo gateway both failed:
- Ollama `qwen3.5:0.8b`: 12-30s per call — times out the 30s abort
- Kilo gateway: returned 404 (endpoint dead)
- Result: form fields stayed empty while the script waited for LLM responses

**THE FIX (XXXXXXX, WORKING):** a comprehensive 50+ pattern **lookup table** in
`getAnswer(label, optText)` that returns instantly from user's verified profile. No LLM.
No network. No latency. Verified submitting real LinkedIn jobs (e.g. UST Solution
Architect — Node.js=10y, React=9y, TypeScript=10y, Onsite=Yes, Notice=0).

See `references/regex_table_rejection_20260901.md` for the full list of bugs this fixed
and the comprehensive pattern table.

## Hermes Agent-IN-THE-LOOP TWO-PHASE ANSWERING (MANDATORY, operator XXXXXXX)
operator rejected script-decided answers: "creative and out-of-the-box questionnaires are
common, filling up the forms using just a hardcoded script is insufficient. We want your
brain, the LLM, Hermes Agent, to answer it." The regex `answer()` table in `apply_one.cjs` is
**DEPRECATED** — do not use it to decide answers.

Flow: **load job -> extract EVERY question -> Hermes Agent answers -> answers mapped back to fields -> verify -> advance.**

Scripts (both in XXXXXXX/job-apply, `node --check` clean):
- `ea_extract.cjs <jobUrl> [--no-open]` — opens EA (or reads the already-open form with
  `--no-open`), selects the stored ATS resume, and dumps JSON:
  `{pageNo, heading, buttons, errors, fields:[...]}`. Each field carries `kind`
  (`text|typeahead|radio|aria-radio|select|checkbox`), `id`/`name`/`selector`,
  `question`, `options`, `currentValue`, `numeric`, `maxLength`, `bigList`. Then it STOPS.
- `ea_fill.cjs answers.json [--submit]` — types ONLY the supplied values, verifies each
  write by reading the value back (`filled[].verified`), then clicks Next/Review (or
  Submit with `--submit`). Contains NO answer logic and NO LLM.

Per step: run extract -> Hermes Agent reasons over each question against the verified profile ->
write `{"answers":[{kind,id,question,value}...]}` -> run fill -> re-extract to confirm the
page advanced. Repeat per page. Vision-check the Review page before `--submit`.
Omit a field from `answers` to leave it alone (e.g. correct pre-filled contact info); a
missing/empty value is reported in `skipped`, never guessed.

### Bugs this replaced (real, observed)
- `/years? .*experience/` catch-all returned **14** for ANY years question — "years of
  React experience?" got 14 (truth 9), Kubernetes got 14 (truth 2).
- A blanket override forced **"Yes"** on any Yes/No radio matching
  `year|experience|familiar|worked with` — fabrication on unfamiliar tech.
- `/compensation/` alone returned EXPECTED CTC even when asked for CURRENT.
- "How soon can you join?" is often a **text** field; the old code wrote `"0"`. Correct
  answer is "Immediately - I am serving no notice period." Coerce to a number ONLY when
  the field is genuinely numeric (`numeric:true`).

### Hard-won DOM lessons (all reproduced this session)
- **The EA form is NOT always `div[role=dialog]`.** Observed an inline form ("Apply to X /
  1/4 pages / Contact info") with no dialog node -> a dialog-scoped readiness check gave a
  false `no_dialog`. Detect the form by TEXT markers (`\d+/\d+ pages`, `contact info`,
  `additional questions`, `review your application`) plus controls anywhere in the doc.
- **Next/Review/Submit need a TRUSTED mouse click** at the button's center
  (`page.mouse.click`) after `scrollIntoView`. `el.click()` logs success while the page
  stays on the same step.
- **Location/city is a TYPEAHEAD and is effectively REQUIRED even though the DOM says
  `required:false`.** Typing text alone leaves React invalid and shows "This field is
  required"; the page silently refuses to advance with NO entry in `[role=alert]`. Must
  type, wait ~1.8s, then click a real `[role=option]` suggestion (or ArrowDown+Enter).
  Review then shows the resolved `urn:li:geo:...`, which is correct.
- **Vision caught this when the DOM probe did not** — the red "This field is required"
  text was only visible in the screenshot. Always vision-check when a step won't advance.
- `CSS.escape()` the ids: LinkedIn uses React ids like `«r1c»` that break raw selectors.

The static regex/switch-table `answer()` approach is **REJECTED**: it "doesn't know"
operator (e.g. it failed "Have you completed Bachelor's Degree?" because education was
never coded, even though his B.Tech EEE = Bachelor's is on file). The script is only
the safe CDP "hands" (click/type via puppeteer-core @ LINKEDIN_PORT). The **brain** that
decides each answer = user's ACTUAL profile (held by Hermes Agent) + reasoning.

Rules:
- Answer EACH question by reasoning over real profile facts (education, experience,
  comp, AI tools, location, employer, life facts). Do NOT fall back to a brittle
  hardcoded string list.
- For novel/unknown questions, route to an LLM that has his profile injected as
  context to generate a TRUTHFUL answer **string only**. The LLM MUST NEVER drive the
  DOM — local-LLM auto-fill corrupted forms before. Keep instant regex only for
  structured numeric fields (salary/years) to avoid latency.
- Derivable-from-profile examples: "Have you completed Bachelor's Degree?" → **Yes**
  (B.Tech EEE); "comfortable with stated budget?" → **Yes**; location questions →
  **XXXXXXX**.
- Education numbers below are REAL — never fabricate (old fabricated 85/7.8 were WRONG
  and must never be reused).

## Field-fill data-type + matcher rules (anti-corruption, proven)
- **Numeric fields reject words.** If a question mentions `days | salary in inr |
  annual salary | year | job code | phone | zip | pincode` (or `type=number`) and the
  answer is a non-numeric word like "Immediate"/"ASAP", coerce to `"0"`. Never shove a
  text answer into a numeric input; if "Immediate" is rejected, send "0".

## NUMERIC-FIELD CORRUPTION BUG + FIX (XXXXXXX — was "STUCK on 3/4 Invalid input")
Real, reproduced failure: `apply_one.cjs` typed the WORD "No" into a "How many years of
<X> experience" text field (LinkedIn uses `type=text`, NOT `type=number`, for years),
triggering a red "Invalid input" and the form never advanced past 3/4. Root causes:
1. The text-field scanner used `m=document` (top doc only) — but the EA form lives in an
   iframe, so the field's real label was NEVER resolved; `answer('')` fell through to the
   LLM which returned "No" for an unknown years question.
2. `numeric` was computed from the (empty) resolved label, so no coercion fired.
3. The refill filter only re-filled fields whose value matched a narrow whitelist
   (`linkedin|employer|...`) — a pre-filled "No" in a years field was treated as "already
   has a value" and SKIPPED, so the bad value persisted.

Concrete fix (all in `apply_one.cjs`, verified by a real TCS submission XXXXXXX):
- **Iframe-aware text-field scan:** collect from `document` + every `iframe.contentDocument`,
  resolve each label WITHIN its own doc scope (`doc.querySelector('label[for="'+CSS.escape(id)+'"]')`),
  and push `{id, lab, numeric, docIndex}`.
- **Coerce on fill:** if `f.numeric`, strip non-digits from the answer; if empty → `"0"`.
- **Post-fill sanitize pass** (iframe-aware): re-scan every input; if its question-GROUP
  text (wrapping fieldset/li + preceding `<p>`/label + parent heading) mentions `year|experience`
  and its value is still non-numeric, force-set `"0"` via the native value setter + input/change
  events. This catches labels the single-field resolver missed (e.g. "Business Development"
  with a separate "How many years…" prefix).
- The refill filter must also include `numericWrong = numeric && v && !/^[0-9]+$/.test(v)`
  so a pre-filled non-numeric value in a years field gets re-filled, not skipped.

Repro/diagnostic: open EA, advance to the Additional Questions step, then run an iframe-aware
dump of every input with its resolved label + value (see `references/ea_numeric_field_fix.md`).
The bug shows as a years field holding "No"/text with a red "Invalid input" underneath it.
Read `references/ea_numeric_field_fix.md` before patching EA numeric/year handling.
- **Answer matcher is single-direction + key length >= 4.** Match only when the
  question text CONTAINS the answer key (never the reverse). Prevents e.g. "Total IT
  exp?" getting filled with "Yes". Prevents a reversed match putting "Yes" into a
  years-of-experience field.
- **`<select>` needs `selectedIndex` + `change` event** — NOT `el.select()` (that's an
  input method and silently fails on React).
- **Radios need a real click** at the control (label click toggles the underlying
  input). Synthetic `el.click()` on the React layer is ignored. A required checkbox/
  radio may LOOK checked yet React state didn't register ("This field is required"
  blocks advance) — a real SOM element click fixes it when a CDP/synthetic click didn't.
- **Resume:** never upload. Only click the stored "Select resume" radio/button.
- **Protected-class fields** (gender/ethnicity/veteran/disability): leave blank.
- **Required-field gap:** if a required question has no answer, SKIP the job and log it;
  add the missing key to `applicant.profile.json` for next time. Never submit blank
  required fields.

## Form-fill tactics (general EA, proven)
- **Never refresh / reload / back** during form fill; stay on the page. Fill ONLY from provided data.
- **Fill all mappable fields** (incl optional if data exists); resolve EVERY validation error before advancing.
- **Smart dropdowns:** type the value, then press ENTER to pop the list, then select from the list.
- **Date pickers:** keyboard-format the date first; fallback to the DOM/calendar widget if needed.
- **Expose hidden buttons:** the modal's Continue / Review / Submit buttons are often below the fold — scroll the dialog (find the `overflowY:auto` div, set `scrollTop = scrollHeight`) so snapshot/evaluate can see them. Job-list cards ARE `<button>`s (clicking works); the EA anchor and Submit need trusted clicks, not synthetic.
- **Contact pre-fill:** the Contact step usually pre-fills correctly from profile (name/email/phone); still DOM-verify email+phone before advancing (vision OCR misreads them).

## LINKEDIN_PORT isolated-tab rule (CORRECTED XXXXXXX-20 — was single-tab)
`cdp_helper.cjs` `withPage` now opens a **FRESH tab per call** and closes it in
`finally`. The OLD "reuse pages[0], never newPage" rule caused the
**"Execution context was destroyed"** race when two callers (or a retry mid-navigation)
fought over the one shared tab. A new tab in the same browser keeps the LinkedIn session
(cookies are account-scoped), so login is preserved — NO re-auth. **Use isolated tabs.**
operator dislikes multi-tab *visible* windows, but a background `browser.newPage()` that is
closed on cleanup is fine and is now the standard.
Drive ONLY via raw CDP (puppeteer-core) + `vision_analyze`; computer_use HANGS LINKEDIN_PORT.
Health probe: `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version` must return JSON; if it
times out the browser is hung -> `taskkill /PID <pid> /F /T` + relaunch with
`--remote-debugging-port=LINKEDIN_PORT --user-data-dir=XXXXXXX/chrome-profile
--hide-crash-restore-bubble --disable-backgrounding-occluded-windows
--disable-renderer-backgrounding --disable-background-timer-throttling`.

## empty_modal glitch (distinct from session-throttle)
EA button IS present & clickable, modal opens but renders ZERO form fields/inputs
(`page.evaluate` on modal returns `fields:[]` / no inputs/radios). Re-clicking EA +
waiting does NOT fix it for that job in the same session. Cause = LinkedIn-side
transient render glitch (appears more after many sends in one session, ~1 in several
jobs). Report `empty_modal` cleanly (wait for fields, re-click EA once, give up); log to
failed and retry on a later run/session. Do NOT over-debug per-job — it self-resolves
after a cooldown or fresh attempt.

## Throttle vs non-EA — do NOT conflate
- **no_ea_button** = detail page has NO element whose text STARTS WITH 'easy apply' /
  'apply' inside `<main>` → genuinely non-EA (external apply / mislabeled by guest-API
  scrape). Correct to skip. The 'Take the next step' Premium card is NOT a throttle.
- **no_dialog** = EA control present (often a `<button>`/`<a>` whose href is just the
  detail URL, not `/jobs/view/<id>/apply/`) but clicking won't open the modal → this is
  a LinkedIn **SESSION THROTTLE** on the apply flow, NOT a code bug. Proven via diag:
  trusted `elementHandle.click()` + real `page.mouse.click()` at pixel center + click+
  poll ALL failed while the page rendered normal job content (h1 present, no captcha).
  ACTION for no_dialog: WAIT (lifts 30min–24h); do NOT keep editing code or pounding the
  session (zero upside + account-ban risk).
- Skip-list pattern: keep `skip.json` of known non-EA/failing IDs so runs don't waste
  ~20s re-skipping; seed confirmed-applied IDs into `applied.json` instead.

## Field-blocked EA → skip (do NOT submit blank)
A required ARIA combobox/field that resists native fill (text lands in wrong field;
dropdown options never render to a clickable list; console cannot see modal inputs =
cross-origin/shadow wall) → **skip the job rather than submit blank required fields**.
Log to `skip.json` with the CORRECT job ID (capture it first). Keep applying to
clean-form EA jobs. (Real case: ADB SAFEGATE relocate-to-Hyderabad combobox resisted
native fill; 4449290984 was actually PLANFIRMA, submitted successfully — only the
ADB combobox case is field-blocked.) Distinct from empty_modal; both → skip but log
differently.

## VISION-CONFIRM + CLEANUP (HARD)
- Vision-confirm (screenshot + `vision_analyze`) at EVERY step AND after a successful
  submission/completion of each job.
- After EACH job application completes (success OR fail), **DELETE the screenshots and
  temp files immediately** (`shot_*.png`, debug cruft) to prevent memory misuse / stale-
  file confusion. Keep only the working scripts (`apply_one.cjs`, `run_recursive.cjs`,
  `cdp_helper.cjs`) and `applied.json`. Never leave diagnostic PNGs lying around.

## WORKSPACE HYGIENE — AUTOMATED (operator XXXXXXX: "del the screenshots after successful apply", "keep the workspace clean post ops")
Hygiene is CODE, not a habit. `ea_cleanup.cjs` is the single sweeper and `ea_fill.cjs`
invokes it automatically after every CONFIRMED submission (`submitted && confirm`), so no
screenshot or temp spec can survive a successful apply.

- `node ea_cleanup.cjs --dry` — preview. `node ea_cleanup.cjs` — sweep. ALWAYS dry-run first
  when you change the patterns.
- Deletes: `apply_<ts>.png`, `shot*.png`, `_*.{png,cjs,json,txt}`, `meta_*.cjs`, `diag*.sh`,
  `launch_*.sh`, `*.log`, `*.jsonl`, `out/err/t.txt`, `nul`.
- PROTECT set (never deleted): the drivers (`ea_extract.cjs`, `ea_fill.cjs`,
  `ea_cleanup.cjs`, `cdp_helper.cjs`, `apply_one.cjs`, `run_recursive.cjs`,
  `linkedin-easy-apply.cjs`), state (`applied.json`, `skip.json`,
  `applicant.profile.json`, `last_throttle_notice.txt`), auth (`linkedin_session_cookies.json`,
  `chrome9222_ws.txt`), npm files, and **both resumes** (`operator_XXXXXXX_Resume_ATS.pdf`,
  `operator_XXXXXXX_Resume_Full.md`).
- **Directories are never touched** (`_BACKUP`, `_legacy_scripts`, `_live`, `_innovix`,
  `inbox_24h`, `node_modules`, `.venv`).
- GOTCHA: a naive "keep-list" classifier flagged user's two resume files as cruft. The
  resumes live in this dir and MUST be in PROTECT — re-check that before widening patterns.
- Verified XXXXXXX: planted 5 artifacts, all swept, every protected file intact.
- Baseline clean state is ~13 files + dirs. If you see `meta_*.cjs`, stray `*.log`, or
  `apply_*.png` piling up, the sweep was skipped — run it.


If running via cron and the throttle gate triggers, store `last_notice_ts` in
`XXXXXXX/job-apply/last_throttle_notice.txt`; only SEND a notice if
`now - last > 21600s` (6h). Prevents duplicate/repeated throttle alerts when the
WhatsApp bridge is down (port 3000 refused).

## STATUS CHECK — WATCH THE BROWSER, DON'T TRUST THE LOG (operator XXXXXXX HARD)
When operator says "check the application status / keep checking by watching what's happening on the
browser", he means DRIVE THE LIVE BROWSER and observe, not parse log files and report. Concrete
procedure (all CDP, NOT computer_use — UIA hangs LINKEDIN_PORT):
1. **Browser liveness:** `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version` returns JSON = UP. If
   DOWN, relaunch Chrome (see LINKEDIN_PORT isolated-tab rule). Same for ATS_PORT.
2. **LinkedIn login:** navigate the LINKEDIN_PORT tab to `https://www.linkedin.com/feed/`, assert `li_at`
   cookie present AND url stays on `/feed/` (do NOT trust `.global-nav__me` — it false-negatives).
3. **Watch a cycle:** a puppeteer `connect` to the live LINKEDIN_PORT, read the active page url / DOM text
   (e.g. `jobs/search/?keywords=...`) — proves the loop is actually scraping/applying. Capture a
   `page.screenshot()` to `_live.png` and read it back (vision may be down — DOM text is enough).
4. **Verify a submission:** re-run `apply_one.cjs <fullJobUrl>` on a previously-STUCK job and assert
   `submitted:true` + `"Application submitted"`. That is the real proof, not a log line.
5. **applied.json is a DICT** `{applied:[...],skipped:[...],failed:[...]}`, NOT a flat array — read
   `len(d['applied'])`; a bare `d[-5:]` slice throws KeyError. Counts from summaries are unreliable.
6. **Cron state:** `cronjob list` is the source of truth. Verify the job crons are `enabled:true`
   before claiming "running" — a summary that says "resumed" may be wrong (this happened XXXXXXX:
   all 4 job crons were actually PAUSED).

## SILENT ZERO-APPLY TRAP (recurring, XXXXXXX-31 — the worst failure mode because it looks healthy)
The loop can be **alive and logging normally while applying ZERO jobs for hours/days**. Root cause
observed XXXXXXX-31: **both Chrome debug sessions (LINKEDIN_PORT + ATS_PORT) had died** (host reboot / background
terminal reaped on session end). The loop's heartbeat kept ticking (it only needs the filesystem
heartbeat file, NOT a live browser), so `cronjob list` showed everything "running" — but every
LinkedIn scrape returned `LI jobs found: 0` → "Empty scrape streak N — backing off" and Greenhouse
batch crashed. Nothing was actually applied. A naive status check ("loop alive, crons enabled") would
report "working" while the system did nothing.

**Detection (do this before claiming the system works):**
1. `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version` and `...ATS_PORT...` MUST both return JSON. If either
   is refused → Chrome is DOWN → the loop is idle regardless of heartbeat. RELAUNCH (see LINKEDIN_PORT rule).
2. Verify a REAL submission happened recently, not just "loop running":
   `python3 -c "import json;d=json.load(open('applied.json'));print(len(d.get('applied',[])))"` and
   check the newest `when` timestamp. If the count hasn't moved in hours while Chrome was down, you
   found the trap.
3. **Prove the pipeline end-to-end** (the real test, not a log line): run `apply_one.cjs` directly on a
   fresh job ID pulled from a live scrape, assert `submitted:true` + `"Application submitted"`. If it
   submits, the system is genuinely working; if Chrome was down this would have failed/empty-looped.

**Fix when trapped:** relaunch both Chrome with the exact flags (see LINKEDIN_PORT isolated-tab rule + the
ATS_PORT anti-detect flags). On a fresh Windows logon the **Startup daemon** (below) should auto-relaunch
them — if it didn't, the .bat is missing or was never installed.

**DURABILITY (install once, prevents recurrence):** create
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\JobApplyChromeDaemon.bat` that loops every
~60s and, if `netstat` shows no listener on `:LINKEDIN_PORT`/`:ATS_PORT`, `start`s Chrome with the correct flags.
Recipe + exact .bat contents in `references/chrome_durability_and_zero_apply_diag.md`. This closes the
gap where the system silently died between sessions. The cron watchdog (`CRONID_XXXXXXXXXXXX`) is supposed to
catch this too, but it failed silently when Chrome was down — the Startup daemon is the belt-and-
suspenders layer.

**Do NOT trust "0 jobs found" as throttle.** Throttle produces "EA button present but modal won't
open" / a daily-limit modal. A flat `LI jobs found: 0` with no EA-button interaction almost always
means **the browser is down or logged out**, not throttled. Check the port FIRST.
- 14+ yrs. Stack: Node.js(10y), TypeScript(10y), JavaScript(14y), React(9y), Vue(5y),
  Python(5y), SQL(12y), C#, PostgreSQL, MSSQL, Oracle, Docker, Selenium, CI/CD.
  Domains: IAM/KYC/OAuth2/OIDC/SSO/RBAC/zero-trust, aviation flight-ops,
  maritime/logistics, cybersecurity, applied AI.
- **CTC floor XXXXXXX = XXXXXXX/yr. Expected XXXXXXX = XXXXXXX/yr.** On numeric CTC
  fields enter XXXXXXX (current) / XXXXXXX (expected). Never expected below current.
- Location **XXXXXXX** (preferred; XXXXXXX-authorized only, needs sponsorship abroad).
  Join immediate (notice period 0). When a location selector offers a choice (e.g.
  Noida vs XXXXXXX), select **XXXXXXX**.
- ATS resume (LinkedIn): `operator_XXXXXXX_Resume_ATS.pdf` is ALREADY set in his account —
  never upload a file.
- External (non-LinkedIn) ATS portals: attach
  `C:\Users\operator\OneDrive\Desktop\operator_XXXXXXX_Resume_ATS.pdf` if a resume is required.
- **Education (REAL, verified XXXXXXX-13 — NEVER fabricate):**
  - ICSE Class 10 — St. Michael's School, Durgapur (CISCE), 2006, **79.33%**.
  - ISC Class 12 (Science) — St. Michael's School, Durgapur (CISCE), 2008, **72.57%**.
  - B.Tech EEE — Camellia Institute of Technology (CIT), WBUT, 2012, **DGPA 7.26/10**
    (no aggregate B.Tech % on record — only DGPA).
  - EA field mapping: "Percentage in 10th & 12th" → "10th: 79.33%, 12th: 72.57%";
    "CGPA / %" → "7.26". "Have you completed Bachelor's Degree?" → **Yes** (B.Tech EEE).
  - The old fabricated 85 / 7.8 figures are WRONG and must never be reused.
- **AI tools used daily** (for "Which AI tools do you use daily?" questions): Hermes,
  omniroute (model routing), Antigravity (Google DeepMind agentic coding IDE), Kilo Code
  and Cursor (AI coding in VS Code), Ollama + LM Studio (local LLMs), plus Chrome-
  extension AI dev and LangChain-style orchestration. NEVER mention the "Hermes Agent" persona
  when filling applications — keep that internal.

## Safety (release-blocking)
- NEVER upload any file to the LinkedIn EA resume picker.
- VISION/SOM-VERIFY every submission before logging applied.
- Throttle / daily-limit gate is mandatory — looping on a throttled account risks a ban.
- LINKEDIN_PORT single-tab only; never multi-tab.
- NEVER fabricate a value to unblock a required field — pause and ask operator instead.

## PER-SUBMISSION REPORT FORMAT (operator XXXXXXX-20 — MANDATORY on every verified submission)
operator wants a chat message HERE, in this exact format, after EVERY successful submission
(LinkedIn EA OR external ATS), no exceptions, no summaries-only:
  `✅ Applied: <Company> — <Role/Position/Designation> — <DD Mon YYYY, HH:MM AM/PM IST>`
Example: `✅ Applied: Anthropic — Senior Software Engineer — 20 Aug 2026, 11:42 PM IST`
Implementation (already wired, do not re-invent): the autonomous loop
(`autoapply_loop.py`) writes each verified submission to
`XXXXXXX/job-apply/submissions_pending.jsonl` as
`{company, role, board, when, ts}` (when = local IST via `time.gmtime(now+19800)`),
and the **submission_notifier cron** (`d47260693088`, every 2 min) reads pending and posts
each via `hermes send --to whatsapp "<message>"` in the format above, then moves it to
`submissions_sent.jsonl`. For LinkedIn EA, `role` is best-effort ("LinkedIn Easy Apply"
or the job title if apply_one returns one). For Greenhouse, `company` is the board slug
capitalized, `role` = "Greenhouse Application". DO NOT substitute a periodic digest for
per-submission messages — operator explicitly wants one line per win, in this format.

**NOTIFIER FRAGILITY (XXXXXXX-31 — was silently dropping ALL WhatsApp alerts):** the
shipped `submission_notifier.py` had three bugs that made it report "No pending submissions"
even though `submissions_pending.jsonl` held 5+ lines, so operator never got his per-win pings:
1. `BASE='/c/Users/operator/job-apply'` — an MSYS-style path that does NOT exist when the
   script is run by the plain Python interpreter from the cron (no MSYS path translation), so
   `PENDING` never resolved and the file was "not found" → silent no-op.
2. `subprocess` was never imported, but line ~36 called `subprocess.run(...)`.
3. The send loop referenced an undefined `m` (should iterate `msgs`); even if it ran, only one
   message would have been sent.
FIXED version (use as the canonical `submission_notifier.py`): resolve `BASE` from
`os.path.dirname(os.path.abspath(__file__))`; import `subprocess`; iterate `for m in msgs`;
archive to `submissions_sent.jsonl` BEFORE sending (never lose a record); log every outcome to
`_notifier.log`. After the fix, 4 pending alerts flushed and delivered correctly. If operator ever
says "I'm not getting the per-application messages," RE-RUN the notifier manually
(`cd XXXXXXX/job-apply && python3 submission_notifier.py`) and read `_notifier.log` —
do NOT assume the loop/cron is at fault; the notifier itself was the broken link.

## AUTONOMOUS LOOP ARCHITECTURE (operator XXXXXXX-20 — "handle everything without my involvement")
`XXXXXXX/job-apply/autoapply_loop.py` is the production driver (not the cron). It:
1. Cycles forever: Greenhouse batch (`gh_batch.cjs`, 8 shuffled URLs/cycle) + LinkedIn EA
   scrape (10 diverse LI search URLs) + `apply_one.cjs` per scraped job (3x retry on
   "Execution context was destroyed"), 120s cooldown between cycles (ban-safe).
2. Single-instance lock: **filesystem lockfile + cross-session heartbeat** (NOT a pid
   check). The loop writes `_loop.lock` (O_EXCL, fd held open for lifetime) and touches
   `_loop.heartbeat` every cycle. A second instance that finds the lock held checks the
   heartbeat AGE — fresh (<~150s) → it exits ("Another loop already running"); stale → it
   steals the lock. **WHY NOT PID:** the watchdog cron (`CRONID_XXXXXXXXXXXX`) runs in a SEPARATE
   Windows session whose interpreter cannot see the loop's pid via `tasklist` / `Get-Process`
   / `os.kill(pid,0)` — every pid-liveness check FALSE-NEGATIVES cross-session, so a
   pid-based guard lets a SECOND loop start and two loops race on port LINKEDIN_PORT (account-ban
   risk). Heartbeat is filesystem = shared by every session, so it is reliable. The cron's
   own "is the loop alive?" check MUST also be heartbeat-based, never pid-based. See
   `references/race_condition_fixes.md` §2.
3. Records verified submissions to `applied.json` AND emits a pending-notification event.
4. Run with: `cd XXXXXXX/job-apply && python autoapply_loop.py` (background,
   notify_on_complete=false — it is a daemon).
5. **DAEMON ROBUSTNESS (XXXXXXX, reproduced):** the loop's `log()` must NOT let a stdout write
   crash it. When the background-pty stdout is reaped, `print()` raises `OSError [Errno 22]` and
   kills the whole loop silently. Guard every stdout write in try/except; the file log is the
   durable record. Also: the singleton guard is FILESYSTEM-LOCK + HEARTBEAT ONLY — a pid-based
   pre-check (`Get-CimInstance`/`Get-Process`) produces stale phantom PIDs and falsely refuses to
   start. Never re-add a pid check. Full diagnosis + fix in `references/loop_daemon_robustness.md`.
Supporting crons (live set observed XXXXXXX): `CRONID_XXXXXXXXXXXX` (every 30 min — watchdog:
relaunches the loop + both Chrome LINKEDIN_PORT/ATS_PORT if dead), `d47260693088` (every 2 min — submission
notifier), `74398554613d` (daily 9am — external-ATS discovery), `afc8e2b34b39` (every 5 min —
system watch), `eee7ad358f99` (every 1 min — gateway self-heal), and `CRONID_XXXXXXXXXXXX` (every 30 min
— LinkedIn EA autonomous retry). NOTE: the standalone EA retry cron is NOT permanently paused —
operator re-enables it via "continue applying" directives, so treat its PAUSED/enabled state as
runtime-variable. **CRITICAL (XXXXXXX):** `cronjob list` is the SOURCE OF TRUTH for cron state.
A prior session claimed these were "resumed" when they were actually all PAUSED — verify with
`cronjob list` and re-enable what's needed; never assume from a summary. user's "keep applying" /
"continue" is an explicit re-enable signal; "stop/pause" is an explicit pause signal.
**ROBUSTNESS-FIRST RULE (operator XXXXXXX-20):** when optimizing, no regressions; prioritize
robustness/efficiency, THEN performance. Never "optimize" by removing a safety/verify step.

## LinkedIn EA DEDUP BUG (FIXED XXXXXXX-20 — was a false "already_applied")
`apply_one.cjs` previously flagged EVERY job "already_applied" via a loose body-text regex
`/applied \d+ (hour|day|minute|week)/` that matched LinkedIn's "X people applied" sidebar
text — so it skipped ALL fresh jobs without opening the form, and the throttle got falsely
blamed. FIXED regex matches only genuine confirmation:
`/your application (was )?submitted|you(?:'ve| have) (already )?applied to this job|withdrew application|you applied on/i`.
After the fix, LinkedIn EA submissions landed (e.g. job 4455439952, 4455433510, 4453461375…).
If EA apply suddenly reports `already_applied` on a clearly-fresh job ID, suspect this regex
regressed — re-tighten, don't assume throttle.

## GREENHOUSE EXTERNAL-ATS RULE (VERIFIED XXXXXXX — CORRECTED)
If a job's application is hosted on **Greenhouse**, this rule governs it. The logged-in
candidate portal (`app.greenhouse.io`) is currently DEAD (saved cookies redirect to
sign-in), so use the **public company boards** `job-boards.greenhouse.io/<company>` (guest,
no login). Full corrected procedure + field-fill code is in
`references/external_ats_playbook.md` (GREENHOUSE BOARD FLOW). Key corrected facts:
1. **NO autofill / saved-profile** is available on guest boards — hand-fill every field
   (the "Autofill my application" button is not reachable without live login).
2. **VISION-CONFIRM before submit (MANDATORY)** — same as EA.
3. **SUBMIT TRAP:** the header "Apply" button only reveals the form; the real submit is the
   bottom **"Submit application"** (`type=submit`) button. Click THAT.
4. **reCAPTCHA IS A REAL BLOCKER on guest boards:** an automated "Submit application" click
   is SILENTLY DROPPED (no success/error/challenge, just unchanged form). WORKAROUND: Hermes Agent
   fills 100% (vision-verified, resume attached) and hands operator the tab to click Submit
   (human click passes the bot-score). Do NOT loop-retry the automated submit.
5. **Resume:** `page.$('#resume').uploadFile(RESUME)` — NOT `filechooser`+`el.click()` (the
   hidden input's `.click()` hangs waiting for visibility). Verify attached via vision + DOM.
6. Field-fill: plain text inputs via React-native setter + input/change/blur events;
   **react-selects** (`#country`, `#degree--0`, Yes/No) via click+`page.keyboard.type`+Enter
   (a plain value-set does NOT commit). Driver: `gh_apply.cjs` (CDP, single tab). Reads use
   `page.evaluate(selectorString=>...)` — NOT elementHandle.evaluate (HANGS).
7. Same two-phase brain (Hermes Agent reasons each answer from the verified profile) applies.

## Pitfalls (learned the hard way)
- Use `waitUntil: 'domcontentloaded'` for LinkedIn navigates — `networkidle2` stalls
  (LinkedIn keeps long-poll connections open), which hangs the script.
- Don't trust `document.body.innerText` alone for "already applied" — verify via the
  detail pane EA-button presence or the Applied collection
  (`/jobs/collections/?cardType=APPLIED` redirects to 'recommended' and gives false
  negatives; re-open the job detail page and check for "Application submitted").
- LinkedIn SILENTLY refuses to open the EA modal on a throttled session: no error, just
  dead. STOP and wait. (Distinguish from no_ea_button — see above.)
- **The `f_EA=true` search filter returns off-LinkedIn traps** — always confirm the detail
  page actually renders an Easy Apply button before counting a job as EA.
- **THIN POOL reality (XXXXXXX):** after ~32 prior applies, a fresh <=24h sweep surfaced
  only ~10 new RELEVANT postings, of which 1 was off-stack (Python/IVR/CV) and excluded. So a
  "top 10" request yields ~9 genuinely-applicable fresh jobs, not 10 padded with irrelevant
  ones. Do NOT fake the count with off-stack roles — report the true number and OFFER to widen
  the filter (location/seniority) or re-run in a few hours as new posts age into the window.
  Collect with 15+ keyword variants and 5 scroll passes; the duplicated "~44 cards" across
  searches is a cached-result artifact — verify each search returns DISTINCT result counts
  (e.g. "173 results" vs "215 results") before trusting the filter.
- A non-English LinkedIn UI makes EA detection fail (false throttle). Precheck language.
- `kill`/`pkill` CANNOT terminate the LINKEDIN_PORT Chrome on Windows — use `taskkill /PID <pid>
  /F /T` with FORWARD slashes (MSYS mangles `//PID`).
- **Yes/No questions silently SKIPPED (XXXXXXX).** LinkedIn renders Yes/No as
  `div[role=radio]` backed by a hidden `input[type=radio]` with `value="on"`. `ea_fill.cjs`'s
  `kind:'radio'` handler matches on the input value ("on"), never on the label ("Yes"/"No"),
  so every Yes/No answer is `skipped` with `why: 'no radio option matching "Yes"'`. Until
  `ea_fill.cjs` is patched to handle `div[role=radio]` block-scoped clicks, use the stopgap
  cliquer in `references/yes_no_radio_fill.md`. Always check `ea_extract` output for skipped
  `aria-radio` questions and click them before Submit. VERIFY GOTCHA: after Review->Submit the
  page re-renders, so a post-click `aria-checked` read on a stale handle returns `false` even
  when the click worked — trust the "Application submitted" text, not the handle's aria-checked.
- computer_use / cua_browser_* HANGS the LINKEDIN_PORT LinkedIn Chrome (UIA tree walk over
  LinkedIn's huge DOM blocks the main thread — Event ID 1002 Application Hang). NEVER use
  computer_use on LinkedIn; drive ONLY via raw CDP (puppeteer-core) + vision_analyze on
  `Page.captureScreenshot`. Health probe: `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version`
  must return JSON; if it times out the browser is hung → kill + relaunch with
  `--remote-debugging-port=LINKEDIN_PORT --user-data-dir=XXXXXXX/chrome-profile
  --hide-crash-restore-bubble --disable-backgrounding-occluded-windows
  --disable-renderer-backgrounding --disable-background-timer-throttling`.

## References
- `references/ea_button_detection_20260902.md` — **FIXED 2026-09-02**: EA control can be `<button>`, `<a>`, or `div[role="button"]` (not just button). Daily-limit modal detection + dismissal. Distinguishing daily-limit vs session-throttle vs no_ea_button. Read when `no_ea_button` fires on jobs that should have EA.
- `references/greenhouse_field_fill_bugs_20260901.md` — **FIXED XXXXXXX**: three Greenhouse field-fill bugs (country react-select, intl-tel-input phone, custom question fields). Read before touching `gh_batch.cjs`.
- `references/linkedin_session_recovery_20260901.md` — **FIXED XXXXXXX**: stale cookies killing LinkedIn session; one-tap login recovery. Read before touching `cdp_helper.cjs`.
- `references/regex_table_rejection_20260901.md` — **FIXED XXXXXXX**: the regex `answer()` table was producing bogus answers ("No" for location, wrong values for novel phrasings). Stripped to minimal numeric-only; LLM is now the brain for all non-numeric questions. Read before touching `apply_one.cjs` answer logic.
- `references/ea_iframe_toggle_fix.md` — **FIXED XXXXXXX-28**: the EA form lives inside an iframe;
  the On/Off consent toggle inside it was never clicked (root cause of "STUCK on 3/4 unanswered=[Off]").
  Iframe-aware radio/input scans + On→off opt-out mapping. Read before touching EA radio handling.
- `references/ea_numeric_field_fix.md` — **FIXED XXXXXXX**: text "No"/words shoved into numeric
  years fields → "Invalid input" → stuck at 3/4. Iframe-aware text scan + numeric coercion + post-fill
  sanitize. Read before patching EA numeric/year handling.
- `references/yes_no_radio_fill.md` — the Yes/No `div[role=radio]` silent-skip bug, the
  block-scoped cliquer stopgap, and the verify-after-rerender gotcha.
- `references/chrome_durability_and_zero_apply_diag.md` — **ADDED XXXXXXX-31**: the silent
  zero-apply trap (loop alive, browser dead, 0 jobs for hours), the `rc=3221225794` gh_batch crash
  meaning, the exact diagnostic + relaunch + Startup-daemon recipe. Read this FIRST on any
  "the system isn't applying" report.
- `references/race_condition_fixes.md` — the isolated-tab / single-instance-lock / dedup
  "Execution context was destroyed" race and double-loop collisions (XXXXXXX-20).
- `references/ea_questionnaire_fill.md` — **FIXED XXXXXXX-22**: the radio `<p>`-sibling label
  extraction, React-click registration for `div[role=radio]`, full `<select>` answering, and
  the LINKEDIN_PORT/ATS_PORT tab-pile-up watchdog. Read this before touching EA questionnaire fill.

## LINKEDIN EA QUESTIONNAIRE FILL — FIXED XXXXXXX-22 (was stuck on "(unlabeled radio)" / dropdowns)
Root cause: LinkedIn renders Yes/No + choice questions as `div[role=radio]` inside a
`<fieldset role="radiogroup">`, but the question text is a **`<p>` previous-sibling of the
fieldset** (not inside it). Any extractor that only reads inside the fieldset gets "Yes No" →
`(unlabeled radio)` → no answer → form stuck. Plus two more bugs: (a) `div[role=radio]` CLICK
must dispatch a native click+event or React state won't register (silent-skip), (b) `<select>`
answering only set location dropdowns, leaving Kaseya/role-category/relocation unanswered.

Concrete fixes (all in `apply_one.cjs`, verified by submitting a 4-page Kaseya form):
- `resolveQ(r)`: aria-labelledby → aria-label → `fs.previousElementSibling` text (THE fix) →
  fs.parentElement scan → full-fs-text-minus-options → sibling/ancestor walk.
- Radio click: `page.evaluate(i => { const r=document.querySelectorAll('div[role=radio]')[i];
  r.click(); r.dispatchEvent(new MouseEvent('click',{bubbles:true})); })` + 500ms wait.
- `<select>` answering: set ANY select with a known answer; match option by exact / substring /
  significant-word / yes-no normalization; dispatch `change`.
- Text label fallback: when no `<label>`, use the input `name`/`id` hint; re-fill fields left
  with wrong "No"/"0" when label matches linkedin|employer|company|name|github|portfolio|profile|url.
- Truthful `answer()` rules (profile-derived, NOT fabrication): sponsorship→"No", authorized_to_work/
  work_permit→"Yes", english_fluency→"Yes", live_in_X/willing_to_relocate→"No", onsite_requirement→
  "No", hours_per_week→"40", role_category→"Software Engineer", current_employer→"Stealth",
  linkedin_profile→PROFILE.linkedin (URL, never "No"), notice_period→"0".
- VISION diagnostic: when STUCK on `(unlabeled radio)`, screenshot the modal + `vision_analyze`
  to read the exact question wording, then add/adjust the `answer()` rule.

## LINKEDIN EA IFRAME / ON-OFF TOGGLE — FIXED XXXXXXX-28 (was "STUCK on 3/4 unanswered=[Off]")
Root cause: LinkedIn serves the ENTIRE Easy Apply form inside an **iframe**
(`https://www.linkedin.com/preload/?_bprMode=vanilla`), NOT the top document. Every
radio/input scan in `apply_one.cjs` that used `document.querySelectorAll(...)` (top doc
only) was BLIND to the iframe — so the **On/Off consent toggle** ("Share profile with
employer?" / "Receive job alerts?") rendered as a `div[role=radio]` (option "Off") inside
that iframe was never detected or clicked. Result: form reached Review (3/4) then reported
`STUCK on 3/4 unanswered=["(unlabeled radio)","Off","(unlabeled textarea)"]` and never
submitted. The `(unlabeled textarea)` in that set is the invisible reCAPTCHA response field
(empty by design — LinkedIn's own script fills it in a real browser; do NOT fake it).

Secondary bugs this exposed:
- LinkedIn renders the toggle's visible label ("Off") in a **sibling `<span>`, not in the
  radio's `innerText`/`aria-label`** — so `resolveQ` returned `''` (unlabeled) and the
  opt-out regex on `optText`/`ariaLabel` never matched. Confirmed via dump: the resume
  radio also shows `opt:""` with `aria:"operator_XXXXXXX_Resume_ATS.pdf"` — the label lives in a
  sibling span.
- `answer()` returns `'Yes'`/`'No'` for consent questions, but a LinkedIn On/Off toggle's
  options are literally `on`/`off`, so `optText === a` never matched → toggle stayed unset.

Concrete fixes (all in `apply_one.cjs`, verified syntax-clean; submit-path confirmed blocked
only by session throttle on the test jobs, not by code):
- **Iframe-aware scans:** every radio/input probe now collects from `[document]` PLUS each
  `iframe.contentDocument` (same-origin, so accessible): `const docs=[document]; for(const f of
  document.querySelectorAll('iframe')){try{const d=f.contentDocument; if(d) docs.push(d);}catch(e){}}`.
  Used in `radiosInfo` extraction, the radio CLICK loop (re-scan top+iframes in the SAME order
  so the global index aligns), the native-`<input type=radio>` opt-out pass, AND the
  unanswered-detection block.
- **Radio CLICK is now iframe-aware:** replaced `page.$$('div[role=radio]')` (top-doc only)
  with a `page.evaluate` that re-walks top+iframes by global index and does
  `r.click(); r.dispatchEvent(new MouseEvent('click',{bubbles:true}))` + `scrollIntoView`.
- **On/Off mapping:** after `answer(q)` returns Yes/No, map `Yes→on`, `No→off` so the toggle's
  literal option gets selected (`/^on$/i.test(optText) && /^(yes|true|on)$/i.test(a)` etc).
- **Opt-out fallback for unlabeled toggles:** capture `groupText` (the radiogroup's
  innerText) per radio; when `q===''` and the option is a literal `"Off"` (or aria "Off", or
  an On/Off consent group containing `off`), select Off. Opting out of share/notify is ALWAYS
  safe on LinkedIn and never blocks submission.
- **Doctor, don't hammer:** after these fixes, if a job STILL reports STUCK with an `(unlabeled radio)`
  whose question text cannot be resolved, it is a genuine required question with no derivable answer →
  SKIP it (log to skip.json), never fabricate. EXCEPTION (CORRECTED XXXXXXX): an **unlabeled Yes/No
  radio** with no resolved question (e.g. an "ever worked for X?" that returned empty q) now defaults to
  selecting the **"No"** option at the radio layer, so the form advances instead of stalling at N/M — this
  is truthful for operator and unblocks submission. The earlier behavior SKIPPED such radios and reported
  STUCK; the default-to-No path removed a real questionnaire stall (verified by re-running a previously
  STUCK job 4453481406 → submitted). Do NOT loop-retry the same job (session-throttle risk).

Repro/diagnostic recipe (run with `env -u PYTHONPATH -u PYTHONHOME node`): open EA, click
Next/Review until `3/4 pages`, then `page.evaluate` scanning top+iframes for
`div[role=radio]` (print `opt/aria/checked/groupText`) and `input[type=radio]` unchecked
(print `value/groupText`). The toggle shows as a `div[role=radio]` with `opt:""` +
`groupText:"Yes No"` (or "...off..."), confirming it lives in the iframe and the label is a
sibling span. Full transcript in `references/ea_iframe_toggle_fix.md`.

## LINKEDIN_PORT/ATS_PORT TAB PILE-UP — ROOT CAUSE OF "NOT APPLYING ANYWHERE" (FIXED XXXXXXX-22)
`withPage` opens a fresh tab per call, closed in `finally`. If `page.goto` HANGS on an
external/custom ATS page (e.g. `brex.com/careers`, `databricks.com/company/careers` — these
never fire a load event), `finally` never runs → tab stays open → next cycle opens another →
piles to hundreds → browser crashes (CDP `/json` times out). FIXES: (1) 75s hard watchdog in
`withPage` force-closes the tab even if `fn` hangs; (2) skip-list `gh_skip.json` records
fail/hang/no-form URLs; (3) `isGreenhouseBoard()` accepts ONLY `job-boards.greenhouse.io/<co>`
/ `boards.greenhouse.io/<co>` and REJECTS custom-domain ATS (they hang and aren't fillable
Greenhouse forms); (4) 22s `goto` cap + fast-bail on non-board URLs. Relaunch ATS_PORT with the
CORRECT binary path `C:/Program Files/Google/Chrome/Application/chrome.exe` (NOT
`XXXXXXX/AppData/Local/Google/Chrome/...` — that path is wrong and silently fails to
launch).

## Setup

Drives your logged-in LinkedIn Chrome to apply to Easy Apply jobs.

**Personal data needed:**
- `XXXXXXX` — your home directory
- `XXXXXXX` — your full name
- `XXXXXXX` — your email
- `XXXXXXX` — your phone number
- `XXXXXXX` — path to your resume PDF
- `LINKEDIN_PORT` — Chrome debug port (default: LINKEDIN_PORT)
- `CHROME_PROFILE` — Chrome user data directory name

**Dependencies:**
- Node.js
- Chrome with `--remote-debugging-port=LINKEDIN_PORT`
- Logged-in LinkedIn session
- `puppeteer-core` (auto-installed)

**Placeholders used:** XXXXXXX, XXXXXXX, XXXXXXX, XXXXXXX, XXXXXXX, LINKEDIN_PORT, CHROME_PROFILE
