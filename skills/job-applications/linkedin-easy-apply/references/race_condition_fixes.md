# Race-condition fixes (job-apply stack, 2026-08-20)

Concrete patterns that eliminated "Execution context was destroyed" and double-loop
races in the autonomous apply stack. Apply these when rebuilding/reusing the drivers.

## 1. Isolated tab per `withPage` call (was: shared pages[0])
The old `cdp_helper.cjs` reused `pages[0]` for every caller. Two concurrent callers
(loop + cron, or a retry mid-navigation) fought over that one tab -> one's
`page.evaluate` ran on the other's detached/freshly-navigated context ->
"Execution context was destroyed".

CORRECT `withPage` (both `cdp_helper.cjs` and `cdp_helper_9223.cjs`):
```js
async function withPage(fn) {
  const wsEndpoint = await getBrowserWSEndpoint();
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
  let page = null;
  try {
    page = await browser.newPage();          // OWN tab per call
    return await fn(page, browser);
  } finally {
    if (page) { try { await page.close(); } catch (e) {} }   // close on cleanup
    await browser.disconnect();
  }
}
```
A new tab in the same browser keeps the account session (cookies are account-scoped,
not tab-scoped) — no re-auth needed. DO NOT revert to pages[0].

## 2. Single-instance loop lock — FILESYSTEM HEARTBEAT, NOT PID (corrected 2026-08-28)
`autoapply_loop.py` `main()` must NOT use a pid check. The pid-based pattern below is
**BROKEN on this host** and caused two loops to race on port 9222 for hours:

```python
# ❌ WRONG — pid checks false-negative across Windows sessions
pidfile = os.path.join(BASE,'_loop.pid')
if os.path.exists(pidfile):
    oldpid = int(open(pidfile).read().strip())
    out = subprocess.run(['tasklist','/FI',f'PID eq {oldpid}',...]).stdout   # sees nothing
    if str(oldpid) in out: sys.exit(0)
# os.kill(oldpid,0) also returns False for a live pid from another session.
```

Root cause: the watchdog cron (`355e44e24008`) is launched by the Hermes agent runtime in a
DIFFERENT Windows session/integrity level. `tasklist` / `Get-Process` / `os.kill(pid,0)` from
that session cannot see the loop's pid, so the guard concludes "owner dead" and starts a
SECOND loop. Two loops then fight over the LinkedIn 9222 tab.

✅ CORRECT — filesystem lockfile + heartbeat (shared across ALL sessions):
```python
import time
lockfile = os.path.join(BASE, '_loop.lock')
hbfile   = os.path.join(BASE, '_loop.heartbeat')
me = os.getpid()
def _hb_fresh(max_age=150):
    try: return (time.time() - os.path.getmtime(hbfile)) <= max_age
    except Exception: return False
lockfd = None
for _ in range(4):                      # brief retry to absorb concurrent O_EXCL race
    try:
        lockfd = os.open(lockfile, os.O_CREAT|os.O_EXCL|os.O_WRONLY)
        os.write(lockfd, str(me).encode()); break     # we own it; fd open = lifetime guard
    except FileExistsError:
        if _hb_fresh():
            sys.stderr.write('Another loop already running (fresh heartbeat). Exiting.\n')
            sys.exit(0)
        # stale lock (owner died without cleanup) -> remove and retry
        try: os.remove(lockfile)
        except Exception: pass
        try: os.remove(hbfile)
        except Exception: pass
        time.sleep(0.5)
else:
    sys.stderr.write('Could not acquire loop lock after retries; refusing to start.\n')
    sys.exit(1)
globals()['_loop_lock_fd'] = lockfd      # keep open for process lifetime
# in the main loop body, each cycle: open(hbfile,'w').close()  # touch mtime
```
Notes:
- Heartbeat is filesystem = visible to every interpreter/session, so it is the ONLY
  reliable cross-session liveness signal here. A `Global\` named mutex ALSO fails (the cron
  session gets its own namespace), so do not use that either.
- The loop's own main loop must touch `_loop.heartbeat` every cycle so a second instance
  sees "fresh" and exits.
- The watchdog cron's "is the loop alive?" check must ALSO read the heartbeat mtime, NOT
  the pid — e.g. `powershell -NoProfile -Command "(Get-Item _loop.heartbeat).LastWriteTime"`
  vs now; if <150s old → do nothing, else relaunch. Update the cron prompt accordingly.
- Do NOT `rm -f _loop.lock` / `_loop.heartbeat` in launcher commands — deleting the live
  lock lets a second instance recreate it and both run. Let the guard's stale-path steal it.


## 3. LinkedIn EA dedup false-positive (was skipping ALL fresh jobs)
`apply_one.cjs` flagged `already_applied` via loose regex that matched LinkedIn's
"X people applied" sidebar. Fixed to genuine-confirmation only:
```js
const already = await page.evaluate(() => {
  const t = document.body.innerText;
  return /your application (was )?submitted|application (status|submitted)|you(?:'ve| have) (already )?applied to this job|withdrew application|you applied on/i.test(t);
});
```
If a FRESH job ID reports already_applied, suspect this regex regressed — re-tighten,
don't assume throttle.

## 4. Cron de-collision
Two crons both firing `apply_one` on port 9222 = race. Make the loop the SOLE EA driver
and PAUSE the standalone EA retry cron. The watchdog cron only relaunches-if-dead (no
concurrent driving). Watchdog checks "is loop alive?" -> if alive, does nothing.

## 5. Per-submission notification (exact format, no chat spam)
Loop writes `{company, role, board, when(IST), ts}` to `submissions_pending.jsonl`.
A 2-min notifier cron reads pending, posts
`✅ Applied: <Company> — <Role> — <DD Mon YYYY, HH:MM AM/PM IST>`
via `hermes send --to whatsapp "<msg>"`, then moves to `submissions_sent.jsonl`.
IST = `time.gmtime(now + 19800)` formatted `%d %b %Y, %I:%M %p IST`.
