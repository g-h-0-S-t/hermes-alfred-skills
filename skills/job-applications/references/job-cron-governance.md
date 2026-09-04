# Job-application cron governance (STOP / START that actually sticks)

The job hunt runs on 6 crons + one long-lived `autoapply_loop.py` process that the
JobApply-loop watchdog relaunches whenever it dies.

## The 6 job crons (IDs stable as of XXXXXXX-23)
| job_id | name | schedule |
|---|---|---|
| 5568f9f701e4 | linkedin_ea_watchdog_b | every 30m |
| 28c77a4e8300 | LinkedIn 30min EA sweep | */15 * * * * |
| CRONID_XXXXXXXXXXXX | LinkedIn EA autonomous retry | */30 * * * * |
| 74398554613d | External ATS job discovery + apply | 0 9 * * * |
| CRONID_XXXXXXXXXXXX | JobApply loop + Chrome watchdog | */30 * * * * |
| d47260693088 | Submission notifier (operator format) | */2 * * * * |

(The other 4 crons — Comms Brief, System Watch, News Digest, Gateway self-heal —
are NOT job-related; pause them only if asked to stop ALL.)

## THE WALL: a desktop `cronjob pause` is overridden by WhatsApp
user's `whatsapp` channel (`33406473744457@lid`, "XXXXXXXXXXX") is the PRIMARY
comms channel and is ALWAYS connected — `gateway_state.json` →
`platforms.whatsapp.state: "connected"`. When operator sends a WhatsApp message like
"make sure it actually applies", "diagnose the cron", or "keep applying", the
gateway spawns an agent turn that holds the `cronjob` tool and faithfully
RE-ENABLES the job crons. So a desktop pause only sticks until the next such
WhatsApp message.

Verified XXXXXXX-23: paused the 3 active crons from desktop; next turn they were
`enabled=True` with `next_run_at` rolled forward. Root cause traced to
`gateway.log` inbound at 00:10 — `msg='Please make sure it actually applies to the
jobs relevant to my profile...'` — which spawned an agent turn that resumed them.

## Robust STOP (so the pause holds)
1. Pause all 6 job crons: `cronjob action=pause` for each `job_id` above
   (list first with `cronjob action=list`).
2. Kill the LIVE loop so the watchdog can't relaunch it:
   `wmic process where "name='python.exe'" get ProcessId,CommandLine | grep autoapply`
   → `taskkill /PID <pid> /F /T`. Pausing the watchdog (`CRONID_XXXXXXXXXXXX`) alone is NOT
   enough — a running loop survives until it next crashes.
3. **Make the stop sovereign across channels:** add a memory note
   "Job-application crons + autoapply_loop are SUSPENDED until operator explicitly says
   resume/start", AND/OR tell operator to send the stop on WhatsApp too. Any future
   agent turn (desktop OR WhatsApp) must read that note and NOT re-enable the crons.
   Without this, a WhatsApp "apply" message silently revives them.
4. Verify it held: re-`list` (all `enabled=False`) + `wmic ... grep autoapply`
   returns nothing. Re-list after a few minutes if you suspect a flip-back.

## Robust START (resume)
Resume the 6 crons (`cronjob action=resume`), confirm `autoapply_loop.py` is alive
(the `CRONID_XXXXXXXXXXXX` watchdog does this every 30m), and clear the suspension memory
note.

## Evidence / debug trail (where to look)
- Cron state file: `XXXXXXX/AppData/Local/hermes/cron/jobs.json`
  → per-job `enabled`, `state`, `paused_at`, `updated_at`.
- WhatsApp re-enable source: `XXXXXXX/AppData/Local/hermes/logs/gateway.log`
  → `inbound message: platform=whatsapp user=XXXXXXXXXXX ... msg='...'`.
  Timestamps here correlate with `jobs.json` `updated_at` flips.
- Channel connection state: `XXXXXXX/AppData/Local/hermes/gateway_state.json`.
- NEVER kill the WhatsApp bridge PID (user's primary channel) — see LinkedIn
  operating rules in the parent SKILL.md.
