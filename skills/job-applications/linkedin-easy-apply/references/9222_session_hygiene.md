# LINKEDIN_PORT Chrome — session hygiene & login detection (XXXXXXX hard lessons)

## Login detection — DO NOT use document.cookie
LinkedIn sets `li_at` as `HttpOnly`+`Secure`+`SameSite`, so `document.cookie` (JS) can
NEVER see it. A `document.cookie.includes('li_at')` check returns `false` even when fully
logged in — this caused a false "logged out" that burned a whole session.

CORRECT login probe (pick one):
- CDP: `const c = await page.cookies('https://www.linkedin.com'); const li = c.find(x=>x.name==='li_at');` (length ~152 when logged in).
- Navigation: `page.goto('/feed/')` then assert `location.href` stays on `/feed/` (not `/login/`).
- `.global-nav__me` selector ALSO returns false on current markup — do not use as a probe.

## li_at present ≠ apply works
A session can be logged in (li_at present, /feed/ stable) yet APPLY-throttled (EA modal
won't open — `apply_one.cjs` reports `modal_no_open`). Always report login-state and
apply-throttle as two SEPARATE facts. Throttle action: STOP, wait 30min–24h; do NOT pound.

## Tab-mass-close CRASH (do not repeat)
Mass-closing tabs via the CDP `/json/close/<id>` loop CRASHED the LINKEDIN_PORT browser (connection
refused; full relaunch required). The LINKEDIN_PORT session is fragile under bulk tab ops.
- Drive ONE tab at a time (user's hygiene rule).
- If you must reduce tabs, close a FEW with `sleep` delays between calls — never a tight loop.
- Relaunching LINKEDIN_PORT loses the LinkedIn login (operator re-auths with creds + OTP).
- Relaunch flags: `--remote-debugging-port=LINKEDIN_PORT --user-data-dir=XXXXXXX/chrome-profile
  --hide-crash-restore-bubble --disable-backgrounding-occluded-windows
  --disable-renderer-backgrounding --disable-background-timer-throttling`.

## NEVER run parallel browser-automation scripts against LINKEDIN_PORT
`withPage` (cdp_helper) reuses `pages[0]`. Two concurrent processes fight over that one tab
and collide (one run lands on the other's page → fills the wrong form / no-ops). Run
SEQUENTIALLY: one browser task, wait for it to finish, then the next.
