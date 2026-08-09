<#
  Starts the NutriMind production server on port 3000.
  Invoked by the "NutriMind" scheduled task at logon, and safe to run by hand.
  No-ops if something is already listening on 3000.
#>

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Port = 3000
$LogDir = Join-Path $env:LOCALAPPDATA 'NutriMind'
$LogFile = Join-Path $LogDir 'server.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Already running? Nothing to do. (TcpClient probe works on Windows PowerShell 5.1.)
$inUse = $false
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect('127.0.0.1', $Port)
    $inUse = $true
    $client.Close()
} catch { }

if ($inUse) {
    "[$(Get-Date -Format s)] port $Port already serving; not starting" | Add-Content -Path $LogFile
    exit 0
}

Set-Location $AppDir

# Production build must exist; `next start` refuses to run without .next/BUILD_ID.
if (-not (Test-Path (Join-Path $AppDir '.next\BUILD_ID'))) {
    "[$(Get-Date -Format s)] no production build found, running npm run build" | Add-Content -Path $LogFile
    & npm run build *>> $LogFile
}

"[$(Get-Date -Format s)] starting next start on port $Port" | Add-Content -Path $LogFile

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($npmCmd) { $npm = $npmCmd.Source } else { $npm = (Get-Command npm).Source }

Start-Process -FilePath $npm `
    -ArgumentList 'run', 'start', '--', '--port', "$Port" `
    -WorkingDirectory $AppDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $LogDir 'stdout.log') `
    -RedirectStandardError  (Join-Path $LogDir 'stderr.log')
