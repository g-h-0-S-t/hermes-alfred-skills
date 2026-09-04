# Watchdog Cron spec (job-apply-autopilot)

Runs every 30 min. Purpose: keep the autopilot loop + both Chrome instances alive
without human involvement.

## What it checks
1. Is `python autoapply_loop.py` (process on LINKEDIN_PORT/ATS_PORT) alive?
2. Is Chrome LINKEDIN_PORT (`http://127.0.0.1:LINKEDIN_PORT/json/version`) responding?
3. Is Chrome ATS_PORT (`http://127.0.0.1:ATS_PORT/json/version`) responding?

## Relaunch recipes (Windows)
- Loop dead → `cd XXXXXXX/job-apply && python autoapply_loop.py`
  (background, no notify).
- LINKEDIN_PORT down → `chrome.exe --remote-debugging-port=LINKEDIN_PORT
  --user-data-dir=XXXXXXX/chrome-profile --hide-crash-restore-bubble
  --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  --disable-background-timer-throttling`
- ATS_PORT down → `chrome.exe --remote-debugging-port=ATS_PORT
  --user-data-dir=XXXXXXX/greenhouse-chrome
  --disable-blink-features=AutomationControlled --no-first-run`

## Behavior
- If everything alive: do nothing (silent).
- If something dead: relaunch it, then report ONLY what was relaunched (don't
  spam on healthy cycles).
- Note: relaunching LINKEDIN_PORT loses the LinkedIn login — operator must re-auth. The
  watchdog should still relaunch (better a logged-out alive browser than a dead
  one); flag the re-auth need to user.
