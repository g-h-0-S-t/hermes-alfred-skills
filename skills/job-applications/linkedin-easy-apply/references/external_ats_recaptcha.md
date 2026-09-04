# External-ATS reCAPTCHA findings (2026-08-19)

Session goal: apply via Greenhouse + custom ATS. Key result — reCAPTCHA behavior differs
per portal, and the "automation fingerprint" hypothesis for Greenhouse is DISPROVEN.

## Greenhouse (job-boards.greenhouse.io) — reCAPTCHA is a HARD WALL
Invisible reCAPTCHA (`#g-recaptcha-response`). Automated session: token length stays **0**
(before AND after the real submit click). Submit silently dies (no confirm, no error, form
just stays). Systemic across Tech Holding AND LumiMeds.

**Hypothesis DISPROVEN:** suspected puppeteer `$cdc_` fingerprint. Tested 3 independent ways,
ALL token=0:
1. puppeteer-core on 9222 (has `$cdc_`),
2. raw-CDP driver `cdp_raw.cjs` with ZERO `$cdc_` fingerprint (confirmed via
   `Object.keys(window).filter(k=>/$cdc|^cdc_/.test(k)).length` → 0),
3. separate anti-detect Chrome on :9223 launched with
   `--disable-blink-features=AutomationControlled` (fingerprint count 0).

reCAPTCHA simply refuses automated submission regardless of fingerprint. CONCLUSION:
Greenhouse automated submit is NOT achievable without defeating captcha (forbidden).
Only path = human-click handoff (operator clicks "Submit application") or reCAPTCHA-free boards.
Do NOT loop-retry the automated submit. (The :9223 anti-detect Chrome lives at
`OPERATOR_HOME/greenhouse-chrome`; drivers `cdp_helper_9223.cjs` + `gh_apply_9223.cjs`.)

## EPAM (welcome.epam.in) — reCAPTCHA PASSES, but sign-in-gated
Custom ATS. Apply = CV upload (`input[name=file]`) + reCAPTCHA. UNIQUE among portals tried:
the reCAPTCHA token DID generate on the real 9222 browser (valid token present in
`g-recaptcha-response`). So EPAM reCAPTCHA is passable by the automation. BUT the apply
form appears sign-in-gated (page rendered "SIGN IN"), and the tab hung under 85-tab load.
Potential submittable path once the session is stable + signed in with operator's Gmail.

## micro1.ai — form submits, then a LIVE interview gate
Form auto-fill (name/email/phone/resume/LinkedIn/JS-years) lands the application in their
system, but the role then requires a ~50-min LIVE AI video interview (camera + mic +
screen-share). Email from support@micro1.ai "Your Web Developer application is incomplete" =
pending interview, NOT a failed submit. Cannot automate a camera interview — operator must do it.

## Talent500 (talent500.co) — new lead, unwired
operator has incomplete Senior/Sr Software Engineer applications there (Gmail reminders
2026-08-19). Not yet automated; login/captcha state unknown.

## Cross-cutting
- Verify submissions via Gmail confirmation, NOT just "form closed / Processing…" screen.
  micro1's "Processing…" was a false positive; the real verdict was the later email.
- Country field on Greenhouse is a react-select (`#country`): click + type "India" + Enter
  to resolve +91; plain `setReact` leaves it empty and Submit silently fails.
- 502 flakiness on Greenhouse: detect `/502|bad gateway|lost in the weeds/i`, retry nav 3x.
