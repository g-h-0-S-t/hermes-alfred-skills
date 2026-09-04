# Loop daemon robustness — stdout crash + singleton-guard false-positive (2026-08-29, reproduced)

`OPERATOR_HOME/job-apply/autoapply_loop.py` is the production driver. Two daemon-class bugs
were found and fixed this session.

## Bug 1 — `log()` stdout write kills the whole loop
Original `log()`:
```python
def log(*a):
    line = time.strftime('%H:%M:%S ')+' '.join(map(str,a))+'\n'
    with open(LOG,'a') as f: f.write(line)
    print(line, end='', flush=True)   # <-- UNSAFE
```
When the daemon runs as a background terminal process and that pty's stdout handle is reaped
(session churn / terminal closed), the next `print()` raises `OSError: [Errno 22] Invalid
argument` and the UNHANDLED exception kills the entire loop. Confirmed in `_loop_crash.log` at
09:24. The file write succeeds, so the failure is silent until you notice no applies are landing.

**Fix:** the file log is the durable record; wrap the stdout write in try/except so a broken
pipe can never crash the daemon:
```python
def log(*a):
    line = time.strftime('%H:%M:%S ')+' '.join(map(str,a))+'\n'
    try:
        with open(LOG,'a') as f: f.write(line)
    except Exception:
        pass
    try:
        sys.stdout.write(line); sys.stdout.flush()
    except Exception:
        pass
```

## Bug 2 — pid-based singleton guard false-positives and blocks startup
A `Get-CimInstance Win32_Process` (or `Get-Process` / `os.kill(pid,0)`) pre-check produced a STALE
phantom PID (e.g. 26228) and refused to start the loop:
`REFUSING: autoapply_loop already running as PID(s) [26228]` — even though no loop was alive.
This is exactly the cross-session liveness failure the filesystem-lock + heartbeat was designed to
avoid (see AUTONOMOUS LOOP ARCHITECTURE in SKILL.md).

**Fix:** REMOVE the pid-based pre-check entirely. Rely ONLY on the filesystem lock + heartbeat.
Do NOT re-add a pid check — it will false-positive again on this machine.

## Verification recipe (use when "nothing is applying")
- Loop alive? `tasklist | grep python` AND confirm the pid in `_loop.pid` / `_loop.heartbeat`
  mtime is fresh (<~150s).
- Did it crash? `tail _loop_crash.log` — an `OSError [Errno 22] Invalid argument` there = the
  stdout bug (fixed above).
- Browsers up? `curl -s -m8 http://127.0.0.1:9222/json/version` and `:9223` must return JSON.
- Relaunch: clear stale guard files first, then
  `env -u PYTHONPATH -u PYTHONHOME python autoapply_loop.py` (background daemon).
  `rm -f _loop.lock _loop.heartbeat _loop.pid _loop.err _loop.out`
