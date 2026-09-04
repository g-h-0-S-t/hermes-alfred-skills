# Watchdog Cron spec (job-apply-autopilot)

Runs every 30 min. Purpose: keep the autopilot loop + both Chrome instances alive
without human involvement.

## What it checks
1. Is `python autoapply_loop.py` (process on 9222/9223) alive?
2. Is Chrome 9222 (`http://127.0.0.1:9222/json/version`) responding?
3. Is Chrome 9223 (`http://127.0.0.1:9223/json/version`) responding?

## Relaunch recipes (Windows)
- Loop dead → `cd OPERATOR_HOME/job-apply && python autoapply_loop.py`
  (background, no notify).
- 9222 down → `chrome.exe --remote-debugging-port=9222
  --user-data-dir=OPERATOR_HOME/chrome-cdp-profile --hide-crash-restore-bubble
  --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
  --disable-background-timer-throttling`
- 9223 down → `chrome.exe --remote-debugging-port=9223
  --user-data-dir=OPERATOR_HOME/greenhouse-chrome
  --disable-blink-features=AutomationControlled --no-first-run`

## Behavior
- If everything alive: do nothing (silent).
- If something dead: relaunch it, then report ONLY what was relaunched (don't
  spam on healthy cycles).
- Note: relaunching 9222 loses the LinkedIn login — operator must re-auth. The
  watchdog should still relaunch (better a logged-out alive browser than a dead
  one); flag the re-auth need to operator.
