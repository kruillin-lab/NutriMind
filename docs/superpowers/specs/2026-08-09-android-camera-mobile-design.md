---
tags:
  - type/design
  - project/nutrimind
  - status/approved
  - domain/mobile
type: design
project: nutrimind
status: approved
aliases:
  - NutriMind Android Camera and Mobile Design
---

# NutriMind Android, Camera, and Mobile Design

## Decision

NutriMind will remain a hosted Next.js service and gain a private, sideloadable
Android application that has its own launcher icon and application window. The
Android app will render only the trusted NutriMind service, with native handling
for camera and image-selection requests. The mobile web UI will use the current
ink, security-paper, brass, green, and red design system; the supplied mobile
artifact informs layout and hierarchy, not a second visual identity.

The app will support barcode scanning, nutrition-label photos, and a new
AI-assisted meal-photo estimate flow. A meal photo is transient input: it is
processed to produce an editable nutrition estimate and is then discarded. It
is never stored in Turso, attached to meal history, or deliberately recorded in
application logs.

## Goals and Acceptance Criteria

- Install a private debug-signed APK on an Android device without publishing it
  to Google Play.
- Preserve the live hosted NutriMind service as the data and authentication
  source. The APK contains no Turso, Clerk secret, or OpenAI credential.
- Let users request the camera only from a deliberate scan or photo action.
- Make the existing barcode scanner and label-photo parser usable from an
  Android WebView.
- Let users photograph or choose a meal image, receive an editable estimate,
  and explicitly approve it before a meal is recorded.
- Prevent raw meal-photo persistence and avoid logging image request bodies,
  EXIF data, or raw model responses.
- Work without horizontal overflow at 360x800, 390x844, and 412x915 viewports,
  while retaining the full desktop experience.

## Scope

### Included

- A native Android WebView shell with a NutriMind icon, launcher entry, trusted
  navigation allowlist, and private debug APK output.
- Runtime Android `CAMERA` permission, trusted-origin WebView camera grants,
  and image file-picker/capture support.
- Responsive dashboard layout and a safe-area-aware mobile bottom navigation:
  Overview, Log, Activity, and Account. Existing Today, Trends, Planning, and
  Body sections remain actual dashboard views rather than design-only routes.
- Existing barcode and nutrition-label capture flows, refined for touch,
  permission denial, and confirmation before logging.
- A protected `/api/parse-meal-photo` endpoint plus an in-app photo review and
  confirmation flow.
- Focused automated coverage and documented physical-device checks.

### Excluded

- Google Play submission, public distribution, subscriptions, or analytics.
- A native Kotlin reimplementation of the NutriMind interface.
- Persistent meal imagery, a photo gallery, background uploads, or sharing
  images with other users.
- Automatic meal logging without the user reviewing the estimated food and
  nutrition values.

## Architecture

### Hosted application

The existing Next.js application remains authoritative for Clerk identity,
Turso-backed data, API authentication, rate limits, AI calls, and the canonical
`recordMeal()` mutation. The Android shell only loads the configured NutriMind
HTTPS origin. It never receives database URLs, authentication secrets, or the
OpenAI key.

The WebView permits normal JavaScript, cookies, and DOM storage needed by the
hosted app. It blocks mixed content, universal file URL access, and broad local
file access. Navigation is allowlisted to the NutriMind origin and only the
specific Clerk/authentication origins required by the configured Clerk client.
External or untrusted navigation opens outside the WebView. No JavaScript bridge
is exposed unless a later requirement cannot be fulfilled with standard WebView
APIs.

### Android capture bridge

The shell declares and requests `android.permission.CAMERA` only after the user
starts a capture action. Its `WebChromeClient` grants `VIDEO_CAPTURE` only when:

1. Android camera permission is currently granted;
2. the requesting page origin exactly matches the configured NutriMind HTTPS
   origin; and
3. the requested resource is camera video, not microphone or arbitrary media.

The shell also implements `onShowFileChooser` so `input[type=file]` with
`accept="image/*"` can offer camera capture or the Android image picker. Image
selection does not request microphone access. If camera access is denied, the
web UI presents a clear retry path plus a photo-library/manual-entry fallback.

### Mobile navigation and presentation

The responsive web interface adopts the artifact's glanceable, task-first
mobile hierarchy while keeping the established Reserve product language and
palette. A fixed bottom bar has at least 44x44 CSS-pixel targets and includes
safe-area padding. It maps to real product destinations:

| Mobile item | Destination |
| --- | --- |
| Overview | Dashboard Today view |
| Log | Existing quick-log/capture entry point |
| Activity | Activity Ledger (`/meals`) |
| Account | Account Controls (`/settings`) |

The dashboard continues to expose Today, Trends, Planning, and Body through
the existing URL-backed `?view=` state. Cards, tabs, sheet/dialog controls, and
inputs use existing shadcn primitives where available.

## Capture Flows

### Barcode

The current ZXing live video scanner decodes a product barcode and calls the
existing authenticated product lookup route. The result appears in an editable
confirmation form before the canonical meal mutation. Successful writes use
`source: "barcode"`. Unknown products, unsupported barcodes, camera denial,
and lookup failures all offer manual food entry without losing the current
meal-log context.

### Nutrition label

The user scans or selects a nutrition-label image. The client removes metadata
by redrawing the image to a compressed canvas, enforces a client image-size
limit, and sends it to the existing authenticated label parser. The server
validates the data URL and size before sending the image to the existing
server-side OpenAI integration. Parsed values are shown in the same editable
confirmation form; no image is persisted after the response completes.

### Meal photo estimation

The quick-log capture surface adds a distinct **Meal photo** mode. It lets the
user take a picture or choose one from the device, then shows a disclosure that
the image is being sent to NutriMind's AI provider solely for estimation.

The client removes metadata with canvas rendering, constrains the longest edge
to 1600 pixels, encodes JPEG at an appropriate quality, and rejects images over
6 MB after encoding. It posts the data URL to authenticated
`/api/parse-meal-photo`. The server applies a per-user rate limit of ten
requests per hour, validates the image format and size, and calls the existing
server-only OpenAI client. The model response must satisfy a strict validated
schema containing one or more estimated foods, totals for calories/protein/
carbs/fat, confidence from 0 to 1, and a short uncertainty note.

The UI displays the estimate as editable fields and identifies low-confidence
or uncertain portion assumptions. The user must press **Log meal** before the
route calls the existing canonical meal-write path. That write uses
`source: "photo"` and the validated `aiConfidence`. The image data, unvalidated
model response, and temporary browser preview are cleared after success,
cancellation, or failure.

## Privacy, Security, and Reliability

- Images are transient request data. Neither client nor server stores them in a
  database, file bucket, cache, analytics event, or application log.
- The client redraws images before upload to remove EXIF, including potential
  geolocation metadata. The server does not reconstruct, persist, or return the
  original image.
- Request-body logging is prohibited for all label and meal-photo routes. Error
  logs contain an opaque request identifier and safe failure category only.
- OpenAI credentials stay server-side and follow the existing
  `NUTRIMIND_OPENAI_API_KEY`-then-`OPENAI_API_KEY` environment lookup.
- Barcode data from Open Food Facts is untrusted. The application validates
  missing or implausible servings/nutrients and always allows edits.
- AI results are estimates, especially for portions. They are never treated as
  medical advice and never bypass user confirmation.
- The Android host grants media permissions to the exact trusted NutriMind
  origin only; it grants neither microphone access nor broad file access.

## Error Handling

| Situation | User outcome |
| --- | --- |
| Camera denied | Explain why it is needed, provide Retry and photo-library/manual alternatives. |
| Barcode not recognized | Preserve the current log state and offer manual entry. |
| Blurry/invalid image | Explain that a clearer image is needed; do not retain the rejected image. |
| AI rate limit or provider error | Show a retry time or retry action and preserve only editable text fields, never the raw image. |
| Low-confidence estimate | Highlight uncertainty and require a review before logging. |
| WebView navigation/auth failure | Keep the app on trusted content or open the approved authentication flow externally; never display an untrusted page inside the camera-capable WebView. |

## Verification

1. Unit/API tests cover image validation, schema rejection, rate limiting,
   transient-data behavior, and propagation of `source`/`aiConfidence` to
   `recordMeal()`.
2. Component/E2E tests cover the review-before-log contract and capture denial
   fallback. Playwright adds mobile viewport coverage for 360x800, 390x844,
   and 412x915 with no horizontal overflow.
3. Build verification compiles the hosted app and the Android debug APK.
4. Manual Android verification covers first launch, Clerk sign-in/session
   persistence, barcode video permission, label photo picker/camera, meal-photo
   review/cancel/log, permission denial, and remote-data sync from a second
   device.
5. The project quality gate runs before handoff. Any pre-existing warning is
   reported separately from this feature's verification result.
