---
tags:
  - type/guide
  - project/nutrimind
  - status/active
  - domain/mobile
type: guide
project: nutrimind
status: active
aliases:
  - NutriMind Android Private Testing
---

# NutriMind Android private testing

The Android package is a **debug-signed, private testing APK**. It is not Play
Store ready, is not publicly distributed, and must not be treated as a
production release.

## Build the APK on this PC

The project needs Android SDK platform 35 and JDK 17. The local packaging script
uses `JAVA_HOME` when it is set; otherwise, it detects a portable JDK under
`%LOCALAPPDATA%\NutriMind\toolchains`. It uses `%LOCALAPPDATA%\Android\Sdk`
when `ANDROID_HOME` is not already set.

From the project root, run:

```powershell
.\packaging\android\package-private-apk.ps1
```

This builds `android\app\build\outputs\apk\debug\app-debug.apk` and copies
the result to an ignored artifact folder. This stays separate from the Sites
deployment `dist\` directory, which is recreated by each hosted-site build:

```text
artifacts\android\NutriMind-debug.apk
artifacts\android\NutriMind-debug.apk.sha256
```

The checksum file contains the SHA-256 hash of the APK. Use it to confirm that a
transferred APK is the same one that was built locally.

## Install it on an Android phone

1. Transfer `NutriMind-debug.apk` to the phone using a private method you trust,
   such as USB or a personal cloud drive.
2. Open the APK in the phone’s file manager. Android will show an
   **Install unknown apps** prompt for that file-manager app; allow it only for
   this private test, then install NutriMind.
3. Open **NutriMind**. It loads the private hosted service at
   `https://nutrimind.kruillin.chatgpt.site`; sign in through the normal NutriMind
   account flow.
4. Keep the app private. This debug build is not signed for Google Play and is
   intentionally not a public release artifact.

## Physical-device checklist

Complete this checklist on at least one phone before relying on the app.

- [ ] Open the app, sign in, close it fully, and reopen it. Confirm the hosted
      Clerk session remains usable.
- [ ] Open **Log** and choose **Barcode**. When Android asks, allow the
      **Camera** permission. Confirm a barcode can be scanned and that the
      returned food is editable before logging it.
- [ ] Choose **Label** and take a photo or choose an existing image. Confirm the
      nutrition values are editable and no meal is created until **Log meal** is
      selected.
- [ ] Choose **Meal photo**. Read the disclosure, cancel once, then repeat with
      a meal photo. Confirm the estimate shows uncertainty, all values remain
      editable, and nothing appears in Activity until you explicitly log it.
- [ ] Deny the Android camera permission once. Confirm Barcode is denied rather
      than silently accessing the camera, and use the image picker in Label or
      Meal photo mode as the fallback.
- [ ] On a second signed-in device (another phone or the hosted dashboard on a
      PC), refresh Activity after logging a meal. Confirm the same remote records
      appear there.

## Privacy and permission behavior

The native shell requests only `INTERNET` and `CAMERA`. It grants browser video
capture only to `https://nutrimind.kruillin.chatgpt.site`; it never grants audio
capture and does not request broad media or storage permissions.

Label and meal images are transient. A photo selected from the picker is not
copied into NutriMind storage. A system-camera capture uses a temporary
cache-directory file only long enough for the hosted page to read it, and that
file is cleared after a short upload grace period, on cancellation, and on the
next app start. The hosted app sends a meal photo to the AI provider only for an
estimate, then requires review and explicit logging; it does not attach the raw
image to Turso records, activity history, or application logs.

## Current limitation

This guide verifies the debug/private testing path only. Google Play signing,
store listing assets, public release review, and production distribution remain
out of scope until private testing is accepted.
