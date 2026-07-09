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

# NutriMind Meal-Path Architecture Battle Plan

> **This is a route, not a report.** Follow each move in order. Preserve every foreign worktree change. Do not improvise past a `TRIGGER` or `ABORT`.

**Done condition:** ordinary and planned meals call one server-side command that atomically creates the meal, updates every DailyLog nutrient total, and applies the same calorie-bank overage rule; Quick Log exposes accessible names, selected state, expanded state, and live errors without changing the Vault layout. `npm run lint`, `npm test`, and `npm run build` pass, and the scoped diff contains no unrelated rewrites.

**Load-bearing unknowns attacked first:** whether planned meals are intentionally exempt (A2) is settled by the documented Calorie Bank contract: every logged meal contributes to the day's consumed calories and overage. Timezone and ledger migration unknowns remain out of scope.

## 0. Theatre Map

**Current source facts:**

- Repo root: `/home/kruillin/Projects/Projects/NutriMind/my-app`
- Active branch: `claude/claude-design-2.0`
- Baseline HEAD: `7195b89` or descendant.
- Foreign state: 52 modified tracked files and 6 untracked files at recon time. Never reset, stash, reformat, or stage them wholesale.
- Relevant existing changes: current `QuickLogClient.tsx` is part of the uncommitted Vault reskin; edit it only with exact local patches.

> `RECON NEEDED [R0]` - **Confirm the source root before any edit.**
> Check: `git -C /home/kruillin/Projects/Projects/NutriMind/my-app rev-parse --show-toplevel`.
> - If the exact path prints, continue.
> - If absent, locate with `find /home/kruillin/Projects/Projects/NutriMind -maxdepth 2 -name package.json -print`; rebase paths only after confirming `AGENTS.md`.

### Toolchain Facts

- `npm run lint`: pre-edit PASS.
- `npm test`: pre-edit PASS, 4 files and 37 tests.
- `npm run build`: last documented baseline PASS; run after edits because it writes `.next`.
- `npx tsc --noEmit --incremental false`: pre-existing FAIL in `app/api/meals/[id]/route.test.ts`; do not claim a new regression if the same six errors remain.
- Formal `quality-gate.json` is Windows-stale; still run the gate for evidence, then run direct Linux commands as authoritative checks.

### Targets

| # | Change | File:line | Scenario | Severity |
|---|--------|-----------|----------|----------|
| F1 | Planned-meal logging bypasses full totals and bank | `app/api/meal-plans/log/route.ts:35-92` | Logging a planned meal can leave micronutrients and Calorie Bank inconsistent and can partially persist | HIGH |
| F2 | Ordinary meal transaction is route-owned, not reusable | `app/api/meals/route.ts:65-151` | Other entry surfaces copy or bypass invariants | HIGH |
| F3 | Quick Log state is not programmatically exposed | `app/dashboard/_components/QuickLogClient.tsx:350-415,526-597` | Keyboard/screen-reader users cannot reliably identify selection, control purpose, or errors | MEDIUM |

## 1. Move Sequence

### MOVE 1 - Capture The Dirty Baseline

```bash
git -C /home/kruillin/Projects/Projects/NutriMind/my-app status -sb
git -C /home/kruillin/Projects/Projects/NutriMind/my-app diff --stat
git -C /home/kruillin/Projects/Projects/NutriMind/my-app diff -- app/dashboard/_components/QuickLogClient.tsx
```

- **Expected observation:** branch `claude/claude-design-2.0`, the known broad reskin, and a current Quick Log diff that must be preserved.
- **Most likely failure:** the target files changed after recon. **Cause:** another active session owns overlapping work. **Counter:** re-read the live files and patch only stable anchors; do not overwrite whole files.
- **TRIGGER - new foreign edits appear in `app/api/meals/route.ts` or `app/api/meal-plans/log/route.ts`:** stop and route to **ABORT-FOREIGN**.

### MOVE 2 - Add The Deep Meal-Recording Command And Unit Proof

**Proof to capture first (read-only):**

```bash
sed -n '60,155p' /home/kruillin/Projects/Projects/NutriMind/my-app/app/api/meals/route.ts
sed -n '30,100p' /home/kruillin/Projects/Projects/NutriMind/my-app/app/api/meal-plans/log/route.ts
```

- **Expected observation:** ordinary logging owns the complete transaction; planned logging has separate incomplete writes.

**The fix:** add `src/lib/nutrition-day.ts` with a server-side `recordMeal` command. Route adapters provide validated input and a transaction client. The command must:

1. Find or create the DailyLog for the supplied `[start,end)` day window.
2. Create the Meal with all ten tracked nutrition fields and source metadata.
3. Atomically increment all DailyLog totals.
4. Derive previous/next consumed values from the updated row.
5. Call `applyCalorieBankOverageAdjustment` with the same source DailyLog.
6. Return meal, updated log, bank transaction, adjustment, and updated bank.

Add `src/lib/__tests__/nutrition-day.test.ts` proving:

- a new DailyLog receives every field;
- an existing DailyLog uses atomic increments for every field;
- the bank adjustment sees correct previous/next totals;
- source and meal type pass through.

- **Expected observation after edit:** focused Vitest passes and the module has no Clerk/Next imports.
- **Most likely failure:** transaction fake cannot satisfy the Prisma type. **Cause:** over-constraining the test double. **Counter:** define the public input with `Prisma.TransactionClient`, then cast one focused fake `as unknown as Prisma.TransactionClient`, matching existing calorie-bank tests.
- **TRIGGER - the helper requires request/auth objects:** route policy leaked into the domain seam; stop and remove those inputs before continuing.

### MOVE 3 - Route Ordinary Meal POST Through The Command

**Proof to capture first (read-only):** `git diff -- app/api/meals/route.ts` must be empty before the move.

Replace only the transaction body with `recordMeal(...)`; keep validation, authentication, user/bank lookup, response fields, status, and messages stable.

- **Expected observation:** the route shrinks; response expressions still reference equivalent result fields; focused tests and full Vitest pass.
- **Most likely failure:** response message or bank fallback changes. **Cause:** the domain result shape differs from the old local object. **Counter:** adapt the route at the call site; do not move HTTP copy into the domain module.
- **TRIGGER - the API response snapshot changes:** revert this move only and re-map the result; do not change clients.

### MOVE 4 - Make Planned Logging Atomic And Canonical

**Proof to capture first (read-only):** confirm `isLogged`, `loggedMealId`, ownership, and the non-transactional writes still exist in `app/api/meal-plans/log/route.ts`.

Inside one Prisma transaction:

1. Re-read the plan item with ownership context.
2. Claim it with `updateMany({ where: { id, isLogged: false }, data: { isLogged: true } })`; zero rows means already logged.
3. Load the user's Calorie Bank.
4. Call `recordMeal(...)` using all fields available on the plan item and source `meal_plan`.
5. Set `loggedMealId` on the claimed item.
6. Return the existing `{ success: true, meal }` contract.

Validate any explicit date with the existing strict date helper and preserve the current default-to-today local semantics for this slice.

- **Expected observation:** no writes occur outside `$transaction`; planned logging has no hand-written DailyLog increment list.
- **Most likely failure:** an exception after the claim appears to strand `isLogged=true`. **Cause:** transaction boundaries were split. **Counter:** ensure claim, record, and final update all use `tx`; rollback must restore the claim.
- **TRIGGER - Prisma/libSQL does not support the transaction callback used by existing routes:** route to **ABORT-ENV**, capture exact output, and do not fall back to partial writes.

### MOVE 5 - Harden Quick Log Semantics Without Restyling

**Proof to capture first (read-only):** read the live `QuickLogClient.tsx` anchors around AI/Manual, meal types, textarea/scanner, disclosures, dismiss, and error blocks.

Apply only semantic attributes/labels:

- AI/Manual container gets an accessible group name; each button gets `aria-pressed`.
- Meal-type container gets an accessible group name; each button gets `aria-pressed`.
- AI textarea gets an explicit accessible label.
- Scanner and parsed-result dismiss icon buttons get `aria-label`.
- Both disclosures get `aria-expanded` and `aria-controls`; controlled regions receive stable IDs.
- Parsing and submit errors get `role="alert"`; loading text gets `role="status"`/`aria-live` where appropriate.

Do not change colors, spacing, DOM order, refresh behavior, or the current visible button copy in this move.

- **Expected observation:** visual classes and layout are unchanged; static inspection shows complete state/name attributes.
- **Most likely failure:** invalid ARIA role/attribute pairing. **Cause:** treating the two-state buttons as tabs without tab panels. **Counter:** use ordinary buttons with `aria-pressed`, not `role=tab`.
- **TRIGGER - the patch changes more than semantic lines in the foreign Quick Log diff:** stop and reduce it before verification.

### MOVE 6 - Verify And Review The Scope

Run V1-V5 below. Then inspect:

```bash
git -C /home/kruillin/Projects/Projects/NutriMind/my-app diff --check
git -C /home/kruillin/Projects/Projects/NutriMind/my-app diff -- src/lib/nutrition-day.ts src/lib/__tests__/nutrition-day.test.ts app/api/meals/route.ts app/api/meal-plans/log/route.ts app/dashboard/_components/QuickLogClient.tsx
```

- **Expected observation:** only the intended new module/tests, two API adapters, and semantic Quick Log lines belong to this mission.
- **Most likely failure:** format churn in the pre-existing CRLF UI file. **Cause:** whole-file rewriting. **Counter:** restore only this mission's attempted patch from the captured pre-edit content, then reapply with a minimal patch.
- **TRIGGER - any unrelated user line is removed:** stop; restore that line from the baseline diff before continuing.

## 2. Fork Map

- `TRIGGER` target API route receives foreign edits -> **ABORT-FOREIGN**.
- `TRIGGER` domain helper accepts request/auth -> return to MOVE 2 and deepen the interface.
- `TRIGGER` API response changes -> repeat MOVE 3 with adapter-only mapping.
- `TRIGGER` transaction claim cannot roll back -> **ABORT-ENV**; never ship partial writes.
- `TRIGGER` Quick Log patch creates formatting churn -> reapply semantic-only patch.
- `TRIGGER` any verification exposes timezone or ledger migration dependency -> **ABORT-SCOPE** and reconvene that campaign separately.

## 3. Abort Conditions

- **ABORT-ENV:** Prisma generation, transaction runtime, Node, or build tooling prevents proof. Capture command, exit, and output tail; hand back the smallest restoring action. Do not weaken tests.
- **ABORT-SCOPE:** selected work requires schema migration, timezone conversion, expiration lots, more than the two API routes, or more than one UI file. Record the finding and stop that branch.
- **ABORT-SOURCE:** R0 cannot locate the nested repo. Report; do not edit a parent copy.
- **ABORT-FOREIGN:** overlapping live edits appear in either API target after MOVE 1. Stop and report exact files/status.
- **ABORT-CONTRACT:** planned meals are proven intentionally exempt from Calorie Bank rules. Keep atomic full totals, omit bank adjustment, and reconvene the decision record before declaring done.

## 4. Verification Runs

**V1 - Focused domain tests.** `npx vitest run src/lib/__tests__/nutrition-day.test.ts`
-> **PASS:** one test file, all tests pass, zero failures.

**V2 - Full unit suite.** `npm test`
-> **PASS:** at least 5 files and at least 41 tests pass, zero failures.

**V3 - Lint.** `npm run lint`
-> **PASS:** exit 0 with no ESLint errors.

**V4 - Production build.** `npm run build`
-> **PASS:** exit 0 and Next.js route table prints.

**V5 - Type regression check.** `npx tsc --noEmit --incremental false`
-> **PASS for this mission:** either exit 0, or only the same six pre-existing `app/api/meals/[id]/route.test.ts` errors remain; no error may reference a touched/new file.

**V6 - Formal project gate.** `python3 /home/kruillin/Projects/Projects/quality-gate/gate.py normal --repo /home/kruillin/Projects/Projects/NutriMind/my-app --task nutrimind-meal-path-architecture`
-> **PASS:** PASS/PASS_WITH_WARNINGS. If the Windows-stale config fails exactly on missing PowerShell, retain the evidence and rely on V1-V5; do not misreport it as an app failure.

## 5. MANUAL VERIFY

- **M1 (Quick Log):** open dashboard, switch AI/Manual with keyboard, choose meal type, open/close details, and force one parse error. **Expected:** focus remains visible, selected/expanded state is exposed, and error is announced; visual Vault layout is unchanged. **Rollback:** revert only semantic attributes from `QuickLogClient.tsx`.
- **M2 (planned meal):** log one planned meal that takes the day over target. **Expected:** one meal is created, all available nutrient totals increment, item becomes logged once, and the bank changes by the new overage. **Rollback:** do not delete data blindly; restore from a test DB backup or delete the test user's new records in one transaction.

## 6. Report Skeleton

1. Fixed findings with file:line and proof.
2. Unfixed evidence-backed findings, especially timezone and expiration.
3. V1-V6 actual results.
4. Manual checks still owed.
5. Foreign files preserved and mission-owned files changed.
6. Rollback notes.
7. Verified vs assumed.

## 7. Residual Risk Noted At Plan Time

- Meal edit/delete remain on duplicated route-local delta logic until a later strangler slice.
- User-timezone days and historical DailyLog representation remain unresolved.
- Credit-lot expiration and shared CachedFood privacy remain unresolved high-priority architecture work.
- The Linux quality-gate config and pre-existing route-test TypeScript errors remain separate infrastructure debt.
