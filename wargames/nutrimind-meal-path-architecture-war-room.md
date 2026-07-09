---
tags:
  - type/war-room
  - project/nutrimind
  - status/active
  - workflow/war-room
type: war-room
project: nutrimind
status: active
aliases: []
---

# War Room - NutriMind Meal-Path Architecture

**Status:** EXECUTED
**Date opened:** 2026-07-09
**Advisor:** Codex primary session, deep-route intent; this runtime did not expose model selection
**Executors:** three bounded read-only AER lanes (architecture, product/UX, quality)
**Battle plan:** [nutrimind-meal-path-architecture-battle-plan.md](nutrimind-meal-path-architecture-battle-plan.md)

## 1. Frame

- **Current state:** NutriMind has a distinctive, approved Vault visual system and a broad uncommitted reskin. Core meal invariants are duplicated, and planned-meal logging bypasses the normal atomic nutrition and calorie-bank path.
- **Desired end state:** the highest-frequency meal path is accessible and every newly logged meal uses one server-only domain command for meal creation, daily totals, and calorie-bank adjustment.
- **Five Ws:** Luis uses NutriMind; this decision concerns meal logging and its domain boundary; work is in `my-app`; the issue is present on branch `claude/claude-design-2.0`; it matters because the same conceptual meal currently produces different account state depending on entry surface.
- **In scope:** one domain module, ordinary meal POST, planned-meal POST, focused unit tests, and non-visual Quick Log semantics.
- **Out of scope:** visual redesign, route splitting, settings decomposition, timezone/data migration, ledger-lot schema changes, expiration repair, global quality-gate migration, and unrelated dirty files.
- **Constraints:** preserve the current API response shape where callers rely on it; preserve all foreign worktree changes; no schema migration; use existing Next.js route conventions and UI primitives; run the project gate and direct commands before completion.
- **Commander's intent:** after this slice, an ordinary or planned meal must atomically update the same complete DailyLog totals and calorie-bank rules, and Quick Log choices/errors must expose machine-readable interaction state without changing the approved look.

## 2. Recon

### Facts

| # | Fact | Evidence |
|---|------|----------|
| F1 | The Vault visual language is coherent and already distinctive; redesigning it again has low value. | `app/globals.css:53-91`; current `vault-*.jpeg` captures |
| F2 | The nested repo carries 52 modified tracked files and 6 untracked files from active design/product work. | `git status -sb`; `git diff --stat` |
| F3 | Ordinary meal POST creates the meal, updates all nutrient totals, and applies calorie-bank overage inside one transaction. | `app/api/meals/route.ts:65-151` |
| F4 | Planned-meal logging performs separate writes, updates only calories plus four macros/fiber, and never adjusts the calorie bank. | `app/api/meal-plans/log/route.ts:35-92` |
| F5 | Meal edit/delete repeat ten-field DailyLog and bank delta logic, proving a missing domain seam. | `app/api/meals/[id]/route.ts:69-124`, `:168-206` |
| F6 | Quick Log selection controls omit selected-state semantics; its textarea and icon controls have incomplete accessible names; errors are not live announcements. | `app/dashboard/_components/QuickLogClient.tsx:350-415`, `:526-597` |
| F7 | Lint and 37/37 Vitest tests pass before this slice. | AER quality lane: `npm run lint`; `npm test` |
| F8 | A standalone typecheck currently fails on six pre-existing test-double typing errors in `app/api/meals/[id]/route.test.ts`. | `npx tsc --noEmit --incremental false` output |
| F9 | User timezone is stored but daily boundaries are server-local; fixing it correctly needs reconciliation/migration. | `prisma/schema.prisma:33`; `lib/date-utils.ts:1-34`; `src/lib/api-helpers.ts:78-103` |
| F10 | Calorie expiration cannot represent partially consumed credit lots and can reconsider the same deposit. | `prisma/schema.prisma:120-151`; `app/api/cron/expire-calories/route.ts:41-100` |

### Assumptions

| # | Assumption | Settling check (read-only) | Routing |
|---|------------|----------------------------|---------|
| A1 | Meal logging is a primary daily task. | Product analytics or user observation. | If false, the correctness seam still justifies the domain change; defer mobile reordering. |
| A2 | Planned meals should obey the same calorie-bank rules as manual/AI meals. | Compare product copy and `CalorieBank` contract in `AGENTS.md`. | If product says plans are exempt, keep totals atomic but disable bank adjustment explicitly. |
| A3 | The current Vault reskin is the desired visual baseline. | Existing approval in AgentBrain log and current screenshots. | Preserve styling; make semantics-only UI changes. |

### RECON NEEDED

- [R1] Historical ledger consistency before a future expiration-lot migration - run reconciliation against a database backup; route mismatches to a separate war room.
- [R2] Existing DailyLog representation before timezone migration - inventory per-user stored timestamps and duplicates; do not infer a migration in this slice.

## 3. Criteria

Criteria were fixed before courses of action were scored.

**Screening:** feasible; suitable; acceptable; distinguishable; complete

| Criterion | Weight | Why it matters here |
|-----------|-------:|---------------------|
| User-state correctness | 30 | Nutrition totals and the calorie bank are the product's trust boundary. |
| Architectural leverage | 25 | The change should create a reusable seam, not another route-local patch. |
| Dirty-tree safety | 20 | The approved 52-file reskin must not be lost or broadly reformatted. |
| Verification strength | 15 | The slice needs deterministic unit proof plus normal project gates. |
| Design/accessibility gain | 10 | The current visual identity should become easier to operate, not be replaced. |

## 4. Courses Of Action

### COA-0 - Preserve Current State

- **Purpose:** make no code changes; record findings only.
- **Contract:** docs only; no runtime behavior change.
- **Work guidance:** retain existing battle plans and report follow-up campaigns.
- **Verification:** no new diff beyond war-room artifacts.

### COA-1 - Accessible Task-First UI Pass

- **Purpose:** preserve the Vault aesthetic while improving mobile order, semantics, target sizes, contrast, navigation state, and local feedback.
- **Contract:** 8-12 UI files; no API or schema change.
- **Work guidance:** start with Quick Log and mobile dashboard order, then meals/settings/navigation.
- **Verification:** desktop/mobile Playwright accessibility and screenshot checks.

### COA-2 - Meal-Path Domain Kernel With Scoped Accessibility

- **Purpose:** create one canonical meal-recording command and use it from ordinary and planned-meal routes; harden Quick Log semantics without visual churn.
- **Contract:** new `src/lib/nutrition-day.ts` and tests; `app/api/meals/route.ts`; `app/api/meal-plans/log/route.ts`; surgical edits to `QuickLogClient.tsx` only.
- **Work guidance:** extract behavior without changing response contracts, make planned logging one transaction, test the complete nutrient/bank call path, then add labels/selected/live states.
- **Verification:** focused unit tests, lint, full Vitest, production build, scoped diff review.

### COA-3 - User-Day And Ledger Kernel

- **Purpose:** make timezone-aware user days and credit-lot expiration authoritative.
- **Contract:** schema/data migration, reconciliation, cron and all DailyLog producers/consumers.
- **Work guidance:** inventory and back up live data, add new representations, dual-read/backfill, reconcile, cut over.
- **Verification:** migration fixtures across DST, historical reconciliation, repeated-expiration tests, production shadow run.

### COA-4 - URL-Addressable Feature Architecture

- **Purpose:** split dashboard/settings into route-owned features and deep links with smaller client boundaries.
- **Contract:** broad route/component reorganization over the active reskin.
- **Work guidance:** establish clean baseline, extract shared meal UI, add child routes, move data loading per route.
- **Verification:** routing, back/forward, bundle, E2E, and visual regression suites.

### Killed At Screening

| COA | Failed gate | Reason |
|-----|-------------|--------|
| COA-3 | Acceptable | Correct implementation requires a data migration and reconciliation that cannot be inferred safely from the dirty local tree. |
| COA-4 | Acceptable | It overlaps most of the uncommitted reskin and creates excessive regression risk before that work is committed. |

## 5. Wargame

### COA-0 Fought

| Move | Expected observation | Most-likely failure and cause | Counter-move |
|------|----------------------|-------------------------------|--------------|
| Document only | No app regression | Planned meals continue bypassing bank/nutrient invariants because no code seam changes | Reject COA-0 if correctness is weighted highest |

**Red-team verdict:** safe but fails the commander's intent.
**Second-order effects:** architectural drift and inconsistent account state remain.

### COA-1 Fought

| Move | Expected observation | Most-likely failure and cause | Counter-move |
|------|----------------------|-------------------------------|--------------|
| Improve Quick Log semantics | Screen readers expose choices and errors | Visual regression from broad control replacement | Keep markup/CSS and add ARIA first |
| Reorder mobile task hierarchy | Faster access to meal logging | Desktop grid changes due shared DOM order | Use responsive CSS order only |
| Expand to settings/navigation | More consistent UX | Scope balloons across dirty files | Stop after one verified daily-task slice |

**Red-team verdict:** valuable, but it leaves the highest-severity data inconsistency intact.
**Second-order effects:** broader UI touches make attribution in the dirty tree harder.

### COA-2 Fought

| Move | Expected observation | Most-likely failure and cause | Counter-move |
|------|----------------------|-------------------------------|--------------|
| Extract canonical record command | Ordinary route behavior stays byte-for-byte compatible | Helper becomes a shallow parameter bag because route policy leaks inward | Keep validation/auth in adapters; put transaction-owned invariants in the module |
| Route planned meals through it | All nutrients and bank update atomically | Double logging under concurrent requests because `isLogged` is checked outside the write claim | Claim with `updateMany(... isLogged:false)` inside the same transaction and rollback on failure |
| Add domain tests | Existing and planned inputs produce identical DailyLog/bank calls | Prisma mocks become brittle | Test the module through a small typed transaction fake and observable calls |
| Add Quick Log semantics | Visual output remains unchanged | ARIA roles are incomplete or mismatched | Prefer `aria-pressed` groups; add explicit labels and live regions without inventing tab panels |

**Red-team verdict:** survives if the module owns atomic state changes and the UI patch stays surgical.
**Second-order effects:** creates the seam for later edit/delete, template, and scanner migration without requiring it now.

### Decision Matrix

Scores are 1-5; weighted total is score x weight, maximum 500.

| Criterion (weight) | COA-0 | COA-1 | COA-2 | COA-3 | COA-4 |
|--------------------|------:|------:|------:|------:|------:|
| User-state correctness (30) | 1 | 1 | 5 | 5 | 2 |
| Architectural leverage (25) | 1 | 2 | 4 | 5 | 5 |
| Dirty-tree safety (20) | 5 | 3 | 4 | 2 | 1 |
| Verification strength (15) | 2 | 3 | 5 | 3 | 3 |
| Design/accessibility gain (10) | 1 | 5 | 3 | 1 | 4 |
| **Weighted total / 500** | **195** | **235** | **435** | **370** | **290** |

## 6. Decision Record

- **Selected:** COA-2 - it is the only survivor that fixes an evidence-backed account-state defect, creates a durable domain seam, improves the primary interaction, and avoids broad overlap with the active reskin.
- **Why COA-0 lost:** safety alone does not satisfy the requested improvement or the correctness intent.
- **Why COA-1 lost:** it improves usability but leaves planned-meal state corruption in place.
- **Why COA-3 lost:** it is strategically right but migration-heavy and unsafe without live-data reconciliation.
- **Why COA-4 lost:** it should follow only after the reskin is accepted and committed.
- **Residual risk accepted:** edit/delete still use duplicated logic; timezone and expiration remain separate high-priority campaigns; pre-existing route-test type errors remain unless directly encountered by the selected slice.
- **Orders:** execute [nutrimind-meal-path-architecture-battle-plan.md](nutrimind-meal-path-architecture-battle-plan.md).

## 7. Supervision And After-Action

- **Execution log:** added `src/lib/nutrition-day.ts`; ordinary and planned-meal routes now share atomic meal creation, complete nutrient increments, and Calorie Bank adjustment; planned items are claimed once inside the same transaction. Four domain tests passed, then the suite expanded to 44 passing tests after reviewer fixes.
- **Re-convene events:** the user expanded the UX scope, producing the sibling finance redesign war room; no load-bearing meal-domain fact was invalidated.
- **Reviewer verdict:** business invariants PASS. Reviewer found query-date, landmark, and stale-E2E issues in the integrated UX; all were fixed and reverified.
- **Quality gate:** direct Linux checks PASS (`npm run lint`, 44/44 Vitest, `npm run build`, `git diff --check`). Formal gate wrapper FAILS only because repo config invokes missing PowerShell and two pre-existing untracked plans lack frontmatter.
- **Written back:** `AGENTS.md`, `CLAUDE.md`, `NutriMind/icm/shared/decisions.md`, and `AgentBrain/state/log.md`.
