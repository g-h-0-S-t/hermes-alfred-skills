---
name: windows-autostart-ops
description: Fix Windows flickering consoles and dead dashboard.
---

# Windows Autostart & Service Ops (the user's XXXXXXX, Windows 10)

Class of work: keeping Hermes' background services (dashboard, gateway, Ollama,
bridge) running on Windows without manual intervention, and fixing the classic
Windows failure modes (flickering consoles, dead servers, config-drift cron
blocks).

## Trigger
- "terminal keeps opening and closing", "flickering console", "dashboard not
  accessible", "cron jobs stopped working after I renamed X", any Windows
  autostart/scheduled-task/service question for this machine.

## Pattern 1 — Flickering console = a .bat ending in `pause` launched non-interactively
Symptom: a command-prompt window repeatedly opens/closes. Root cause almost
always: a batch file launched from the **Shell:Startup** folder
(`%AppData%\Microsoft\Windows\Start Menu\Programs\Startup`) or a **scheduled
task** ends with `pause`. In a non-interactive Startup context there is no one
at the keyboard, so `pause` blocks forever holding the console open; any
re-trigger (second logon, a gateway restart that also launches the bat) spawns
another stuck console → the open/close flicker.

Fix:
1. Kill the stuck consoles: `tasklist | grep run_server` → `taskkill /F /PID <n>`.
2. Stop a stuck scheduled task: `schtasks /end /tn "\TaskName"`.
3. **Remove `pause`** from the .bat; replace with `goto :eof` so it exits
   cleanly. The server it launched (`start "" "%PY%" server.py`) runs detached,
   so exiting the bat does NOT kill the server.
4. If BOTH a Startup-folder shortcut AND a scheduled task launch the same bat,
   delete the redundant scheduled task (`schtasks /delete /tn "\TaskName" /f`) to
   stop double-launches. The Startup folder alone covers "run at Windows logon".

Note: `run_server.bat` self-elevates (`net session` → `RunAs`) and ends with
`pause` — that `pause` is the flicker source when run non-interactively.

## Pattern 2 — Dashboard self-healing watchdog (don't rely on logon-only autostart)
Logon-only autostart (Startup folder / scheduled task "At logon") does NOT
relaunch the server if it dies *while you're logged in* (the trigger already
fired). Add a cron watchdog that pings the port and relaunches if down:
- Script pings `http://127.0.0.1:8787/`; if down, `subprocess.Popen([PY,
  server.py], cwd=HERE, creationflags=0x8)` (DETACHED_PROCESS), stdout/stderr
  DEVNULL. Stay silent when healthy; print only on restart.
- Cron: `*/5 * * * *`, `enabled_toolsets:["terminal"]`, `deliver:"origin"` (so
  the user is notified only on an actual restart).
Server: `C:/Users/operator/AppData/Local/hermes/scripts/dashboard/server.py`,
ports 8787 (HTTP) + 8788 (WS). Public via Tailscale Funnel
`https://Hermes Agent.XXXXXXX.ts.net/`.

## Pattern 3 — Config rename breaks cron jobs (anti-spend drift guard)
If you rename a provider/model in `config.yaml` (e.g. `ollama-local` → `ollama`,
model `qwen3:4b` → `tencent/hy3:free`), the scheduler's **config-drift guard**
blocks every *unpinned* cron job with:
`RuntimeError: Skipped to prevent unintended spend: global inference config
drifted since this job was created (provider 'X' -> 'Y'...)`. All jobs error.

Fix: re-pin each job's `provider_snapshot`/`model_snapshot` in
`C:/Users/operator/AppData/Local/hermes/cron/jobs.json` to the CURRENT
provider/model, then run the job to confirm `last_status: ok`. (The
`cronjob update` tool does NOT accept `provider`/`model` fields — it silently
drops them, so edit `jobs.json` directly.) Verify with `grep '"last_status":
"ok"' jobs.json`.

## Hard rules for this machine
- `config.yaml` is write-protected — use `hermes config set <key> <val>`, never
  hand-edit. (e.g. `hermes config set stt.local.model small`.)
- Shell is MSYS git-bash: use Windows-style or `/c/...` paths; PowerShell
  inline `Where-Object { $_.X ... }` breaks when the MSYS shell mangles `$_`
  into a path — use `schtasks` (cmd) instead of PowerShell for task queries.
- Tailscale Funnel publish (`tailscale funnel --bg`) can trip the gateway's
  "don't restart gateway" guard if run via the terminal tool — prefer launching
  `server.py` directly for the dashboard; the funnel is a persistent bg service.

## Setup

Windows service and startup management.

**Personal data needed:**
- `XXXXXXX` — your home directory
- `XXXXXXX` — your Windows username

**Dependencies:**
- Windows OS
- PowerShell

**Placeholders used:** XXXXXXX, XXXXXXX
