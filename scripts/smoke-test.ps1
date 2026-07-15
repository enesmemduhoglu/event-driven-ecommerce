# Smoke test: brings the full stack up with docker compose, waits until every
# service reports healthy, then runs the e2e order-flow scenarios.
# Works with Windows PowerShell 5.1 and pwsh (Linux/CI).
#
# Usage:
#   ./scripts/smoke-test.ps1                  # stack up + health + e2e
#   ./scripts/smoke-test.ps1 -Build           # rebuild images first
#   ./scripts/smoke-test.ps1 -Build -Down     # CI mode: tear down (incl. volumes) at the end
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Down,
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

# compose service name -> host port (matches docker-compose.yml)
$services = [ordered]@{
    'gateway-api'      = 5000
    'identity-api'     = 5001
    'catalog-api'      = 5002
    'search-api'       = 5003
    'basket-api'       = 5004
    'ordering-api'     = 5005
    'inventory-api'    = 5006
    'payment-api'      = 5007
    'notification-api' = 5008
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    & docker compose @ComposeArgs
    if ($LASTEXITCODE -ne 0) { throw "docker compose $($ComposeArgs -join ' ') exited with code $LASTEXITCODE" }
}

$failed = $false
Push-Location $repoRoot
try {
    $upArgs = @('--profile', 'app', 'up', '-d')
    if ($Build) { $upArgs += '--build' }
    Write-Host "== docker compose $($upArgs -join ' ')" -ForegroundColor Cyan
    Invoke-Compose $upArgs

    Write-Host "== Waiting for $($services.Count) services to report /health (timeout ${TimeoutSeconds}s)" -ForegroundColor Cyan
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $pending = [System.Collections.Generic.List[string]]::new()
    foreach ($name in $services.Keys) { $pending.Add($name) }
    while ($pending.Count -gt 0 -and (Get-Date) -lt $deadline) {
        foreach ($name in @($pending)) {
            try {
                $resp = Invoke-WebRequest "http://localhost:$($services[$name])/health" -UseBasicParsing -TimeoutSec 5
                if ($resp.StatusCode -eq 200) {
                    Write-Host "  OK: $name" -ForegroundColor Green
                    [void]$pending.Remove($name)
                }
            } catch { } # not ready yet, keep polling
        }
        if ($pending.Count -gt 0) { Start-Sleep -Seconds 3 }
    }
    if ($pending.Count -gt 0) {
        foreach ($name in $pending) {
            Write-Host "-- $name did not become healthy; last 50 log lines:" -ForegroundColor Red
            & docker compose logs --tail 50 $name
        }
        throw "Services not healthy within ${TimeoutSeconds}s: $($pending -join ', ')"
    }

    Write-Host "== Running e2e order flow" -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot 'e2e-order-flow.ps1')

    Write-Host "`nSMOKE TEST PASSED" -ForegroundColor Green
}
catch {
    $failed = $true
    Write-Host "`nSMOKE TEST FAILED: $_" -ForegroundColor Red
}
finally {
    if ($Down) {
        Write-Host "== docker compose --profile app down -v" -ForegroundColor Cyan
        & docker compose --profile app down -v
    }
    Pop-Location
}

if ($failed) { exit 1 }
exit 0
