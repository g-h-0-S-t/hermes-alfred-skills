# Chrome Durability + Silent Zero-Apply Diagnostic (XXXXXXX-31)

## The recurring trap
The job-apply loop (`autoapply_loop.py`) keeps a filesystem heartbeat fresh every 30s
**even when the browser is dead**. So `cronjob list` shows "running" while the loop applies
NOTHING for hours/days — because both Chrome debug sessions (LINKEDIN_PORT LinkedIn, ATS_PORT Greenhouse)
died (host reboot / background terminal reaped on session end). The only symptom in the log is
`LI jobs found: 0` → "Empty scrape streak N — backing off" and `GH batch rc=3221225794`.

`rc=3221225794` (0xC0000409, STATUS_STACK_BUFFER_OVERRUN) on `gh_batch.cjs` = the ATS_PORT Chrome
node child crashed mid-fill — almost always because the browser was already degraded/dead.

## Diagnostic recipe (run in order; answers in seconds)
```bash
# 1. Are the browsers actually listening? (the real liveness test)
curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version >/dev/null && echo "LINKEDIN_PORT UP" || echo "LINKEDIN_PORT DOWN"
curl -s -m8 http://127.0.0.1:ATS_PORT/json/version >/dev/null && echo "ATS_PORT UP" || echo "ATS_PORT DOWN"

# 2. Loop heartbeat (filesystem — true liveness, NOT browser-dependent)
python3 -c "import os,time;print(f'loop heartbeat {time.time()-os.path.getmtime('_loop.heartbeat'):.0f}s ago')"

# 3. Did anything actually get applied recently? (the proof, not the log)
python3 -c "import json;d=json.load(open('applied.json'));[print(a.get('id'),a.get('when')) for a in d.get('applied',[])][-5:]"

# 4. End-to-end proof: apply ONE fresh job directly
env -u PYTHONPATH -u PYTHONHOME node apply_one.cjs \
  "https://www.linkedin.com/jobs/view/<FRESH_JID>/" 2>&1 | tail -20
# => expect: {"submitted": true, "confirm": "Application submitted"}
```
If step 1 shows DOWN but step 2 shows fresh → you are IN the silent zero-apply trap. Relaunch
Chrome (recipe below) and re-run step 4 to confirm.

## Relaunch recipe (exact flags — do NOT change)
```bash
# LinkedIn (logged-in session, keep user-data-dir so login persists)
"C:/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=LINKEDIN_PORT \
  --user-data-dir=XXXXXXX/chrome-profile \
  --hide-crash-restore-bubble \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-background-timer-throttling

# Greenhouse / external-ATS (anti-detect, guest boards need no login)
"C:/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=ATS_PORT \
  --user-data-dir=XXXXXXX/greenhouse-chrome \
  --disable-blink-features=AutomationControlled \
  --no-first-run \
  --disable-backgrounding-occluded-windows \
  --disable-renderer-backgrounding \
  --disable-background-timer-throttling
```
Notes:
- Binary is `C:/Program Files/Google/Chrome/Application/chrome.exe` — NOT the
  `AppData/Local/Google/Chrome/...` path (that silently fails to launch).
- Launch as a BACKGROUND process (terminal `background=true`) so it survives the chat session.
- After relaunch, `curl` both ports; wait ~12s for CDP to come up.

## Durable Startup daemon (install ONCE — belt-and-suspenders)
Drop this at
`%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\JobApplyChromeDaemon.bat`.
It self-heals the browsers on every Windows logon and re-launches them if they crash, so the
loop is never left idle silently.
```bat
@echo off
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
set LIPROFILE=OPERATOR_HOME/chrome-profile
set GHPROFILE=OPERATOR_HOME/greenhouse-chrome
:loop
  netstat -ano | findstr ":LINKEDIN_PORT" >nul || start "" %CHROME% --remote-debugging-port=LINKEDIN_PORT --user-data-dir=%LIPROFILE% --hide-crash-restore-bubble --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling
  netstat -ano | findstr ":ATS_PORT" >nul || start "" %CHROME% --remote-debugging-port=ATS_PORT --user-data-dir=%GHPROFILE% --disable-blink-features=AutomationControlled --no-first-run --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling
  timeout /t 60 /nobreak >nul
goto loop
```
If the cron watchdog (`CRONID_XXXXXXXXXXXX`) also failed to restart Chrome (observed XXXXXXX-31), the
Startup daemon is your backstop. Verify it exists with:
`test -f "$APPDATA/Microsoft/Windows/Start Menu/Programs/Startup/JobApplyChromeDaemon.bat"`

## Why "0 jobs found" is almost never throttle
Throttle = EA button present but modal won't open / a "daily Easy Apply limit" modal.
A flat `LI jobs found: 0` with no EA-button interaction = browser DOWN or logged-out. Always
check the port before assuming throttle and pausing.
