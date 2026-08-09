<#
  Registers a per-user scheduled task that starts NutriMind at logon.
  Runs as the current user, no admin rights, no visible window.

  Install:   powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
  Uninstall: powershell -ExecutionPolicy Bypass -File scripts\install-autostart.ps1 -Uninstall
#>

param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'
$TaskName = 'NutriMind'
$AppDir = Split-Path -Parent $PSScriptRoot
$StartScript = Join-Path $AppDir 'scripts\start-nutrimind.ps1'

if ($Uninstall) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Yellow
    } else {
        Write-Host "No scheduled task named '$TaskName'." -ForegroundColor Yellow
    }
    exit 0
}

if (-not (Test-Path $StartScript)) { throw "Missing start script: $StartScript" }

$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`"" `
    -WorkingDirectory $AppDir

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

# Interactive token: the task needs the user's PATH to find node/npm.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force `
    -Description 'Starts the NutriMind local server at logon (http://localhost:3000).' | Out-Null

Write-Host "Installed scheduled task '$TaskName' (runs at logon)." -ForegroundColor Green
Write-Host "Starting it now..." -ForegroundColor Cyan
Start-ScheduledTask -TaskName $TaskName

for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/health' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            Write-Host "NutriMind is up at http://localhost:3000" -ForegroundColor Green
            exit 0
        }
    } catch { }
}

Write-Warning "Server did not answer within 60s. Check $env:LOCALAPPDATA\NutriMind\server.log"
