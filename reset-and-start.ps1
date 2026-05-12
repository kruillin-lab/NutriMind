# PowerShell script to reset Next.js cache and restart server
Write-Host "=== Stopping any running Node processes ==="
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

Write-Host "=== Clearing Next.js cache ==="
if (Test-Path .next) {
    Remove-Item -Path .next -Recurse -Force
    Write-Host "Cache cleared!"
} else {
    Write-Host "No cache directory found"
}

Write-Host "=== Starting dev server ==="
npm run dev
