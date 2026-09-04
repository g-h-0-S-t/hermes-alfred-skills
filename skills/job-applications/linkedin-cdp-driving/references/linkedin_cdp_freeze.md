# LinkedIn 9222 Chrome freeze — evidence & diagnosis recipe

## Symptom
Browser stops responding during LinkedIn automation. `curl -s -m8 http://127.0.0.1:9222/json/version`
returns `http=000` (empty) while `netstat -ano | grep :9222` still shows LISTENING.
Child renderer/gpu/utility processes stay `Responding=True` (tasklist/Get-Process).

## Windows Event Log proof
Event ID 1002, source "Application Hang":
> The program chrome.exe version 151.0.7922.138 stopped interacting with Windows and was closed.

## Reproduction (2026-08-15, 5x)
1. cua-driver `computer_use(action='capture', mode='som', app='Chrome')` over the LinkedIn tab
   -> freeze within seconds. UIA tree-walk of LinkedIn's huge DOM blocks the main thread. (CAUSE A — still valid.)
2. puppeteer-core sustained driving (8x scroll loop, All-filters panel clicks) -> freeze.
3. A SINGLE light CDP pass (one goto + one read, or one apply attempt) -> SURVIVES (http=200 after).

## CAUSE B — CDP page crash on load (the one that broke the EA pipeline, 2026-08-16)
Different failure mode: `page.goto` returns "Navigating frame was detached" / "Session closed.
Most likely the page has been closed." on EVERY site (even `example.com`), not just LinkedIn.
Root cause: the 9222 profile had ~30 extensions loaded AND Chrome's `/dev/shm` on this machine
is tiny. Diagnosis trick: launch a FRESH profile with `--no-sandbox --disable-gpu
--disable-dev-shm-usage` and the same goto works — so it is NOT LinkedIn-specific. Fix WITHOUT
losing the login: relaunch the SAME `chrome-cdp-profile` with `--disable-extensions
--disable-dev-shm-usage` (+ the other flags below). After that, a 10-keyword collect + multiple
applies runs with ZERO crash. This supersedes the old "one light pass per browser" rule: with
the hardening flags, sustained CDP work is safe.

## Diagnosis recipe
```powershell
# health
curl -s -m5 -o /dev/null -w "http=%{http_code}\n" http://127.0.0.1:9222/json/version
# if 000 OR any page.goto throws "frame detached"/"Session closed" -> hung/crashing
# find + kill the 9222 main process only (keep nothing else):
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*chrome-cdp-profile*' -and $_.CommandLine -like '*remote-debugging-port=9222*' -and $_.CommandLine -notlike '*--type=*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
# relaunch WITH hardening flags (extensions + dev-shm disabled are mandatory):
Start-Process "C:/Program Files/Google/Chrome/Application/chrome.exe" -ArgumentList `
  '--remote-debugging-port=9222','--user-data-dir=C:\Users\operator\chrome-cdp-profile',`
  '--disable-extensions','--no-sandbox','--disable-gpu','--disable-software-rasterizer',`
  '--disable-dev-shm-usage','--hide-crash-restore-bubble',`
  '--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--no-first-run',`
  '--window-size=1400,900' -WindowStyle Normal
```

## What does NOT fix it
- `--disable-gpu` alone — GPU was never the culprit (CAUSE A); for CAUSE B you need
  `--disable-extensions --disable-dev-shm-usage`.
- Retrying the same capture — zero upside, risks account ban.
- Waiting on the same hung process — must kill + relaunch.

## Fix
Drive via raw CDP (puppeteer-core) only. Never `computer_use`/`cua_browser_*` on LinkedIn.
Relaunch the 9222 profile with the hardening flag set above; then sustained collect+apply is safe.
