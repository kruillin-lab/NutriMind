# NutriMind Product Stability Battle Plan (Fable)

WARGAMED 2026-07-05 against commit `256a615` (branch `claude/claude-design-2.0`).
Executor: mid-tier coding model. Repo: `/home/kruillin/Projects/Projects/NutriMind/my-app`.
Mission: fix the **top 3 evidence-backed product defects** (calorie bank corruption, onboarding blocks, day boundaries, meal/water logging, auth leaks, AI parsing). No style nits. No broad redesign. Do not overwrite user changes.

> NOTE: a sibling plan `nutrimind-product-battle-plan.md` was authored concurrently by another planner. Its recon moves are compatible with this one, but its expected top-3 differs. This plan's targets A and B were **verified in code by the planner** (not hypothesized): the exact corrupting statements are quoted below. If forced to choose one slate, take this one; if merging, this plan's A/B outrank the sibling's parse-meal cache-order and date-validation candidates on severity (state corruption beats degraded reads).

## Standing orders

- **The tree may differ from this plan's anchors by refactor.** A design-2.0 refactor ran after this plan was written: API routes may route through `src/lib/api-helpers.ts` (`requireUserId`, `requireUser`, `handleRoute`, `dayRange`) and UI files are restyled. All anchors below are **function names and logic shapes, not line numbers** — re-locate each anchor with `grep -rn "<anchor>" app src lib` before acting. Business logic was ordered preserved byte-identically, so every defect below survives the refactor unless a recon move says otherwise.
- Commit nothing until the final report; leave fixes in the working tree unless the user triggers the completion rule in `AGENTS.md` §2.5.
- Prisma import is always `@/src/lib/prisma`. Never touch `proxy.ts`, the parse-meal `readFileSync` workaround (except as Target D specifies), or `window.location.reload()` patterns.
- Every fix ships with a failing-then-passing test or a reproduction command in the report.

## Phase 0 — Recon verification (read-only, ~15 min)

| # | Move | Expected observation | If not observed |
|---|------|---------------------|-----------------|
| 0.1 | `git log --oneline -3` and `git status --short` | Branch `claude/claude-design-2.0` (or later), possibly a large uncommitted redesign diff | Any branch is fine; never `checkout`/`stash` the user's tree. If the build is broken by mid-flight redesign work, run `npm run build`, capture the error, and **abort defect work until green** — fixing atop a broken build poisons verification. |
| 0.2 | `grep -n "applyCalorieBankOverageAdjustment" -A 60 src/lib/calorieBank.ts` | Spend path computes `newBalance = bank.currentBalance - adjustment.amount` (absolute set from a pre-transaction snapshot); refund path is unconditional and writes `totalSpent: Math.max(0, bank.totalSpent - adjustment.amount)` (absolute set) | If already rewritten to re-read the bank inside the tx AND cap refunds at applied spend, Target A is fixed — promote Reserve R1. |
| 0.3 | Read `src/lib/__tests__/calorieBank.test.ts` | Existing vitest coverage of the overage math; note it does NOT cover blocked-spend→refund asymmetry or snapshot staleness | If missing, create tests there following `streakUtils.test.ts` style. |
| 0.4 | `grep -n "!calories\|clampInt\|clampNumber" "app/api/meals/[id]/route.ts"` | PUT validates only `if (!name || !calories || calories < 0)` and applies **no clamping**, while POST in `app/api/meals/route.ts` clamps everything | If PUT now clamps like POST, Target B is fixed — promote Reserve R1. |
| 0.5 | Read `app/api/parse-meal/route.ts` top-to-bottom | A `readFileSync('.env.local')`-based key load preferring `NUTRIMIND_OPENAI_API_KEY` | Note exactly how a *missing file* is handled (guarded fallback vs throw) — this decides Target D's route. |
| 0.6 | `RECON NEEDED` — deploy reality: does production run where `.env.local` exists? Check `vercel.json` (cron schedules imply Vercel) and libSQL/Turso config in `prisma.config.ts` | Vercel deployment intended → `.env.local` will NOT exist in prod | If there is no production target at all, demote Target D, promote Reserve R1. |
| 0.7 | `RECON NEEDED` — secrets: `ls -la .env.local` (do NOT print contents); Clerk keys + `NUTRIMIND_OPENAI_API_KEY` expected inside | File exists | If absent, dev-server/E2E verification is off the table; rely on vitest + build, and say so in the report. Never invent keys. |

## Order of battle — defect map (planner-verified at `256a615`)

- **[A] Calorie bank corruption — refund-without-spend + lost-update race.** Anchor: `applyCalorieBankOverageAdjustment` in `src/lib/calorieBank.ts`, called from meals POST and meals `[id]` PUT/DELETE. Severity: **HIGH**.
  - Vector 1 (mint balance from nothing): overspend with insufficient balance and `allowNegative=false` → the spend is *silently skipped* (`return { …, bankUpdate: null, bankTransaction: null }` — no debit recorded). Then edit the meal back down → the refund branch runs **unconditionally** → `currentBalance: { increment }` credits calories that were never debited. Repeatable.
  - Vector 2 (lost update): `bank` is snapshotted via `prisma.user.findUnique` *before* `$transaction` in both meal routes; the spend writes `currentBalance: newBalance` as an **absolute value** from that stale snapshot. Two concurrent logs → one debit overwritten while `totalSpent` double-increments.
  - Vector 3: refund's `totalSpent: Math.max(0, bank.totalSpent - amount)` is also an absolute set from the stale snapshot.
- **[B] Meal PUT accepts unclamped/NaN input → corrupts DailyLog and bank math.** Anchor: `calorieDifference = calories - existingMeal.calories` in `app/api/meals/[id]/route.ts`. Severity: **HIGH**. POST clamps (`clampInt`/`clampNumber`); PUT does not, so `calories: "banana"` → `calorieDifference = NaN` → `caloriesConsumed: NaN` persisted and NaN poisons every later `Math.max(0, …)` in bank math; `calories: 99999999` bypasses POST's 10000 cap; and `!calories` wrongly rejects legitimate 0-calorie edits.
- **[C] Day-boundary attribution ignores the user's timezone.** `lib/date-utils.ts` is all **server-local** midnight (`setHours`); `UserProfile.timezone` is collected at onboarding but **never read** for day math; the meals route even carries a "Use UTC dates" comment above local-date calls. On a UTC server (Vercel), a New York 8pm dinner lands on *tomorrow's* log and the banking cron closes days at 7pm local. Severity: **HIGH**, but the correct fix (attribute days in profile timezone) is cross-cutting = **broad redesign → report as unfixed evidence-backed finding**, do not fix unless Fork F3 triggers a narrow slice.
- **[D] AI meal parsing depends on a file that won't exist in prod.** `app/api/parse-meal/route.ts` reads `.env.local` via `readFileSync`. Severity: **MEDIUM-HIGH** pending recon 0.5/0.6.
- **[R1 reserve] Nightly banking credits full target for phantom days.** `bankPendingCompletedDays` banks `target - consumed` for any past log with `bankedAmount=0`; a day where the user only logged water banks the entire 2000-cal target. Also overspent days keep `bankedAmount=0` forever and are rescanned nightly. Severity: MEDIUM.
- **[R2 reserve] Initialize route non-atomic + email-collision 500.** `app/api/user/initialize/route.ts`: four sequential upserts with no wrapping transaction (partial state on mid-failure), and the Clerk-lookup fallback email `"unknown@example.com"` collides with `User.email @unique` for the second user it happens to → 500 → onboarding block. Also the onboarding weight entry is stored at `new Date()` full timestamp, unlike every other per-day record. Severity: MEDIUM.
- **[R3 reserve] Cron auth may be spoofable.** `app/api/cron/bank-calories/route.ts` accepts `x-vercel-cron: 1` as full auth. `RECON NEEDED`: confirm whether the platform strips inbound `x-vercel-*` headers from external requests (check Vercel docs); if not, banking runs can be triggered unauthenticated. Severity: LOW-MEDIUM (the `bankedAmount=0` claim guard keeps it near-idempotent).

**Engagement rule: fix A, B, D. Forks can swap D→R1→R2.**

## Target A — bank refund/race corruption

**Move A1 — reproduce with a failing test.** Extend `src/lib/__tests__/calorieBank.test.ts`. `applyCalorieBankOverageAdjustment` takes `tx` as a parameter — pass a mock tx (`{ calorieBank: { update: vi.fn(), findUnique: vi.fn() }, bankTransaction: { create: vi.fn(), findMany: vi.fn() } }`) and a bank fixture `{ currentBalance: 0, allowNegative: false, totalSpent: 0 }`.
- Test 1 (asymmetry): call with `previousConsumed: 2000, nextConsumed: 2500, calorieTarget: 2000` → assert NO update (blocked spend — passes today). Then call with `previousConsumed: 2500, nextConsumed: 2000` → **assert no refund is credited**. *Expected observation: FAILS on current code (refund fires).* If it passes, take Fork F1.
- Test 2 (atomicity shape): assert the spend path calls `update` with `currentBalance: { decrement: … }` rather than a literal number. *Expected observation: FAILS today.*

**Move A2 — fix inside `applyCalorieBankOverageAdjustment`** (single-file fix; both meal routes inherit it):
1. Re-read the bank inside the tx (`tx.calorieBank.findUnique({ where: { id: bank.id } })`) and use the fresh row for all decisions.
2. Spend: keep the `allowNegative` gate against the fresh balance, then write `currentBalance: { decrement: amount }`, `totalSpent: { increment: amount }`.
3. Refund: cap at what was actually debited for this day — compute net applied spend from `tx.bankTransaction.findMany({ where: { bankId, sourceId } })` (sum SPEND minus prior refund ADJUSTs), refund `min(adjustment.amount, max(0, appliedSpend))`, record nothing when 0. Use `increment`/`decrement` writes; clamp `totalSpent` at 0 using the fresh in-tx read.
- *Expected observation:* A1 tests pass; existing calorieBank tests still pass.
- *Likely failure:* existing tests assert the old refund behavior → they encode the bug; update the assertion and say so in the report. *Second likely failure:* aggregate quirks through the libSQL adapter → counter-move: `findMany` + reduce in JS inside the tx.
- **Fork F1:** if recon 0.2 shows A already fixed, promote R1 and continue to B.

**Move A3 — behavioral spot-check (only if 0.7 allows):** dev server + `X-Test-User-Id` bypass: POST an overspending meal, PUT it back down, then inspect `bank_transactions` — no ADJUST refund may exceed prior SPENDs for that log.

## Target B — meal PUT validation

**Move B1 — reproduce.** Prefer live proof; code-path proof is acceptable per mission. Create a meal via the bypass user, then:
`curl -X PUT localhost:3000/api/meals/<id> -H 'X-Test-User-Id: <e2e-user>' -H 'content-type: application/json' -d '{"name":"x","calories":"banana"}'`
*Expected observation: 200, and the follow-up GET /api/meals shows `consumedCalories` as null/NaN — the corruption.* (The bypass only works if the meal belongs to the test user — create it through the same bypass.)

**Move B2 — fix.** Mirror POST exactly in PUT (and audit DELETE for the same hole while there): `truncate(name, 200)`; `safeCalories = clampInt(calories, 0, 10000)` with `null → 400` (this also **un-breaks 0-calorie edits** — intentional; note in report); `clampNumber` on every macro/micro with POST's ranges; `servingSizeG` handled as POST does. Import from `@/src/lib/validation`. Keep response shapes identical.
- *Expected observation:* B1 repro returns 400; a legitimate numeric edit still 200s and adjusts the log by the delta.
- *Likely failure:* the refactor moved PUT onto `handleRoute` → re-anchor on the `calorieDifference` computation; the clamps are the same regardless of wrapper.
- **Fork F2:** if PUT already clamps (recon 0.4), promote R1.

## Target D — parse-meal prod reliability

**Move D1 — settle recon 0.5/0.6, then branch:**
- Shape 1 (unguarded `readFileSync`): any environment without `.env.local` throws on every parse call → **fix**: wrap in try/catch, fall back to `process.env.NUTRIMIND_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY`. Keep the file-read *first* — it exists to defeat a poisoned system-level `OPENAI_API_KEY` in dev; do not invert the priority.
- Shape 2 (already guarded): verify the fallback prefers `NUTRIMIND_OPENAI_API_KEY`; if sound, demote D and take **Fork F3**.
- *Expected observation after fix:* temporarily rename `.env.local` (rename back immediately), call POST /api/parse-meal → clean JSON error (or cache hit), not a 500 stack.
- *Likely failure:* no key to exercise the live OpenAI call → fine; the defect is the crash path, provable by the rename test alone.
- **Fork F3 (D demoted):** take R1 — in `bankPendingCompletedDays`, add `caloriesConsumed: { gt: 0 }` to the candidate where-clause + a vitest on `calculateCompletedDaySurplus` documenting that zero-consumed days bank nothing. *Product-intent call: banking requires evidence the user tracked that day — state this rationale in the report.* If R1 is also fixed, take R2 (wrap initialize in `prisma.$transaction`; fallback email `user_<userId>@placeholder.invalid` to dodge the unique collision).

## Verification runs (in order; all required)

1. `npm run test` — pass = all vitest suites green including new tests. (`src/lib/__tests__/api-helpers.test.ts` may exist from the refactor; its failures are not ignorable — fix or report.)
2. `npm run lint` — pass = exit 0.
3. `npm run build` — pass = exit 0. *Likely failure:* pre-existing redesign breakage unrelated to your diff → prove it by isolating: `git diff > /tmp/fixes.patch && git checkout -- <your files> && npm run build && git apply /tmp/fixes.patch`. Report as env blocker, not your failure. Never `git stash` (the tree may carry the user's redesign diff).
4. Focused e2e if env allows (0.7): `npx playwright test e2e/nutrimind-flow.spec.ts`. If browsers/keys missing, capture the exact error + the one-line setup (`npx playwright install`), report as env blocker.

## Abort conditions

- Build red *before* any change of yours, cause outside the three targets → stop, report verbatim; fix nothing unrelated beyond trivial import slips.
- A target's reproduction contradicts the plan AND both its forks are already fixed → report "defect map exhausted", list reserves with evidence, fix nothing speculative.
- Any fix would require `prisma migrate` → out of scope; report as migration/data risk. (All three primary fixes are schema-free by design.)
- One target's fix is spreading past ~6 files → you've drifted into redesign; revert to the minimal route or demote the target.

## Final report structure (mandatory)

1. **Fixed findings** — file:line (post-fix), one-sentence failure scenario, severity, proof (failing→passing test name or repro command with before/after output).
2. **Unfixed evidence-backed findings** — must include [C] timezone attribution (cite the meals-route "Use UTC" comment vs local-date implementation) plus untaken reserves.
3. **Verification results** — the four runs, verbatim tails.
4. **Env blockers** — exact error + smallest next command.
5. **Migration/data risk** — Target A's refund cap is go-forward only; historically minted balances are NOT retroactively corrected (the user-facing remedy is the existing `createCalorieBankResetData()` reset — offer, never run).
6. **Residual risk** — race windows narrowed but SQLite/libSQL tx isolation not formally proven; timezone defect still live; R3 cron-header question if unresolved.
