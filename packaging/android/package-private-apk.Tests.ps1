$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$packagingScript = Join-Path $PSScriptRoot 'package-private-apk.ps1'
$debugApk = Join-Path $repoRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$backupApk = "$debugApk.preflight-backup"

Describe 'package-private-apk preflight' {
    It 'keeps private APK artifacts outside the Sites dist directory' {
        $scriptContent = Get-Content -LiteralPath $packagingScript -Raw

        $scriptContent | Should Match 'artifacts\\android'
        $scriptContent | Should Not Match 'dist\\android'
    }

    It 'fails clearly when SkipBuild cannot find the debug APK' {
        Test-Path -LiteralPath $debugApk | Should Be $true
        Test-Path -LiteralPath $backupApk | Should Be $false

        Move-Item -LiteralPath $debugApk -Destination $backupApk

        try {
            $packagingError = $null
            try {
                & $packagingScript -SkipBuild
            }
            catch {
                $packagingError = $_
            }

            $packagingError | Should Not BeNullOrEmpty
            $packagingError.Exception.Message | Should Match 'app-debug\.apk'
        }
        finally {
            Move-Item -LiteralPath $backupApk -Destination $debugApk
        }
    }
}
