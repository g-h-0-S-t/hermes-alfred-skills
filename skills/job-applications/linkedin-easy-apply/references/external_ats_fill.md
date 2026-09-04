# External ATS fill (Greenhouse / Lever / Ashby / iCIMS / SmartRecruiters)

operator wants Alfred to autonomously apply to these too, not just LinkedIn Easy Apply.
This reference captures the technique proven so far (2026-08-19). **Submit is NOT yet
verified** — treat as in-progress, not a validated workflow.

## 1. Detect external-ATS jobs
LinkedIn "Apply" on these is an `<a>` whose href is a LinkedIn safety redirect:

    https://www.linkedin.com/safety/go/?url=<URL-ENCODED ATS URL>&urlhash=...&isSdui=true

Decode the `url=` param to reach the real ATS form, e.g.
`https://job-boards.greenhouse.io/<company>/jobs/<id>`. The detail page has **no** EA modal.
Collect by dropping `f_AL=true` from the search URL (see `ats_collect.cjs`):

    https://www.linkedin.com/jobs/search/?keywords=<kw>&location=India&f_TPR=r86400&sortBy=DD

Open each detail, read the button text; `isEA = /easy apply/i`, else external if `/^apply$/i`.

## 2. Form structure (Greenhouse, representative)
Standard `<form>`:

    #first_name  #last_name  #email  #country  #phone  #candidate-location
    #resume            (input[type=file], required by most)
    #cover_letter      (input[type=file], optional)
    #question_<id>     text fields (LinkedIn profile, years exp, Vue exp, comp, notice, relocate...)

Labels: `el.closest('div')?.querySelector('label')` or `label[for=id]`, else wrapper `div` innerText.
Lever/Ashby/iCIMS are the same shape with different id schemes (`application_...`, `req_...`).

## 3. Fill (reuse the CDP withPage single-tab driver)
Map id -> PROFILE value (same as EA): firstName/lastName/email/phone/India/Bengaluru/
linkedin / years / CTC 86 / expected 50 / notice 0 / relocate Yes. Answer each
`question_<id>` by reasoning over the profile (e.g. "years overall experience?" -> 14;
"hands-on Vue 3?" -> "Yes, 8 years with Vue 3"; comp -> "86 LPA"; expected -> "50 LPA";
join -> "Immediate (0 days notice)"; Pune relocate -> "Yes").

Text fields:
    await el.click({clickCount:3});
    Ctrl+A; Backspace;
    await page.keyboard.type(val, {delay:20});
    el.evaluate(e => { e.dispatchEvent(new Event('input',{bubbles:true}));
                        e.dispatchEvent(new Event('change',{bubbles:true})); e.blur(); });

File upload (HEADLESS-safe):
    page.on('filechooser', async ch => { try { await ch.accept([RESUME]); } catch(e){} });
    // registered BEFORE clicking the file input
    await fileEl.evaluate(e => e.click());   // triggers the OS chooser
    await sleep(1800);
    const fv = await page.evaluate(s => document.querySelector(s)?.value || '', '#resume');
    // fv non-empty => uploaded. A too-fast read returns '' (timing artifact, not failure).

## 4. reCAPTCHA nuance (IMPORTANT)
Greenhouse renders an **invisible** reCAPTCHA: a hidden `textarea#g-recaptcha-response` plus an
ENABLED Apply button, and NO "I'm a robot" checkbox, and `humanChallenge: false`. This is NOT a
blocking captcha. Do NOT stop on the hidden honeypot field (an earlier filler did and bailed
falsely). Proceed to submit. If a VISIBLE "verify you are human" / checkbox challenge appears,
STOP and ask operator.

## 5. CDP driver gotcha (reproduced — cost ~5 min of hangs)
Inside `withPage`, `el.evaluate(e => e.value)` on an **ElementHandle** HANGS the script — the
evaluate never returns and the whole fill loop blocks after the first text field. FIX: read
values with the **selector-string** form:

    const got = await page.evaluate(s => document.querySelector(s)?.value || '', '#'+id);

Returns instantly, never hangs. Keep `.click()`/`.type()` on the handle; only READS must use
`page.evaluate(selectorString)`.

## 6. Status (2026-08-19)
- PROVEN: detect external-ATS jobs; map + fill all text/select/file fields; file-upload wiring;
  invisible-reCAPTCHA is not blocking.
- NOT PROVEN: a clean end-to-end SUBMIT. A live Greenhouse (SonicWall, Vue 3 role) run filled
  every field, clicked Submit, but the result page showed no "thank you / application submitted"
  text (likely the invisible reCAPTCHA scored the headless session, or the form reloaded to the
  same URL). Until a real confirmation is captured, do NOT log external-ATS jobs as `applied`.
- operator asked to log into Greenhouse manually when a challenge appeared — he retains auth control.
  Resume the filler only after he confirms login, or do a dry-run (no submit) first so he can eyeball.

## 7. Scripts (OPERATOR_HOME/job-apply, NOT yet promoted)
- `ats_collect.cjs` — find external-ATS jobs (drops f_AL), classifies EA vs external.
- `ats_fill.cjs` — Greenhouse fill (v4 uses `page.evaluate` reads; fixes the hang). Iterate here
  until a verified submit, then fold into `apply_one.cjs` / `ea_fill.cjs` driver set.
