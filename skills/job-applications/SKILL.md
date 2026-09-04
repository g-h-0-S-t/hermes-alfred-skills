---
name: job-applications
description: "operator job hunt: resume, cover letter, PDF, ATS, outreach."
version: 1.0.0
author: Nous Research
license: MIT
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [Job Search, Resume, Cover Letter, Referral, Outreach, ATS, TARGET_COMPANY, Identity]
    category: productivity
---

# Job Applications (XXXXXXX / operator)

End-to-end targeted job hunt for operator: research a SPECIFIC company + role, build a tailored resume and cover letter from his real data, render them to PDF, ATS-optimize, then run outreach (Gmail referral with PDF attached; LinkedIn message drafted for him to send, never auto-posted).

## user's durable profile (use for targeting)
- Senior/Staff Full Stack + Applied AI SWE, 14+ yrs. XXXXXXX/XXXXXXX-based, authorized to work in XXXXXXX, open to hybrid/remote.
- DEEP specialty = **Identity / IAM / KYC / OAuth2 / OIDC** (EMPLOYER_1 Spot Award for an OIDC component that cut SSO failures 28%; EMPLOYER_2 + EMPLOYER_3 enterprise security for Apple/SingPost). This is his #1 differentiator.
- Stacks: Node.js/Express, TypeScript, React, Vue 2/3, AngularJS; REST/SOAP, microfrontends, microservices; MSSQL/Oracle/PostgreSQL; OWASP/AES-256/RBAC.
- Domains: aviation (EMPLOYER_6 flight-ops, EMPLOYER_4 GDS), maritime (EMPLOYER_1), logistics, cybersecurity, enterprise SaaS, applied AI (XXXXXXX, local LLMs/Ollama).
- **Last CTC: INR XXXXXXX (`XXXXXXX`/yr). THIS IS THE FLOOR.** Never quote a current
  CTC below OPERATOR_CURRENTCTC, and never an expected CTC at or below it, on any form or in any
  negotiation. Expected ask ~1.15-1.4x, i.e. roughly 100L-120L (`XXXXXXXXX` is the
  default expected figure). **The older "~48L take-home floor" note was WRONG and is
  revoked** — it caused two real applications to go out under-quoted on XXXXXXX-07
  before operator corrected it. If any doc, script, or answer bank still says 48L, fix it.
- GitHub `YOUR_GITHUB_USERNAME` (public) contains EXPLICIT DoS/intrusion tooling + Anonymous hacktivism bios. MUST be sanitized before application (see Pitfalls).

## Workflow
1. **Deep research (parallel):** his resume + GitHub (`api.github.com/users/YOUR_GITHUB_USERNAME`), portfolio (OPERATOR_LINKEDIN_ID.portfolio.example.com), Gmail job stream, and the live market. Gmail: use `gmail-automation` skill, BYPASS the gws shim (strip `~/bin` from PATH), search `job OR hiring OR recruiter OR referral newer_than:150d`.
2. **Pick ONE specific target** at the intersection of (his strength) x (open req in his city) x (in his Gmail stream). Lead with identity/IAM roles at identity companies.
3. **Tailor resume + cover letter** from his real data. Re-lead with the matching specialty; frame XXXXXXX at Staff level.
4. **Render to PDF + ATS-optimize** (see references/ats-resume-pattern.md and scripts/md2pdf_ats.py).
5. **Outreach:** Gmail referral WITH PDF attached (see `gmail-automation` Pitfalls for the send-with-attachment code). Draft LinkedIn message for him to send himself (NEVER auto-post; ToS + account risk). Humanize everything, NO em dashes anywhere (see Pitfalls).

## Pitfalls (verified this session)
- **NO em dashes (—) ANYWHERE**, including generated PDFs/resumes/cover letters. operator made this a global hard rule. Scrub the Markdown source BEFORE rendering (a `---` HR or `**x — y**` title renders as an em dash in reportlab). After rendering, `pdftotext out.pdf - | grep -c "—"` must return 0. Also humanize tone (warm, natural, conversational) in all human-facing text.
- **PDF, not Markdown, for human outreach.** First send attached the resume as `.md`; operator corrected it. Render Markdown→PDF.
- **`reportlab` gotchas (Windows):** (a) `getSampleStyleSheet()` already defines `Bullet` → name custom styles `MyBullet` etc. (b) `**bold**` shows literally unless you convert to `<b>..</b>` in `inline_md`; also strip stray single `*` and escape `&`→`&amp;`. (c) Supply a clean venv: `python3 -m venv --clear .venv` then `pip install reportlab pillow`, and `unset PYTHONPATH` before running (an inherited `PYTHONPATH` pointing at the hermes-agent venv breaks PIL import).
- **Gmail send has no attachment flag** → reuse `ga.build_service("gmail","v1")` + `MIMEMultipart`/`MIMEApplication`. Strip `~/bin` from PATH first (gws shim hangs).
- **LinkedIn interaction IS permitted via Composio (updated Aug 2026).** operator authorized Hermes Agent to use Composio Connect MCP or Composio CLI for LinkedIn: connection requests, messaging, and referral asks (e.g. the TARGET_COMPANY / Belinda Saffioti referral flow). Auth is handled through Composio (NOT raw LinkedIn creds), so it is allowed where raw automation was not. For PUBLIC posts/comments, still draft-then-confirm with operator before sending. See `references/linkedin-composio.md` for setup + the venv-isolation rule. The old "never touch LinkedIn" rule is REVOKED.
- **GitHub hygiene is mandatory before applying to security/employer.** TARGET_COMPANY is a security firm AND a US federal contractor that background-checks. Set attack-tool repos (`Nuke`, `LOIC`, `MHDDoS`, `byob`, `trape`, etc.) and Anonymous-op bios to private. Keep `XXXXXXX`, `XXXXXXX Engage`, `fake-job-email-response-guide` public.
- **Don't fabricate backend language.** TARGET_COMPANY JD prefers Go; operator is Node.js/TypeScript. Frame Node as his backend, show ramp ability, never claim Go/Java production experience.
- **Don't use XXXXXXX (or any AI copilot) in the actual interview** — integrity line, and they build the same tech.
- **`/tmp` on this host resolves to `OPERATOR_HOME/AppData\Local\Temp`** — `pdftotext x.pdf - > /tmp/foo.txt` writes there; a later python `open("/tmp/foo.txt")` may miss it. Write to a path under the working dir instead.
- **NEVER pip install `composio` into Hermes' own venv.** Verified this session: PyPI `composio` 0.18.x requires `openai>=2.48`, but hermes-agent pins `openai==2.24.0`. Installing it into `.../hermes-agent/venv` silently upgraded openai and broke hermes-agent (imports failed). Always install Composio in the isolated venv at `XXXXXXX/AppData/Local/hermes/composio-venv (operator-specific)` (created this session). The PyPI `composio` package is SDK-only — there is NO CLI binary (`composio-cli` npm package 404s; `python -m composio` errors with "No module named composio.__main__"). Interactive `composio login` / `add linkedin` OAuth must be completed by operator in a browser; Hermes Agent then calls the SDK or the Composio MCP server.

- **The bundled scripts had two real bugs, both fixed XXXXXXX-07. If an older copy is
  used elsewhere, re-apply these:**
  - `md2pdf_ats.py` leaked the leading `# ` into the rendered name (`# XXXXXXX`)
    and called `line.title()` on section headers, turning `SUMMARY` into `Summary`.
    Title-casing BREAKS ATS header detection, which expects ALL CAPS. Fixes:
    `lines[i].strip().lstrip("#").strip()` for the name line, and
    `Paragraph(line, styles["H2"])` (no `.title()`) for headers.
  - `score_ats_keywords.py` expects a TEXT file, not a PDF. Passing a `.pdf` directly
    made it read binary and silently report **5%**, which looks like catastrophic
    resume failure but is a scorer bug. It now sniffs the extension and uses `pymupdf`
    for `.pdf`. Sanity-check a shockingly low score before rewriting the resume.
- **Verify the render, never trust `WROTE file.pdf`.** Extract the text back and assert:
  em dash count is 0, every ALL-CAPS section header is present, and the name line does
  not start with `#`. The renderer exits 0 even when the output is malformed.
  `pymupdf` works for extraction when `pdftotext` is absent.
- **Do not pad keywords to reach 100%.** A realistic MASTER resume scores ~80% against a
  broad 60-term senior/staff set. Misses split in two: hyphenation/line-wrap artifacts
  (`zero trust` vs `zero\ntrust`, `fullstack` vs `full stack`) which parsers normalize and
  are safe to ignore, and GENUINE gaps in user's background (aws, redis, kafka,
  elasticsearch, kinesis, privileged, c++). Never insert the genuine gaps to inflate the
  number; that is exactly what gets caught in a technical screen. Tell operator plainly which
  misses are artifacts and which are real. True ~100% only exists against ONE specific JD,
  which is the argument for per-application tailoring.
- **Composio CANNOT do LinkedIn Easy Apply.** All 20 `LINKEDIN_*` tools are
  posts/comments/shares/images/org-stats/profile lookups. No job search, no Easy Apply,
  no messaging, because LinkedIn's public API does not expose them. Job discovery and
  applying must run on the browser rail. See `references/linkedin-easy-apply-browser.md`.
- **LINKEDIN EASY APPLY DIALOG SELECTOR (FIXED XXXXXXX, UPDATED 2026-09-02):** LinkedIn renders the EA form inside a `<dialog open>` element, NOT `div[role=dialog]`. The old `document.querySelector('div[role=dialog]')` returned a hidden video-player accessibility overlay (width=0, height=0) — so field/button scans scoped to it found 0. **Correct selector: `document.querySelector('dialog[open]')`.** Apply to ALL LinkedIn EA DOM work. **EA button detection (2026-09-02):** search `button, a, div[role="button"]` whose text starts with `Easy Apply` / `Apply` inside `<main>`. LinkedIn renders the EA control as `<a>` on some pages; searching only `<button>` causes false `no_ea_button` → skip genuinely-EA jobs → zero-apply streak. **Daily-limit detection (2026-09-02):** LinkedIn shows a modal "You reached today's Easy Apply limit" when the daily cap hits. Detect that text, click "Got it" to dismiss, back off ~2h (cap resets next calendar day). Do NOT loop/retry — it will not lift within the backoff window. See `linkedin-easy-apply/references/ea_button_detection_20260902.md` for the full fix.
- **ANSWER ARCHITECTURE: lookup table, NOT LLM.** A 100+ line regex table produced bogus answers ("No" for location, wrong values for novel phrasings). LLM fallback (Ollama/Kilo) is too slow for interactive form filling (Ollama 12-30s/call, Kilo 404). **Final fix (XXXXXXX, working):** 50+ pattern `getAnswer(label, optText)` lookup table that returns instantly from user's verified profile. Verified by submitting real LinkedIn jobs. See `linkedin-easy-apply/references/regex_table_rejection_20260901.md`.
- **SCREEN ON COMPENSATION BEFORE APPLYING, not after.** Read the posted band off the
  job card before opening any apply flow. Skip anything whose posted max is below ~80L
  unless operator says otherwise. On XXXXXXX-07 an application went to Codemonk at a posted
  25-28L (a third of his floor) purely on a Node.js keyword match. Stack fit is necessary
  but NOT sufficient; comp is a hard gate.
- **Verify irreversible facts BEFORE the first submit.** LinkedIn Easy Apply submissions
  cannot be edited or cleanly withdrawn. Any number destined for a one-way form (CTC,
  notice period, years) must be confirmed against memory/operator BEFORE submit #1, not
  discovered wrong at submit #3. Two applications went out with a stale 48L/60L pair
  before the correction landed, and the only remedy left was a manual recruiter message.
  When a figure IS corrected mid-run: fix the live form (click `Back` to that step),
  update the in-page answer bank so later applications inherit it, and then tell operator
  plainly which already-submitted applications carry the bad number. Do not bury it. offered stop-at-Submit vs
  full auto-submit, he chose FULL AUTO-SUBMIT and explicitly accepted the account
  -restriction risk. Do not re-litigate the risk every session; surface it once, then act.

## LinkedIn automation — durable operating rules (XXXXXXX-09, apply to ALL LinkedIn-driving work)
These govern the puppeteer/LINKEDIN_PORT browser rail (see the `linkedin-easy-apply` skill, now curator-managed, and `apply_one.cjs` driver in `XXXXXXX/job-apply/`). They are HOW to operate for user.
- **Restriction-safe FIRST.** user's account was temporarily restricted (until 00:52 UTC Aug 8
  2026) for **high-volume data access**. NEVER bulk-scrape/enumerate jobs. Use the on-the-fly,
  click-driven model with randomized human delays. Any driver MUST carry a hard
  restriction-window guard that aborts before the restriction lifts.
- **Vision-in-the-loop, ALWAYS** when driving any browser: screenshot + `vision_analyze` in
  parallel with script/DOM work. If a result looks wrong (wrong selector, grabbed UI widgets,
  modal overlay, SPA quirk), screenshot immediately and patch the script on the fly. Vision is a
  first-class debug signal, not an afterthought.
- **NEVER use `computer_use`/SOM/UIA on the LinkedIn LINKEDIN_PORT Chrome (HARD, XXXXXXX).** It
  reproduces Windows Event ID 1002 "Application Hang" — the a11y-tree walk over LinkedIn's huge
  DOM blocks the main thread and freezes the browser (CDP `/json` times out). Drive LinkedIn ONLY
  via raw CDP (puppeteer-core `connect` to `ws://127.0.0.1:LINKEDIN_PORT`) + `vision_analyze` on
  `page.screenshot()`. SOM is fine on OTHER apps/contexts, never on LinkedIn. The
  `linkedin-easy-apply` SKILL.md's old "verify with SOM" text is WRONG for LinkedIn. See
  `references/linkedin-easy-apply-cdp-fixes-XXXXXXX.md` for the validated CDP driver fixes.
- **Persist ALL Chrome sessions** across turns (LINKEDIN_PORT LinkedIn profile at
  `XXXXXXX/chrome-profile`, AUTOMATION_PORT automation-chrome). Relaunch with
  `--remote-debugging-port=<port> --user-data-dir=<profile>` if the CDP listener dies — session
  death is a bug to fix, not an accepted state.
- **NEVER kill the WhatsApp bridge** (`node .../whatsapp-bridge/bridge.js --port 3000`). It is
  user's PRIMARY comms channel (self-chat). Before killing any `node` PID, inspect its
  CommandLine first; only kill PIDs you spawned for LinkedIn work.
- **Job crons + the apply loop are governed across BOTH channels — a desktop pause is NOT sovereign.
  (CRITICAL governance wall, verified XXXXXXX-23.)** The WhatsApp channel (`YOUR_WHATSAPP_LID@lid`,
  "XXXXXXXXXXX") is ALWAYS connected. When operator sends a WhatsApp message implying "keep applying"
  ("make sure it actually applies", "diagnose the cron", "continue applying"), the gateway spawns an
  agent turn holding the `cronjob` tool that **RE-ENABLES the job crons**. So pausing them from the
  desktop only sticks until the next such WhatsApp message. To make a STOP hold: (1) `cronjob pause`
  all 6 job crons + `taskkill` the live `autoapply_loop.py` PID (pausing the watchdog alone is NOT
  enough — a running loop survives); (2) add a memory note "job-application crons + loop SUSPENDED
  until operator says resume" so any future turn (desktop OR WhatsApp) won't re-enable them; (3) re-`list`
  + `wmic ... grep autoapply` to confirm nothing relaunches. The 6 job cron IDs, the robust
  stop/start sequence, and the evidence trail (jobs.json `updated_at` vs gateway.log inbound
  timestamps) are in `references/job-cron-governance.md`.
- **LinkedIn "AI job search" SPA gotcha (XXXXXXX-09, CORRECTED XXXXXXX-09):** scripted left-list
  card clicks do NOT load job details (right pane stays on job #1; URL `currentJobId` never changes
  — verified via vision). The BARE detail URL `/jobs/view/<id>/` (no `/apply/` path) **TRIPS the
  bot check**, BUT the EA apply URL `https://www.linkedin.com/jobs/view/<id>/apply/?openSDUIApplyFlow=true&trackingId=<tid>`
  is SAFE and is the proven way to open the EA modal (vision-verified submission this cycle — see
  `references/ea-direct-apply-puppeteer.md`). Enumerate IDs via `currentJobId=` (NOT `currentJob=`)
  from card `a[href]`s; the list virtualizes ~1 link at a time so scroll between jobs. The
  read-only 1s observe poller (a `puppeteer.connect` + `page.screenshot()` loop; no goto/click)
  remains the safe way to STUDY the manual flow without detection risk. Cadence DEFAULT is 1s.
- **Resume to select for EA apply = `OPERATOR_RESUME_ATS.pdf`** (NOT "Kibhu_...AIS" — that
  was a vision OCR misread). Screening answers are CONSTANT across jobs: work-auth = **No**,
  visa-sponsorship = **No**. Do NOT overwrite LinkedIn's pre-filled email/location/phone.
- **Screenshot hygiene (user, XXXXXXX-09):** the 1s poller makes ~130 PNGs/session (~140KB
  each). operator explicitly demanded they be DELETED post-analysis (`rm -rf observe_seq` + loose
  `*.png`/`dump_*.json`) to avoid filling disk. Always stop the poller (kill its node PID) AND
  delete its output dir when done studying.
- **Safe retest protocol (agreed XXXXXXX-09, after 2 detection trips):** when operator says "go"
  post-cooldown, run `printf '[]' > applied_fly.json` then
  `ALLOW_RUN=true QUERY="Senior Software Engineer" LOCATION="XXXXXXX" MAX_APPLY=3 DELAY_MS=8000 node apply_fly.cjs`
  — start at **MAX_APPLY=3**, screenshot-in-the-loop, STOP instantly on any challenge. If 2-3
  submit cleanly, bump to 5, then 10. Never jump to 40. ANY "quick security check"/reCAPTCHA =>
  STOP, tell operator to sign in manually; do NOT retry/loop (re-flags the account).

## LinkedIn Easy Apply — PROFILE-REASONING answering (XXXXXXX HARD CORRECTION)
operator corrected the bot's core design this session: **the EA answerer must reason over his
actual profile (education, experience, comp, AI tools, location, employer, life facts), NOT a
static regex/lookup table.** A hardcoded question→answer list dies on every new phrasing and
cannot know "B.Tech EEE = Bachelor's Degree → Yes". The script is only the safe CDP "hands"
(click/type via puppeteer-core @ LINKEDIN_PORT); the "brain" that decides each answer is user's real
profile + agent reasoning.

- **Architecture (validated this session, `XXXXXXX/job-apply/apply_one.cjs` + `cdp_helper.cjs`):**
  a `PROFILE` object holds user's verified data; `answer(label)` reasons over it with instant
  regex ONLY for structured numeric fields (salary/years) to avoid LLM latency; everything else
  falls through to an **LLM fallback** (Kilo gateway `nvidia/nemotron-3.5-lightning:free`,
  system prompt = the PROFILE JSON) that returns a TRUTHFUL answer string. The LLM outputs TEXT
  ONLY — it never drives the DOM (local-LLM auto-fill corrupted forms before by putting garbage
  into fields). See `references/linkedin-easy-apply-profile-reasoning-XXXXXXX.md`.
- **NEVER expose "Hermes Agent"/Hermes persona in application answers.** Keep that identity internal;
  answer as XXXXXXX. (operator explicit XXXXXXX.)
- **Isolated tab per call, with a 75s watchdog. (CORRECTED XXXXXXX-20 — the old
  "Single-tab ONLY — reuse pages[0]" rule is WRONG and caused a 418-tab crash.)**
  `withPage(fn)` opens a FRESH tab, runs `fn`, and closes it in `finally` AND via a
  hard 75s timeout that force-closes even if `fn` hangs (external/custom ATS pages
  never fire `load`, so `finally` alone leaks tabs). Wrap every `page.goto` in
  `Promise.race` with an explicit timeout (puppeteer's own `goto timeout` is
  ignored when `load` never fires). Full detail + code in
  `references/cdp-tab-hygiene.md`. Login is preserved (cookies are account-scoped,
  not tab-scoped) so NO re-auth is needed per tab. Do NOT revert to `pages[0]`.
- **Fresh-window recursive collection (operator XXXXXXX):** searches use `f_TPR` in the URL
  (`r18000`=5h, `r43200`=12h, `r86400`=24h) + `sortBy=DD` (newest first). LinkedIn filters
  server-side by post time — do NOT parse card "X hours ago" text (cards rarely expose it; parsing
  ages every card to 999h and starves the run to 0). Apply a RELEVANCE gate only (see below).
  Re-running catches newly-posted jobs as the window slides (LinkedIn results shift between loads).
- **`empty_modal` is ALMOST ALWAYS a BOT-DETECTION BUG, not a LinkedIn glitch. (CORRECTED XXXXXXX.)**
  operator challenged the "modal opened but no fields" logs with a screenshot — the modal was FULLY
  rendered (TCS contact-info form, pre-filled). Root cause: `document.querySelector('div[role=dialog]')`
  returns the FIRST dialog in DOM order = a hidden EMPTY accessibility overlay, so field/button scans
  scoped to it found 0. **ALWAYS verify with vision before concluding "LinkedIn glitched."** Fix:
  scan the WHOLE document for fields/buttons. Only after a real screenshot shows an empty modal is it
  a true LinkedIn-side glitch. See `references/linkedin-easy-apply-cdp-detection-fixes-XXXXXXX.md`.
- **`NO_EA_BUTTON` usually means ALREADY APPLIED.** LinkedIn removes the EA button once submitted and
  shows "Application submitted / Applied". Detect that text and classify `already_applied` (counts as
  applied) — do NOT treat as failure or re-attempt. (Validated XXXXXXX: two "failed" jobs were in
  fact already submitted; vision-confirmed.)
- **Radio questions live in a PRECEDING SIBLING of `<fieldset>`**, not an ancestor — climb-up misses
  them → "(unlabeled radio)". Walk previous siblings for the '?' text. "Years of experience with X?"
  rendered as a Yes/No radio → answer "Yes" (a raw number never equals "yes").
- **Relevance gate (operator JS/frontend focus):** RELEVANT = `/javascript|typescript|front[- ]?end|full[- ]?stack|node\.?js|react|vue|angular|ui developer|web developer/i`; IRRELEVANT = `/embedded|firmware|automotive|autosar|golang|java(?!script)|python(?!.*react)|rust|spring boot|.../i`. Skip non-matching (e.g. 777 Trinity "Embedded Software Engineer" — not his profile). XXXXXXX JS/frontend EA volume in any 5h window ≈ 1 job; widen `f_TPR` for more.
- **Chrome relaunch on LINKEDIN_PORT (Windows gotcha):** `bash` `kill -9 <pid>` can NOT reach the Chrome
  process handle. Use `taskkill /PID <pid> /F /T` (found via `netstat -ano | grep :LINKEDIN_PORT`). Then
  relaunch: `"C:/Program Files/Google/Chrome/Application/chrome.exe" --remote-debugging-port=LINKEDIN_PORT
  --user-data-dir=XXXXXXX/chrome-profile --hide-crash-restore-bubble
  --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  --disable-background-timer-throttling about:blank` (background=true, silent).
- **Screenshot/temp hygiene (HARD):** `apply_one.cjs` writes `apply_<ts>.png` each run; delete on
  success, keep only on failure. Vision-confirm every step, then purge all temp/screenshots.

## References
- `references/linkedin-easy-apply-cdp-detection-fixes-XXXXXXX.md` — CORRECTED EA detection/classification: whole-document field/button scan (don't scope to first `div[role=dialog]`), `NO_EA_BUTTON`=already-applied, `f_TPR` URL window (not post-time text), radio question = preceding sibling of `<fieldset>`, Yes/No "years with X"→"Yes", relevance gate, screenshot hygiene. Vision-proven this session. **UPDATED XXXXXXX:** dialog is `<dialog open>`, not `div[role=dialog]`.
- `references/linkedin-easy-apply-profile-reasoning-XXXXXXX.md` — PROFILE-reasoning EA answerer design: PROFILE object, `answer()` reasoning + LLM fallback (text-only), catalog of answer() rules, single-tab + fresh-window collection. Validated by 16+ submissions this session. **UPDATED XXXXXXX:** replaced by lookup table (`getAnswer`) — LLM too slow, lookup table instant.
- `references/ea-direct-apply-puppeteer.md` — PROVEN EA apply method (direct `/apply/?openSDUIApplyFlow=true&trackingId=` URL, `currentJobId=` enumeration, CTC/Notice/Review fill, vision-gated verification). Vision-verified submission this cycle.
- `references/linkedin-easy-apply-browser.md` — why Easy Apply needs the browser rail and the Chrome CDP profile constraint.
- `references/linkedin-easy-apply-cdp-fixes-XXXXXXX.md` — PROVEN CDP-driver fixes (modal detection, scroll-before-click, "Next" match, contact pre-fill, answer() gaps, custom-radio div click, stuck detection). **SOM/computer_use HANGS LinkedIn — use raw CDP + vision, never SOM.**
- `references/easy-apply-browser-mechanics.md` — verified CDP/profile setup (app-bound encryption blocks cookie copying; one-time manual login required), hostile-SPA driving patterns, and the generic form-filler skip-list (typeaheads/URLs/free-text must bypass the default filler).
- `references/ats-resume-pattern.md` — ATS-maximized resume structure + the TARGET_COMPANY PAM case study (verified keyword coverage ~96%).
- `references/linkedin-composio.md` — LinkedIn-via-Composio setup, venv isolation, and the TARGET_COMPANY referral workflow (operator authorized LinkedIn interaction through Composio, Aug 2026).
- `references/greenhouse_field_fill_bugs_20260901.md` — **FIXED XXXXXXX**: three Greenhouse field-fill bugs (country react-select, intl-tel-input phone, custom question fields). Read before touching `gh_batch.cjs`.
- `references/linkedin_session_recovery_20260901.md` — **FIXED XXXXXXX**: stale cookies killing LinkedIn session; one-tap login recovery. Read before touching `cdp_helper.cjs`.
- `scripts/md2pdf_ats.py` — known-good Markdown→PDF renderer for the ATS resume (reportlab, single-column, `Title | Dates | Location` on one line, no tables). Copy + point SRC/OUT at your markdown.

## Setup

This is the parent skill for job-application automation. It delegates to sub-skills:

- `linkedin-easy-apply` — LinkedIn Easy Apply via CDP
- `external-ats-apply` — Greenhouse, Workday, Lever, etc.
- `job-apply-autopilot` — autonomous loop
- `linkedin-cdp-driving` — raw CDP driving

**Personal data needed:**
- `XXXXXXX` — your full name (for form filling)
- `XXXXXXX` — your email
- `XXXXXXX` — your phone number
- `XXXXXXX` — path to your resume PDF
- `XXXXXXX` — your home directory
- `LINKEDIN_PORT` — Chrome debug port for LinkedIn (default: LINKEDIN_PORT)
- `ATS_PORT` — Chrome debug port for ATS (default: ATS_PORT)
- `CHROME_PROFILE` — Chrome user data directory name

**Dependencies:**
- Node.js (for CDP scripts)
- Chrome with remote debugging enabled
- Logged-in LinkedIn session in the Chrome instance

**Placeholders used:** All OPERATOR_* placeholders, LINKEDIN_PORT, ATS_PORT, CHROME_PROFILE
