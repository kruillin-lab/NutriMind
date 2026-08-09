[CmdletBinding()]
param(
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$androidRoot = Join-Path $repoRoot 'android'
$gradleWrapper = Join-Path $androidRoot 'gradlew.bat'
$debugApk = Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk'
$artifactDirectory = Join-Path $repoRoot 'artifacts\android'
$packagedApk = Join-Path $artifactDirectory 'NutriMind-debug.apk'
$checksumFile = "$packagedApk.sha256"

if (-not (Test-Path -LiteralPath $gradleWrapper -PathType Leaf)) {
    throw "Android Gradle wrapper was not found at $gradleWrapper."
}

if (-not $env:JAVA_HOME) {
    $portableJdkRoot = Join-Path $env:LOCALAPPDATA 'NutriMind\toolchains'
    $portableJdk = Get-ChildItem -Path $portableJdkRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'bin\java.exe') -PathType Leaf } |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if ($portableJdk) {
        $env:JAVA_HOME = $portableJdk.FullName
    }
}

if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe') -PathType Leaf)) {
    throw 'JAVA_HOME must point to a JDK 17 installation before packaging the Android APK.'
}

if (-not $env:ANDROID_HOME) {
    $defaultAndroidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
    if (Test-Path -LiteralPath $defaultAndroidSdk -PathType Container) {
        $env:ANDROID_HOME = $defaultAndroidSdk
    }
}

if (-not $env:ANDROID_HOME -or -not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platforms\android-35') -PathType Container)) {
    throw 'ANDROID_HOME must point to an Android SDK with platform android-35 installed before packaging the Android APK.'
}

$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

if (-not $SkipBuild) {
    Push-Location $androidRoot
    try {
        & $gradleWrapper assembleDebug --no-daemon
        if ($LASTEXITCODE -ne 0) {
            throw "Android debug build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath $debugApk -PathType Leaf)) {
    throw "Expected Android debug APK was not found at $debugApk. Run this script without -SkipBuild to create it."
}

New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
Copy-Item -LiteralPath $debugApk -Destination $packagedApk -Force

$hash = (Get-FileHash -LiteralPath $packagedApk -Algorithm SHA256).Hash
[System.IO.File]::WriteAllText(
    $checksumFile,
    "$hash *NutriMind-debug.apk$([Environment]::NewLine)",
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output "APK: $packagedApk"
Write-Output "SHA-256: $checksumFile"
