# NutriMind Product Battle Plan

Mission: find and fix the top 3 real product defects that can corrupt calorie bank state, block onboarding, mishandle user/day boundaries, break meal or water logging, leak auth assumptions, or make AI meal parsing unreliable.

Repository root for execution: `/home/kruillin/Projects/Projects/NutriMind/my-app`.

## Ground Rules

- Do not start with code edits. Recon first.
- Do not chase style nits, broad redesign, or unrelated UI polish.
- Fix only the top 3 evidence-backed product defects.
- Do not overwrite user changes. Run `git status -sb` before edits and before final.
- Keep all auth test bypasses locked to non-production behavior.
- Treat `.env.local`, database files, generated screenshots, traces, `.next/`, and local logs as local artifacts unless the repo already tracks them.

## Move 1: Establish The Battlefield

Command:

```bash
pwd
git status -sb
cat package.json
sed -n '1,260p' AGENTS.md
```

Expected observation:

- Working directory is `/home/kruillin/Projects/Projects/NutriMind/my-app`.
- `package.json` exposes `lint`, `build`, `test`, and `test:e2e`.
- `AGENTS.md` confirms Next.js 16.2.1, Clerk, Prisma 7.6.0, SQLite/libSQL, and the rule to read relevant local Next docs before assuming framework behavior.

Most likely failure:

- Dirty tree contains unrelated files.

Cause it signals:

- Prior agent/user work exists in the parent monorepo or app.

Counter-move:

- Continue read-only. Before edits, stage mentally only files required for the chosen findings. Do not clean, reset, or reformat unrelated files.

Fork trigger:

- If `git status -sb` shows edits in files needed for the fix, inspect those diffs with `git diff -- <file>` and work with them. If the diff conflicts with the mission, stop and report the conflict.

## Move 2: Trace User Identity And Onboarding

Read:

```bash
sed -n '1,280p' app/api/user/initialize/route.ts
sed -n '1,280p' app/onboarding/page.tsx
sed -n '1,220p' src/lib/user-init.ts
sed -n '1,220p' app/dashboard/page.tsx
```

Expected observation:

- `app/onboarding/page.tsx` submits profile, metabolic profile, calorie bank, and current weight to `/api/user/initialize`.
- `app/api/user/initialize/route.ts` allows `X-Test-User-Id` only when `NODE_ENV !== "production"`.
- Initialization upserts profile, metabolic profile, and calorie bank, and creates a weight entry when `weightKg` is provided.
- Dashboard redirects to onboarding when profile height is missing.

Most likely failure:

- Onboarding allows invalid or incomplete numeric values, leading to `NaN`, impossible TDEE values, or a server 500.

Cause it signals:

- Client-side step navigation and submit validation do not guard empty, negative, or non-finite inputs before creating `Date` and numeric payloads.

Counter-move:

- Add focused validation at submit boundary and server route boundary. Server must reject missing/non-finite `heightCm`, `birthDate`, `goalWeightKg`, `trueMetabolicRate`, `bmrEstimate`, `dailyTarget`, and `weightKg` with 400 instead of writing bad state.

Fork trigger:

- If server validation already exists after recon, move this defect lower and prioritize the next reproducible onboarding blocker.

Proof target:

- Add or update an API-level test that posts invalid onboarding payload and expects 400 without creating partial profile/bank data.
- Add a positive test that valid onboarding still creates or updates the profile, metabolic profile, calorie bank, and weight entry.

## Move 3: Trace Day Boundaries

Read:

```bash
sed -n '1,220p' lib/date-utils.ts
sed -n '1,220p' src/lib/api-helpers.ts
rg -n "dayRange|parseLocalDate|getLocalMidnight|new Date\\(" app src lib
```

Expected observation:

- `lib/date-utils.ts` provides local-midnight helpers and `parseLocalDate`.
- `src/lib/api-helpers.ts` provides `dayRange`, but it parses arbitrary `dateParam` with `new Date(dateParam)` and does not validate invalid dates.
- `app/api/meals/route.ts` validates date strings and uses `parseLocalDate`.
- `app/api/water/route.ts` accepts `date` for GET through `dayRange(dateParam)` but POST always uses `dayRange()` for today and ignores a date parameter.

Most likely failure:

- Routes that call `dayRange(dateParam)` can throw or query invalid ranges when `date` is malformed, while other routes return a clean 400.

Cause it signals:

- Date handling is split between strict local date parsing and permissive `new Date` parsing.

Counter-move:

- Pick one route with evidence, preferably `/api/water?date=bad`, and make the route return 400 for invalid date input using existing validation helpers.
- Preserve local-day semantics. Do not convert the whole app to UTC.

Fork trigger:

- If invalid date only affects read-only UI and no corrupt state can result, rank it below calorie bank write defects.

Proof target:

- Add an API helper/unit test covering invalid dates.
- Add a focused route test if an existing route-test harness exists. If not, document why the unit test is the practical proof.

## Move 4: Trace Calorie Bank Writes

Read:

```bash
sed -n '1,280p' src/lib/calorieBank.ts
sed -n '1,280p' app/api/meals/route.ts
sed -n '1,260p' src/lib/__tests__/calorieBank.test.ts
rg -n "applyCalorieBankOverageAdjustment|bankedAmount|BankTransaction|currentBalance|totalSpent|totalBanked" app src prisma
```

Expected observation:

- Meal creation updates `DailyLog.caloriesConsumed` and then calls `applyCalorieBankOverageAdjustment`.
- Spending is based on the delta between previous and next overage.
- Refunding writes `totalSpent: Math.max(0, bank.totalSpent - adjustment.amount)` instead of an increment/decrement operation.
- Completed under-target days are banked from dashboard load through `bankPendingCompletedDays`.

Most likely failure:

- Concurrent meal writes or stale bank objects can make `currentBalance` / `totalSpent` incorrect because adjustment decisions are based on a bank snapshot read before the transaction.

Cause it signals:

- The daily log update and bank update are transactional, but the bank balance used for allow-negative and refund math may be stale under simultaneous requests.

Counter-move:

- Re-read the calorie bank inside the transaction before applying overage adjustment, or change the helper input to accept a bank loaded from `tx.calorieBank.findUnique`.
- Preserve the current delta-overage behavior. Do not rework the calorie bank model.

Fork trigger:

- If SQLite/libSQL transaction isolation makes this hard to reproduce locally, create a deterministic unit test for `calculateOverageAdjustment` and a transaction-level integration note. Do not invent a concurrency fix without proof.

Proof target:

- Test over-target meal additions spend only the new overage.
- Test insufficient bank with `allowNegative = false` logs the meal but does not create a spend transaction or make the balance negative.
- Test refund behavior after reducing overage if a meal edit/delete route exists. If no edit/delete route touches bank state, mark refund path as lower priority.

## Move 5: Trace Meal Logging And AI Parsing

Read:

```bash
sed -n '1,340p' app/api/parse-meal/route.ts
sed -n '1,280p' app/api/meals/route.ts
sed -n '1,280p' app/dashboard/_components/QuickLogClient.tsx
sed -n '1,220p' app/api/cached-foods/route.ts
```

Expected observation:

- `/api/parse-meal` checks Clerk auth directly instead of using shared route helpers.
- It checks `NUTRIMIND_OPENAI_API_KEY` first and falls back to `OPENAI_API_KEY`.
- It returns 500 for missing/invalid key before validating request text or checking cache.
- It caches only the first parsed food item for a text prompt.
- `/api/meals` clamps calories and nutrients and creates the actual meal.

Most likely failure:

- Cached foods cannot be returned when the OpenAI key is absent because key validation happens before the cache lookup.

Cause it signals:

- The route treats all parse requests as API-dependent even when local cache could satisfy them.

Counter-move:

- Validate auth and input first, normalize text, check cache, and only require an OpenAI key on cache miss.
- Keep rate limiting before the expensive OpenAI call. If preserving strict rate limit for cache hits is desired, document that choice.

Fork trigger:

- If tests already cover cache hits without an API key, inspect why they pass. The implementation may have changed.

Proof target:

- Add a test seeded with a `CachedFood` row and no API key; expect a successful cached response.
- Add a cache miss test with no API key; expect the current key error.
- Add invalid text tests: empty, non-string, and over 500 characters.

## Move 6: Trace Water Logging

Read:

```bash
sed -n '1,220p' app/api/water/route.ts
sed -n '1,280p' app/dashboard/_components/DailySummaryClient.tsx
rg -n "waterMl|amountMl|/api/water" app src e2e
```

Expected observation:

- POST `/api/water` increments today's `DailyLog.waterMl`.
- GET `/api/water` can read a requested date.
- E2E only checks that hydration text exists after clicking Add 250ml, not that the amount changed.

Most likely failure:

- Water tests can pass without proving persistence or exact amount.

Cause it signals:

- E2E coverage asserts the section exists, not the state transition.

Counter-move:

- If this is one of the top 3 defects, strengthen the E2E or add an API-level test to assert `waterMl` increments exactly and persists on reload.

Fork trigger:

- If route-level inspection shows water writes are correct and the defect is only weak coverage, do not spend one of the three fixes here unless no higher-severity defect is reproducible.

Proof target:

- Click Add 250ml, reload dashboard, assert the displayed water amount increased by 250.
- Or POST `/api/water` and GET `/api/water` for the same day and assert exact value.

## Move 7: Pick The Top 3

Prioritize in this order unless recon disproves the candidate:

1. State corruption: calorie bank balance, transaction totals, daily log totals, or multi-write behavior.
2. User blocker: onboarding cannot complete or can write invalid/non-finite state.
3. Day-boundary/auth/API reliability: wrong user, wrong date, missing key behavior, or unusable cached AI parsing.
4. Test-only weakness: coverage that can pass while the product is broken.

Expected top 3 candidates from initial recon:

1. `/api/parse-meal` validates OpenAI key before cache lookup, so cached parse results are unavailable without an API key.
2. `/api/user/initialize` accepts weakly validated onboarding numbers and dates, risking invalid profile/metabolic/calorie-bank state or opaque 500s.
3. Date handling is inconsistent across routes; `dayRange(dateParam)` users need validation so invalid date inputs return 400 and cannot query/write the wrong day.

RECON NEEDED:

- Confirm whether `/api/parse-meal` has a test harness with mocked Clerk and Prisma. Exact check: `find . -path '*test*' -type f | sort` and `rg -n "parse-meal|CachedFood|mock.*auth|vi.mock" .`.
- Confirm whether route handlers can be tested directly under Vitest without starting Next. Exact check: inspect existing `src/lib/__tests__` patterns and `vitest` config.
- Confirm whether `/api/user/initialize` has existing tests. Exact check: `rg -n "initialize|X-Test-User-Id|userProfile.upsert|calorieBank.upsert" .`.

## Move 8: Execute Each Fix

For each chosen defect:

1. Write the failing test first when practical.
2. Run the focused failing command.
3. Make the smallest code change.
4. Re-run the focused test.
5. Re-run broader verification.

Expected observation:

- A focused test fails before the fix and passes after the fix, or a manual API reproduction gives a concrete before/after status and response body.

Most likely failure:

- Clerk route mocking is awkward.

Cause it signals:

- Direct route tests may need helper extraction or a small test-only seam.

Counter-move:

- Extract pure validation/normalization/cache-order logic into a helper only if it keeps behavior clearer. Do not build a test framework detour larger than the fix.

## Verification Runs

Run from `/home/kruillin/Projects/Projects/NutriMind/my-app`:

```bash
npm run lint
npm run test
npm run build
```

Run focused E2E only when the dev server/env is available:

```bash
npm run test:e2e -- e2e/nutrimind-flow.spec.ts
```

Pass looks like:

- `npm run lint`: no ESLint errors.
- `npm run test`: all Vitest tests pass, including new focused tests.
- `npm run build`: production build completes.
- Focused E2E: onboarding, dashboard, meal logging, water increment, and calorie bank persistence pass.

Expected blockers:

- Missing `NUTRIMIND_OPENAI_API_KEY` or `OPENAI_API_KEY`: only blocks live AI cache-miss behavior, not cached parse tests.
- Missing Clerk config: may block full app build or live auth paths.
- Missing browser dependencies: may block Playwright.
- Locked SQLite database: stop the dev server or point tests at an isolated test database.

## Abort Conditions

Abort and report instead of forcing changes if:

- A required secret is missing and the only proof path would require inventing a fake live credential.
- The database has live user data and the proposed test/fix would mutate it without an isolated test database.
- The dirty tree contains user edits in the exact files needed and the intended fix would overwrite them.
- The top finding requires a schema migration but the data migration path is unclear.
- The app cannot install/run dependencies due to network or package-manager failures and no local proof route remains.

## Final Report Shape

The executor final report must include:

- Fixed findings: severity, file/line, failure scenario, proof, and fix summary.
- Unfixed evidence-backed findings: why left unresolved.
- Verification results: exact commands and pass/fail status.
- Env blockers: exact missing env var or setup step.
- Migration/data risk: whether schema or existing data changed.
- Residual risk: concise, evidence-based.
