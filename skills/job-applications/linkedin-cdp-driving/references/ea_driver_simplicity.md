# LinkedIn EA driver — keep it SIMPLE (proven-good shape)

Captured XXXXXXX-15 after a "universal" rewrite broke the bot. The simple version is what
works on this machine; the complex version froze Chrome and corrupted forms.

## What broke it (the "universal" v3)
1. **LLM auto-fill** — called the Kilo gateway for every unanswered field. BANNED by operator:
   it corrupts forms (e.g. put "Yes" into a years-of-experience number field). Even with an
   8s timeout + defensive JSON parse, an unanswered required field should become a GAP and be
   skipped, not LLM-guessed.
2. **Collect marathon** — `collectJobs` did 14 sequential `page.goto` keyword searches + a
   6x `window.scrollBy(0,1500)` loop per query, all in ONE browser session. That reliably
   froze the LINKEDIN_PORT Chrome (Windows Event 1002 "Application Hang", CDP `http=000`).

## Proven-good shape (canonical: linkedin-easy-apply.cjs v3.1.0-simple)
- **Profile-only fill.** `applicant.profile.json` holds contact / `resumeName` / `ctc`
  (current XXXXXXX, expected XXXXXXX, notice 0) / `locationPref` XXXXXXX / `answers`
  substring->value map / `skills` / `skipTitles`. No LLM. Set `"llm": {"enabled": false}`.
- **Open EA via a REAL mouse click at the button center** — synthetic `clickText` /
  `el.click()` is a no-op on LinkedIn React. Use `page.mouse.click(box.x+box.width/2, box.y+box.height/2)`.
  (Note XXXXXXX: even a trusted `el.click()` via puppeteer sometimes needs a RETRY — the EA
  modal does not always open on the first click. Loop up to 5 clicks + poll for the open-form
  text, stop on first open. See WORKING EA-DRIVER PATTERN in SKILL.md.)
- **Dismiss the "Job search safety reminder"** modal by clicking its **"Continue applying"**
  button (detect by text, not class/role). The real form only appears after.
- **Resume: select stored ATS resume radio only — NEVER upload a file.** The default resume
  `operator_XXXXXXX_Resume_ATS.pdf` is already set in his account.
- **Collect = multiple keywords in ONE browser session is NOW FINE** (XXXXXXX correction):
  with the profile launched using `--disable-extensions --disable-dev-shm-usage`, a 10-keyword
  `page.goto` loop + multiple applies runs with ZERO crash. The old "one light pass per job /
  relaunch a fresh browser per keyword" rule applied only to the pre-hardening setup where the
  LINKEDIN_PORT profile's ~30 extensions + tiny `/dev/shm` crashed every page. Keep collect reads light
  (no 6x scroll marathon — LinkedIn renders ~7-9 cards initially; filter post-hoc in JS).
- **Unanswered required field -> GAP, job skipped/queued** (logged to `needs_review_30min.json`
  for fields needing user's real numbers, e.g. tool-specific years-of-experience or comp
  expectation), never submitted incomplete. This is the 0%-failure guarantee. NEVER fabricate
  an answer to unblock a form.

## CLI (unchanged surface)
`env -u PYTHONPATH node linkedin-easy-apply.cjs connect <wsUrl>`
`... collect [--hours N] [--max M]`  (single light pass)
`... apply <jobId>`
`... run [--hours N] [--max M] [--limit L]`

`<wsUrl>` = `webSocketDebuggerUrl` from `http://127.0.0.1:LINKEDIN_PORT/json/version`.
Always run with `PYTHONPATH`/`PYTHONHOME` UNSET (the Hermes venv leaks py deps that break
puppeteer-core's own deps).
