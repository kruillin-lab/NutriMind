---
tags:
  - type/battle-plan
  - project/nutrimind
  - status/active
  - workflow/wargame
type: battle-plan
project: nutrimind
status: active
aliases: []
---

# NutriMind Finance UX Redesign Battle Plan

**Done condition:** landing, auth/onboarding, dashboard, meals, and settings share one accessible finance system; dashboard presents account state then the next action, mobile puts Quick Log before secondary analysis, query-backed view/date state survives reload, and all existing behavior passes lint, 41+ unit tests, and production build.

## 0. Theatre Map

- Root: `/home/kruillin/Projects/Projects/NutriMind/my-app`; branch `claude/claude-design-2.0`.
- Preserve all existing dirty logic. Never reset/stash/whole-file-format.
- Baseline this session: lint PASS; 41 tests PASS; build PASS; known six type-only errors confined to `app/api/meals/[id]/route.test.ts`.
- Design contract: ink/cream security paper, decorative brass, high-contrast brass ink for text, reserve/deposit/withdrawal/ledger language always paired with nutrition meaning, tabular figures, hairline rules, sharp statement surfaces, visible focus.

## 1. Moves

### MOVE 1 - Lock Shared Tokens And Shell

**Proof:** inspect current `globals.css`, `layout.tsx`, `MobileNav.tsx`, UI primitives.

**Action:** main session defines finance semantic utilities/tokens, contrast-safe accent text, responsive container/header/nav, active navigation, 40px primary controls, focus states, and page-section primitives. Preserve component-library primitives.

- **Expected:** every lane can compose with the same classes; no component invents a new palette.
- **Failure:** global token change makes dark mode or charts unreadable. **Cause:** decorative and text brass share one token. **Counter:** split `--brass` from `--brass-ink`, verify both themes.
- **TRIGGER:** a token change breaks existing component contrast -> revert that token only and add semantic token.

### MOVE 2 - Parallel Disjoint Surface Lanes

**Lane A, dashboard:** `app/dashboard/**` only. Build Reserve Account overview, KPI strip, mobile task-first order, URL-aware four-view tabs, finance section naming, responsive ledger/statement, preserve handlers/data props.

**Lane B, meals/activity:** `app/meals/**` only. Build Activity Ledger with durable `?date=`, summary strip, responsive transaction rows, accessible actions/dialog state, preserve API calls.

**Lane C, account journey:** `app/settings/**`, `app/onboarding/**`, `app/(auth)/**` only. Build Account Controls with local section feedback/danger zone and finance-themed onboarding/auth, preserving payloads.

- **Expected:** no overlapping writes; each lane runs targeted lint and reports logic preserved.
- **Failure:** lane needs shared token/shell changes. **Cause:** design contract incomplete. **Counter:** lane reports request; main owns the shared edit.
- **TRIGGER:** a lane changes API/schema/business logic -> reject that part and restore behavior.

### MOVE 3 - Main Landing And Navigation Integration

**Action:** main session redesigns `app/page.tsx`, `app/layout.tsx`, `components/MobileNav.tsx`, `app/globals.css`, and shared primitives as needed. Landing explains the Reserve Account with plain nutrition copy, a sample account statement, and three-step flow. Navigation names are consistent across desktop/mobile and expose active state.

- **Expected:** first-time users understand the calorie reserve in one screen; logged-in navigation matches page titles.
- **Failure:** metaphor reads like a real financial product. **Cause:** copy omits “calories/nutrition”. **Counter:** dual-label every core finance term.

### MOVE 4 - Integrate And Attack The Result

**Action:** inspect every lane diff, resolve shared class/copy inconsistencies, verify responsive DOM/CSS order, selected/expanded/error semantics, and no raw palette drift.

- **Expected:** one visual system, not four agent styles.
- **Failure:** component looks correct alone but breaks page rhythm. **Cause:** local padding/type scale. **Counter:** normalize to shared section/surface utilities.
- **TRIGGER:** integration requires logic rewrite -> keep old behavior and adapt presentation.

### MOVE 5 - Verify

- V1 `npm run lint` -> PASS, zero errors.
- V2 `npm test` -> PASS, at least 5 files/41 tests.
- V3 `npm run build` -> PASS, route table printed.
- V4 `npx tsc --noEmit --incremental false` -> no new errors outside the six known route-test errors.
- V5 `git diff --check` -> no whitespace errors.
- V6 formal quality gate -> PASS/PASS_WITH_WARNINGS, or exact Windows-stale config failure recorded alongside passing direct checks.
- V7 static accessibility sweep -> every icon-only button has name; toggle/disclosure state exposed; active nav has `aria-current`; no light-theme small text uses decorative brass.
- V8 manual desktop/mobile screenshots of landing, dashboard Today/Manual Log, Meals, Settings -> coherent finance system, no horizontal overflow, Quick Log before secondary analysis at 390px.

## 2. Forks

- Overlapping file writes -> stop the later lane; main integrates.
- API/schema change -> reject and restore behavior.
- Finance metaphor obscures nutrition -> dual-label copy.
- Shared token harms a surface -> semantic token, not one-off raw color.
- Two regressions from route query state -> keep visual redesign, defer query-state change.

## 3. Aborts

- **ABORT-FOREIGN:** new external edits land in an owned lane mid-run.
- **ABORT-BEHAVIOR:** redesign requires changing nutrition/bank rules.
- **ABORT-SCOPE:** new dependency, schema migration, timezone/expiration work.
- **ABORT-ENV:** build/test toolchain fails for a new reason; capture exact evidence.

## 4. Manual Verify

- 1440px: landing, dashboard four views, meals with populated/empty days, settings.
- 390px: nav, Quick Log order and forms, meal action targets, settings danger zone.
- Keyboard: nav, tabs, logging mode/type, dialogs, disclosures, save/reset actions.
- Screen reader spot-check: page landmarks/headings, current page, account metrics, live errors/success.

## 5. Report Skeleton

1. Design system and IA outcome.
2. Surface-by-surface changes.
3. Behavior preserved and architecture changes.
4. Verification V1-V8.
5. Manual checks owed.
6. Residual risks: timezone, expiration lots, cache privacy, route migration.
