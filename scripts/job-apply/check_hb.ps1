$p = 'OPERATOR_HOME/job-apply/_loop.heartbeat'
if (Test-Path $p) {
    $hb = (Get-Item $p).LastWriteTime
    $now = Get-Date
    $diff = [math]::Round(($now - $hb).TotalSeconds)
    Write-Output "Heartbeat age: $diff"
} else {
    Write-Output "Heartbeat missing"
}