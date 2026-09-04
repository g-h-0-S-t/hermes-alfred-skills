---
name: linkedin-easy-apply-extension
description: LinkedIn Easy Apply via Chrome MV3 extension, not CDP.
version: 1
author: alfred
license: mit
metadata:
  hermes:
    tags: [linkedin, easy-apply, job-search, chrome-extension, automation, kilo, nemotron]
    related_skills: [job-applications/linkedin-easy-apply, job-applications/job-applications]
---

# LinkedIn Easy Apply — Chrome Extension

## When to use
- operator asks to automate LinkedIn Easy Apply AND the CDP/puppeteer-on-9222 path is crashing (renderer dies on the EA iframe). This happened repeatedly 2026-08-15.
- Building a distributable tool: a Chrome extension the user loads on linkedin.com, uploads their resume, clicks Apply; the extension scans jobs and AI-fills the form. operator explicitly proposed this ("like Wraith Engage").
- Any task to make LinkedIn EA robust + 0%-failure.

## Architecture (ACTUALLY BUILT + DEBUGGED 2026-08-15 — use this, not the old Wraith Shadow-DOM plan)
A **Chrome MV3 extension runs inside LinkedIn's own page** (content script, same-origin to the EA form). This avoids the CDP/cross-origin-iframe renderer crash that kills puppeteer-on-9222. The real repo is `YOUR_GITHUB_USERNAME/linkedin-easy-apply-ext` (local: `OPERATOR_HOME/linkedin-easy-apply-ext`). Files:
- `manifest.json`: MV3; `permissions: [activeTab, scripting, storage, tabs, alarms, windows]`; `host_permissions: *://*.linkedin.com/*, https://api.kilo.ai/*`; `background.service_worker: background.js` (module); `content_scripts` matching `/jobs/*` + `/jobs/view/*`; `web_accessible_resources` for `lib/pdf.js`, `lib/pdf.worker.js`, `lib/mammoth.browser.min.js`, `inject.js`.
- `background.js`: ES-module service worker (no DOM); holds AI brain (free Kilo, no key) + parsed `profile` + `prefs` + learned `answers` + `pending` queue, all in `chrome.storage.local`. `loadState()` re-reads storage on SW wake AND at the top of every `onMessage`. `chrome.action.onClicked` opens a `type:'normal'` resizable window (`window.html`).
- `inject.js`: content script, runs SAME-ORIGIN inside LinkedIn. `scanFields(root)` (root scoped to the EA modal `div[role=dialog]`; denylists job-description chips), `answerAndFill` (contact from resume → ask AI → needsInput), `applyOneJob` (step loop, click Submit/Review/Continue, queue on required gaps), exposes `window.__lea` (scanJobList / applyToMatching / applyOneJob / rerunJob / fillCurrentModal).
- `window.html` + `panel.js`: resizable window UI (NOT a popup). Upload → parse (lazy PDF.js/mammoth) → prefill panel from resume (blanks for manual) → Save prefs → Scan → Apply (auto-submit) → "Needs your input" pending panel with per-job + "Rerun all" buttons. `panel.js` is loaded as `<script type="module">`; an external `errorbanner.js` surfaces load errors (MV3 forbids inline `<script>`).
- `resume.js`: local parse — PDF via lazy `import('./lib/pdf.js')`, DOCX via lazy mammoth, TXT/MD raw. Extracts name/email/phone/links/education/experience/skillsHint. The AI reasons from this; nothing hardcoded.
- `lib/`: vendored pdf.js + pdf.worker.js + mammoth.browser.min.js (downloaded from jsdelivr; commit them so the extension works offline).

## Build/debug pitfalls (all hit + fixed 2026-08-15 — see chrome-mv3-extension-dev for the full list)
- Panel `<script>` MUST be `type="module"` (panel.js uses `import`); a classic script crashes the window ("opens and closes").
- NEVER inline `<script>` in MV3 HTML (CSP blocks it) — use external `errorbanner.js`.
- `chrome.windows.create` must use `type:'normal'`, not `type:'popup'` (popup auto-closes).
- Duplicate `function activeTab` / duplicate `$('id')` addEventListener → silent load crash (buttons do nothing). Grep + `node --check` before shipping.
- SW amnesia: `loadState()` on wake + per message, or learned answers/resume are forgotten.
- Verify an "uploaded resume" is actually a resume (a stock Slidesgo `.pptx` has no candidate data) — abort with a warning, never feed it to the AI.

## Universal field-fill engine (port the proven logic into the content script)
Detect EVERY control type and fill correctly:
- text/email/tel/number (numeric coercion — never put text in numeric inputs), textarea, native `<select>`, custom combobox/listbox, 2-option radio (Yes/No), multi-option radio, single + multi checkbox, date, contenteditable.
- Resume picker: **select the stored ATS resume only — never upload a file** (upload corrupts submissions; operator's stored resume is correct).
- Label mapping: aria-labelledby → aria-label → `<label for>` → wrapping label → nearest preceding question text. Do NOT grab section headings or LinkedIn's job-description chips (Jobs / Date posted / Company / Remote / Experience level / Employment type / Easy Apply / Under 10 applicants / Full Stack / Backend / Gen AI) — denylist those as non-fields.
- Scope the scanner to the EA modal/dialog (`div[role=dialog]`), NOT `document` — the job-description pane is full of non-field text that pollutes detection.
- EA modal open: try `clickText('Easy Apply')` first (handles `<button>`/`<a>`), fall back to navigating the job's live `/apply/?trackingId=` href. Confirm modal opened (contact info / additional questions / resume text present) before filling.

## LLM (free Kilo gateway, NO API key) — see references/kilo-models.md
- Text/classification: `nvidia/nemotron-3.5-lightning:free`
- Vision (sees a screenshot of each control for custom widgets): `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- Endpoint: `POST https://api.kilo.ai/api/gateway/chat/completions` with `{model, messages:[{role:'user',content}], temperature, max_tokens}`. The `:free` tier is open (no sign-in); non-`:free` Nemotron returns 401 PAID_MODEL_AUTH_REQUIRED.
- LLM returns only a TYPED value; the script applies it per control type → the model can never corrupt a field.

## 0%-corruption guarantee (hard rule)
- Required field with no deterministic answer AND no LLM result → log as `needs-review` GAP and PAUSE (job not submitted, not corrupted).
- Vision-verify the submission (read the "Application submitted" state) before counting it applied. Automated "applied" text flags are unreliable (operator was burned by false-positive "applied" before).
- Respect LinkedIn's daily Easy Apply cap (detect + stop). Randomized 2-3s delays, no bulk scraping.

## Pitfalls
- **CDP/puppeteer-on-9222 crashes on LinkedIn's EA iframe** on operator's machine (renderer dies ~6-40s into interaction; every flag combo — `--disable-gpu`, `--no-sandbox`, `--in-process-gpu`, `--disable-features=site-per-process` — failed). Do NOT sink time into Chrome stability flags; build the extension instead. (Lesson from 2026-08-15: ~9 live attempts all died; the fill engine was proven correct but the browser couldn't survive the EA iframe.)
- Never fabricate answers for missing required fields — pause for human review (operator's standing rule; fabricated education %/GPA burned him before).
- The user-owned `linkedin-easy-apply` SKILL (in `~/job-apply/linkedin-easy-apply.cjs` + `~/linkedin-easy-apply-product/`) holds the proven puppeteer engine (scanner/decide/applyScript). Port that logic into the extension content script. Recommend `hermes curator adopt linkedin-easy-apply` to make it editable.
- `taskkill /F /IM chrome.exe` in the terminal tool is auto-approved; use it to clear zombie Chrome procs, but a fresh launch via `terminal background=true` is the reliable way to bring 9222 up (MSYS `start` mangles the Windows path).

## References
- references/wraith-architecture.md — MV3 blueprint extracted from YOUR_GITHUB_USERNAME/wraith-marketing-plugin
- references/kilo-models.md — working free model IDs + endpoint shape + live probe
