#!/usr/bin/env python3
"""loop_health_check.py — verify the job-apply autopilot is running exactly once.

Run from anywhere (no PYTHONPATH needed). Prints:
  - every python.exe whose cmdline mentions autoapply_loop / run_loop / autoapp / job-apply-autopilot
  - for each, its parent pid + parent cmdline (so you can see the supervisor bash)
  - whether OPERATOR_HOME/job-apply/_loop.lock matches the sole live loop
  - Chrome 9222 / 9223 health (curl http://127.0.0.1:<port>/json/version)
  - applied.json count

Usage:  python loop_health_check.py
Exit 0 if exactly one loop is alive AND both Chrome ports respond; else 1.
"""
import os, sys, json, subprocess, urllib.request

JOBAPPLY = r"OPERATOR_HOME/job-apply"
MARKERS = ("autoapply_loop", "run_loop", "autoapp", "job-apply-autopilot")

def procs():
    # Match any cmdline containing one of the markers. Avoid -join/@() (it mishandles
    # scriptblocks); build an explicit -or chain instead.
    like = " -or ".join(f"$_.CommandLine -like '*{m}*'" for m in MARKERS)
    ps = (
        "Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | "
        f"Where-Object {{ {like} }} | ForEach-Object {{ "
        "$p=$_; $par=Get-CimInstance Win32_Process -Filter \"ProcessId=$($p.ParentProcessId)\" -ErrorAction SilentlyContinue; "
        "if($par){$pcmd=$par.CommandLine}else{$pcmd='?'}; "
        "Write-Host ($p.ProcessId.ToString()+'`'+$p.ParentProcessId.ToString()+'`'+$pcmd.Substring(0,[Math]::Min(70,$pcmd.Length))+'`'+$p.CommandLine) }"
    )
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                         capture_output=True, text=True, timeout=30).stdout.strip()
    rows = []
    for line in out.splitlines():
        if "`" not in line:
            continue
        pid, ppid, pcmd, cmd = line.split("`", 3)
        rows.append((int(pid), int(ppid), pcmd, cmd))
    return rows

def chrome_up(port):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{port}/json/version", timeout=6).read()
        return True
    except Exception:
        return False

def main():
    rows = procs()
    print("=== python autoapply procs ===")
    for pid, ppid, pcmd, cmd in rows:
        print(f"  pid={pid} parent={ppid}")
        print(f"    parent: {pcmd}")
        print(f"    child : {cmd[:90]}")
    live = rows
    print(f"\nlive loop-like procs: {len(live)} (want exactly 1)")

    lock = os.path.join(JOBAPPLY, "_loop.lock")
    owner = open(lock).read().strip() if os.path.exists(lock) else "(none)"
    print(f"_loop.lock owner: {owner}")
    if len(live) == 1:
        sole = str(live[0][0])
        print(f"lock matches sole loop: {owner == sole}")

    for port in (9222, 9223):
        print(f"Chrome {port}: {'UP' if chrome_up(port) else 'DOWN'}")

    ap = os.path.join(JOBAPPLY, "applied.json")
    try:
        d = json.load(open(ap))
        ids = d["applied"] if isinstance(d, dict) and isinstance(d.get("applied"), list) else d
        print(f"applied count: {len(ids)}")
    except Exception as e:
        print(f"applied.json: {e}")

    ok = (len(live) == 1) and chrome_up(9222) and chrome_up(9223)
    print("\nHEALTH:", "OK" if ok else "DEGRADED")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
