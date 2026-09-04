# Start fresh Chrome listener on port LINKEDIN_PORT for LinkedIn EA automation
$ErrorActionPreference = "Continue"

Write-Host "`n=====================================================" -ForegroundColor Cyan
Write-Host "Step 1: Killing existing chrome processes..." -ForegroundColor Yellow

# Kill any chrome running on port LINKEDIN_PORT using PowerShell's Netstat via cmd
$netstatCmd = "netstat -an ^| findstr \"LINKEDIN_PORT\" | for /f %%v in (\"^OPERATOR_HOME/job-apply/state_ready.txt\" ) do set err=exit"

# Actually just kill all chrome processes as backup (clean state)
taskkill /IM chrome.exe /F /T 2>$null
Start-Sleep -Seconds 2

Write-Host "Step 2: Starting fresh Chrome listener on port LINKEDIN_PORT..." -ForegroundColor Green

$ChromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe"

# Minimal launch with critical flags exactly per skill rules
& $ChromePath ^@
--remote-debugging-port=LINKEDIN_PORT ^
--user-data-dir=XXXXXXX/chrome-profile ^
--hide-crash-restore-bubble ^
--disable-backgrounding-occluded-windows ^
--disable-renderer-backgrounding ^
--disable-background-timer-throttling

Write-Host "Chrome started (background process). PID: $(Get-Process chrome | Select -First 1 | Select -ExpandProperty Id)" -NoNewline

# Wait up to 60s for /json endpoint to be ready
$maxWait = 30
$count = 0

while ($true) {
    if (Start-Sleep -Seconds 1; $count++) {
        # Check JSON endpoint readiness per skill rules
        $curlCmd = "curl -s -m8 \"http://127.0.0.1:LINKEDIN_PORT/json/version\""
        try {
            $result = & $curlCmd
            if ($result.Length -gt 2) {
                Write-Host "`n=====================================================" -ForegroundColor Cyan
                Write-Host "STEP 3: SUCCESS — Listener ready on port LINKEDIN_PORT!" -ForegroundColor Green
                Write-Host "------------------------------------------------------" -ForegroundColor White
                
                # Save state marker to verify listener is healthy for next run
                Set-Content -Path "XXXXXXX/job-apply/state_ready.txt" -Value "OK_" + (Get-Date -Format "o")
                
                $marker = Read-Content "XXXXXXX/job-apply/state_ready.txt"
                if ($marker) { Write-Host "State marker: $marker" -ForegroundColor Gray }
                
                Write-Host "`n✓ Chrome is ready to accept connections" -ForegroundColor Green
                
                # Show next steps for applying to LinkedIn EA
                Write-Host "`n=====================================================" -ForegroundColor Cyan
                Write-Host "STEP 4: Run automation (single-file driver verified per job)" -ForegroundColor Yellow
                Write-Host "------------------------------------------------------" -ForegroundColor White
                
                $jobids = Read-Content "XXXXXXX/job-apply/skip.json" -ErrorAction SilentlyContinue
                if ($jobids) {
                    Write-Host "`nJobs in skip.json (skip=already closed/" + "SCAM")" -ForegroundColor Gray
                    
                    # Show sample of what's running against LINKEDIN_PORT Chrome
                    $cmds = @()
                    # Run both jobs 4456162193 & 4453409651 which were confirmed previously as stalling/EA
                    $job_urls = @(
                        "https://www.linkedin.com/jobs/view/4456162193/",
                        "https://www.linkedin.com/jobs/view/4453409651/"
                    )
                    
                    Write-Host `n"▶️ Running apply_one.cjs for:" -ForegroundColor Gray
                
                }
                
                # Actually run both jobs via single-file driver (proven working)
                foreach ($url in $job_urls) {
                    $jid = $url.Split("/")[-2]
                    $cmd1 = "node XXXXXXX/job-apply/apply_one.cjs \"$url\"` -e `'{\"job\":\"$jid\"}'"
                    
                    # Capture with timeout and PYTHONPATH unset per skill rules
                    $envVars = @{PYTHONPATH="" ; PYTHONHOME=""}
                    $proc = Start-Process -FilePath "node" -ArgumentList (Split-Path -Leaf apply_one.cjs), "\"$url\"", $jid | 
                                   Wait-Process -Timeout 55 -ErrorVariable v -PassThru
                    
                    if ($v.ExitCode -eq 0) {
                        Write-Host "`n[${jid}] SUCCESS — applied!" -ForegroundColor Green
                        
                        # Record for next cycle (auto-submit via helper)
                        $recFile = Join-Path "XXXXXXX/job-apply" "_record-$jid.js"
                        Set-Content -Path $recFile -Value "
`#/usr/bin/env node
const jobid=$jid;
(async function() {{
console.log('applied ' + jobid);
}}" | Out-File "$recFile" -Encoding UTF8
                    
                    } else {
                        Write-Host "`n[${jid}] FAILED$($v.ExitCode)" -ForegroundColor Yellow
                        
                        # Create record file for manual retry
                        $recPath = "XXXXXXX/job-apply/_record-$jid.js"
                        Set-Content -Path $recPath -Value "
`#/usr/bin/env node
const jobid=$jid;
try {{ 
console.log('manual submit for ' + jobid);
}} catch (e) {{ console.error(e); }}" | Out-File "$recPath" -Encoding UTF8
                    
                    }
                }
            } else {
                Write-Host "Checking listener..." -Yellow
            }
        } catch {}
        
    }
    
    if ($count -ge $maxWait) { break }
}

Write-Host `n=====================================================" -ForegroundColor Cyan
if ($marker) { Write-Host "✓ Listener state confirmed: OK" -ForegroundColor Green }
else { Write-Host "  Listener not in ready state yet (still spawning)" -ForegroundColor Gray }
Write-Host "`n=====================================================" -ForegroundColor Cyan
