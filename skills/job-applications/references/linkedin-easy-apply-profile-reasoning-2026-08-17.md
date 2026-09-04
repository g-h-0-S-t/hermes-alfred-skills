# LinkedIn Easy Apply — Profile-Reasoning Answerer (2026-08-17)

Validated this session: 13+ verified submissions via `OPERATOR_HOME/job-apply/apply_one.cjs`
+ `cdp_helper.cjs` (puppeteer-core `connect` to `ws://127.0.0.1:9222`, single tab).

## Hard correction (operator)
The EA answerer must REASON over operator's actual profile, not a static regex/lookup table.
A hardcoded question→answer list dies on every new phrasing and cannot know
"B.Tech EEE = Bachelor's Degree → Yes". The script is the safe CDP "hands" (type/click);
the "brain" is the profile + agent reasoning. LLM fallback outputs TEXT ONLY (never drives DOM).

## Architecture
- `PROFILE` object (top of `apply_one.cjs`): name, email, phone, location, currentCTC
  (`8600000`/LPA `86`), expectedCTC (`5000000`/LPA `50`), currentEmployer `Stealth`,
  github, linkedin, experienceYears `14`, `education[]` (ICSE 79.33 / ISC 72.57 / B.Tech EEE
  DGPA 7.26), `skills{}` map (skill→years), `aiTools` string, relocation/workAuth/sponsorship/
  joinImmediate.
- `answer(label)` reasoning order:
  1. Structured numeric instant regex (salary/years/CTC/LPA) — avoids LLM latency.
  2. Education reasoned from `PROFILE.education` (B.Tech→Bachelor's=Yes, etc.).
  3. Yes/No screens (commute, consent, work-from-office, budget, hands-on experience,
     delivery-margin, reports-to-you, etc.).
  4. Unknown → `llmAnswer(label)`: POST to `https://api.kilo.ai/api/gateway`,
     model `nvidia/nemotron-3.5-lightning:free`, system = `PROFILE` JSON as facts,
     temp 0.2, stream false. Returns trimmed truthful string or null on failure.
     LLM is TEXT-ONLY — never touches the form.

## Radio question-climb (the fix that unblocked radios)
For each `div[role=radio]`, walk ancestors; the question is the container's text with
`yes`/`no` option words stripped, taken **up to the first `?`** (a shared ancestor often
leaks another question's text — `split('?')[0]` isolates THIS question). Match `optText`
(radio's own "yes"/"no") against `answer(q)`; click the matching radio.
Pitfall: a "Do you have 6+ years experience... hands-on" question is Yes/No but contains
"experience" → must be caught by a `/do you have .*(experience|year)|hands[- ]?on/` rule
BEFORE the `/years? .*experience/ → '14'` number rule, or it wrongly returns 14.

## answer() rule catalog (extend as new phrasings appear)
CTC: current `8600000` (or LPA `86`), expected `5000000` (or LPA `50`). Never below 86L.
Skills-years: match skill key in label → `PROFILE.skills[k]`.
Experience years → `14`. Location → `Bengaluru`. LinkedIn URL → profile. AI project → github.
AI tools → `PROFILE.aiTools` (Hermes, omniroute, Antigravity, Kilo Code, Cursor, Ollama/LM
Studio — NO "Alfred"/persona). Current employer → `Stealth`. Notice period / join-days → `0`.
Education: B.Tech→Bachelor's=Yes, M.Tech/MBA=No (he has none), 10th=79.33/12th=72.57,
B.Tech CGPA `7.26`. Insurance/BFDI → No. Hands-on experience / "do you have X years" → Yes.
Commute/consent/work-from-office/budget/background-check → Yes. Sponsorship → No.
Relocation → Yes. Delivery-margin accountable → Yes. Reports-to-you → `0`. Concurrent
client projects owned → `3`. Code-days last 90 → `90`. Why/about → short truthful pitch.

## Collection + apply (run_recursive.cjs)
- Searches: `f_AL=true&f_E=4,5,6&f_TPR=r86400&sortBy=DD` (Easy Apply, mid-senior+, past 24h,
  newest first). Keywords: full stack senior SWE, applied ai engineer, senior SWE react node,
  staff engineer typescript, frontend engineer react senior, identity iam engineer.
- Scrape each card's posted-time ("2 hours ago"); `ageHours()` → filter ≤24; sort
  newest→oldest; apply in that order. Dedup vs `applied.json` (applied/skipped/failed).
- Single tab: `cdp_helper.withPage` reuses `pages[0]`.
- `empty_modal`: wait 10s for fields, re-click EA once, wait 8s; still empty → report
  `empty_modal`, skip (LinkedIn glitch; retries after cooldown). Never force/fabricate.
- Throttle: ~20-30 sends/session → some modals glitch; pause, don't pound.

## Chrome 9222 relaunch (Windows)
`kill -9` from bash CANNOT reach Chrome's PID. Use `taskkill /PID <pid> /F /T`
(pid from `netstat -ano | grep :9222 | grep LISTENING`). Relaunch:
`"C:/Program Files/Google/Chrome/Application/chrome.exe" --remote-debugging-port=9222
--user-data-dir=OPERATOR_HOME/chrome-cdp-profile --hide-crash-restore-bubble
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding
--disable-background-timer-throttling about:blank`
