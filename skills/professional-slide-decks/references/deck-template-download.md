# Driving a logged-in Chrome to grab a SlidesGo (or similar) .pptx

## Root cause (diagnosed 2026-08-15)
The browser PROCESS stays alive (24+ chrome.exe procs confirmed via `tasklist`). The failure is the
**DevTools transport**, not the browser dying:
- The HTTP `http://127.0.0.1:9222/json/version` endpoint intermittently times out / hangs
  (even right after a fresh launch, even with `--disable-dev-shm-usage --disable-gpu`).
- The per-page WebSocket `ws://127.0.0.1:9222/devtools/page/<tid>` also intermittently refuses the
  handshake (`TimeoutError: timed out during opening handshake`), while the browser WS connects fine.
This is a known Chrome-on-Windows issue on heavy SPAs (SlidesGo is a big React app). **Do not loop
relaunching Chrome** — it cancels any in-flight download and burns turns.

## What actually works
1. **Get the browser WS URL without the flaky HTTP**: read it from the Chrome launch log, which prints
   it once at startup:
   `grep -oE 'ws://127.0.0.1:9222/devtools/browser/[a-f0-9-]+' chrome9222.log | tail -1`
   (launch log path: the file you redirected Chrome stdout to, e.g.
   `C:/Users/operator/AppData/Local/hermes/chrome9222.log`).
2. Connect to that `ws://.../devtools/browser/<uuid>` directly. Use ONE socket:
   `Target.getTargets` -> find the `slidesgo.com/theme/...` page -> `Target.attachToTarget`
   with `flatten:true` -> use the returned `sessionId` for all `Runtime.evaluate` calls.
   This avoids the per-page `devtools/page/<tid>` handshake that flakes.
3. `Runtime.evaluate` works without first calling `Runtime.enable`; skip `Runtime.enable` because
   calling it then `await recv()` desyncs id matching.
4. Liveness check must use **process**, not the HTTP endpoint:
   `subprocess.run(["tasklist","/FI","IMAGENAME eq chrome.exe"])` and look for "chrome.exe".

## SlidesGo free-template download flow (once WS is live)
- The page shows "LOGOUT" when logged in (confirm via
  `Array.from(document.querySelectorAll('button')).map(b=>b.innerText)`).
- Click flow: dismiss cookie banner first (button whose text includes "allow all"), then click the
  `button/a` whose `innerText.trim().toLowerCase() === 'download'`, wait ~5s, then click the
  `button` whose text includes "powerpoint" (NOT `a` — there is a "powerpoint tutorials" link that
  matches; scope to `button` only, or `!e.getAttribute('href')`).
- After the PowerPoint click, the file should appear in the Chrome Downloads folder
  (`C:/Users/operator/Downloads`). Poll that dir; do NOT relaunch the browser while waiting (it cancels
  the download).
- If a registration/email gate modal appears, the autonomous path is blocked — ask the operator to download
  the .pptx himself and send it.

## Reliable fallback (preferred for the operator)
the operator is already logged in. The fastest, most reliable way to get the literal template is to ask HIM
to click Download and send the .pptx. Then rebuild his content into that template's real slide
masters with python-pptx (editable, best result). Try the CDP route ONCE; if the transport flakes,
fall back to the user-download path within a couple attempts — don't burn 20+ calls.
