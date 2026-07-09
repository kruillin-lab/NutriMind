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

# NutriMind Design 2.0 Landing Battle Plan

WARGAMED 2026-07-06 at commit `7195b89` (branch `claude/claude-design-2.0`). Planner: Claude Fable 5. Executor: lesser/mid-tier agents.
Mission: land the Claude design 2.0 rebuild safely — adversarial review of the full rebuild diff, fix verified regressions, close the two remaining small product defects, re-verify, and hand back a visual-QA-ready tree.

Sibling plans in this dir (`nutrimind-product-battle-plan.md`, `nutrimind-product-battle-plan-fable.md`) cover the *defect-hunt* mission — **already executed**: their Targets A (bank refund/race), B (PUT clamping), R1 (phantom-day banking) and D (parse-meal env) are fixed at HEAD (commits `109f127`, `d31b44e`). Do not re-fix them; do not edit those plans.

## 0 — Theatre map (planner-verified facts; do not re-fight recon)

- **[R0] Source root:** `/home/kruillin/Projects/Projects/NutriMind/my-app` — its own git repo. If missing, `find /home/kruillin/Projects -maxdepth 3 -name "my-app" -type d 2>/dev/null` and substitute; if still missing → ABORT-ENV.
- **Branch/HEAD:** `claude/claude-design-2.0` at `7195b89`. Tree CLEAN at plan time. Rebuild diff = `256a615..HEAD` (4 commits: `d31b44e` rebuild, `109f127` bank/PUT fixes, `22d829d` test bypass, `7195b89` quick-log feedback). Never `checkout`/`stash`/`reset`; do not commit — leave fixes in the working tree for the final report.
- **Toolchain (all verified working from repo root, npm on PATH):**
  - `npm run build` → **baseline: exit 0**, ends with the route table (`ƒ Proxy (Middleware)` line present).
  - `npm run lint` → **baseline: exit 0, zero output** after the header.
  - `npm run test` → **baseline: `Test Files 4 passed (4)` / `Tests 37 passed (37)`** (vitest).
  - Old-palette sweep: `grep -rn "DFFF35\|18120E\|00C875\|00C8FF\|FF5A3D\|FFB000\|FFF8E7\|FFF0B8\|FFE8A8\|2A2017\|6B5738" app components --include="*.tsx" --include="*.css" | wc -l` → **baseline: 0**.
  - `.env.local` exists (do NOT print its contents). Dev server: `npm run dev` on port 3000. E2E auth bypass: `X-Test-User-Id` header or `?test-user-id=` (non-prod only).
- **Design contract (for judging review findings):** tokens in `app/globals.css` — ivory `#FAF9F5` bg, ink `#141413`, terracotta `#C96442` primary, `#F0EEE6` wells, hairline `border-border`, soft shadows, serif h1/h2, charts only `#D97757 #7D8A63 #6A96B8 #D4A27F #8E6C88` (+`#B3402F` danger, `#C7913B` amber). Utility classes `.surface .btn-primary .btn-ghost .pill .chip-* .track .fill-*` are canonical.
- **Hard invariants (a change to any of these in the diff is automatically a HIGH finding):** Prisma import `@/src/lib/prisma`; `NUTRIMIND_OPENAI_API_KEY` read before `OPENAI_API_KEY` (now via `process.env` at `app/api/parse-meal/route.ts:9`, `app/api/parse-label/route.ts:8` — the old readFileSync workaround was deliberately retired, do not restore it); `window.location.reload()` after mutations; per-route date semantics (local `setHours` — do NOT normalize to UTC); `X-Test-User-Id` bypass gated by `NODE_ENV !== "production"`; `proxy.ts`/`clerkMiddleware` untouched; API JSON shapes/status codes/error strings byte-identical to pre-refactor.

### Targets table

| ID | Target | Anchor | Severity | Status |
|----|--------|--------|----------|--------|
| T1 | Behavior drift anywhere in `256a615..HEAD` | whole diff | HIGH | open — never reviewed |
| T2 | Runtime edges from the reskin ('use client' boundaries, lost handlers/keys, hydration) | UI files in diff | HIGH | open — never reviewed |
| T3 | Design-contract violations | UI files in diff | MED | open (hex sweep already 0) |
| T4 | Initialize route non-atomic + email-collision 500 | `app/api/user/initialize/route.ts` (~line 89: bare sequential `upsert`s; `"unknown@example.com"` fallback vs `User.email @unique`) | MED | **open — fix** |
| T5 | Cron auth trusts `x-vercel-cron: 1` header | `app/api/cron/bank-calories/route.ts:7` (same shape in `cron/expire-calories`) | LOW-MED | open — recon-gated |
| T6 | Day attribution ignores `UserProfile.timezone` (server-local midnight everywhere; tz only displayed in settings) | `lib/date-utils.ts` + every route using it | HIGH impact, broad fix | **document only — do NOT fix** (ABORT-SCOPE if tempted) |

## 1 — Move sequence

### MOVE 1 — Re-establish baseline
```bash
cd /home/kruillin/Projects/Projects/NutriMind/my-app && git log --oneline -1 && git status --short && npm run lint && npm run test
```
- **Expected observation:** HEAD `7195b89` (or a descendant), clean tree (or only `wargames/` additions), lint silent-exit-0, `37 passed`.
- **Most likely failure:** new commits/dirty files beyond `7195b89`. **Cause:** another session worked the repo. **Counter:** re-anchor the diff range to `256a615..HEAD` regardless; never revert or stash foreign changes — list them in the report.
- **TRIGGER — lint or test baseline broken before you change anything:** stop, capture output → ABORT-ENV.

### MOVE 2 — Adversarial review of the rebuild diff (T1/T2/T3)
Scope the diff, then review through three lenses. Work from lists, not vibes:
```bash
git diff --name-only 256a615..HEAD > /tmp/rebuild-files.txt && wc -l /tmp/rebuild-files.txt
git diff --stat 256a615..HEAD | tail -3
```
- **Lens A (behavior, API):** for every `app/api/**/route.ts` in the list, open `git diff 256a615..HEAD -- <file>` and hunt: changed JSON shape/status/error string, dropped rate-limit/transaction, auth weakened, date call swapped local↔UTC, `handleRoute` swallowing a non-200 success (201/headers). Known-safe: `progress-photos` POST intentionally kept custom try/catch for its 201.
- **Lens B (runtime, UI):** for every `.tsx` in the list: `'use client'` present iff the file uses hooks/handlers; mapped lists keep `key=`; every `onClick/onSubmit` in the old version still wired in the new; no server component importing client-only modules or `api-helpers`; recharts props reference real data keys.
- **Lens C (contract):** rerun the hex sweep (expect 0); grep `shadow-\[` and `border-2` in `app tsx` files (expect 0 outside globals.css); spot-check one page per area renders token classes not raw hexes.
- **Expected observation:** a findings list, each with file, evidence (quoted old vs new), severity. Empty is a legitimate outcome for A/B given the green baseline — but only after actually walking the per-file diffs.
- **Most likely failure:** finding volume overwhelms the pass. **Cause:** reviewing file-by-file prose instead of hunting the specific patterns above. **Counter:** each lens checks ONLY its listed patterns; anything else is out of scope.
- **TRIGGER — any finding touches a hard invariant (§0):** it is HIGH regardless of apparent harmlessness; fix in MOVE 3.

### MOVE 3 — Fix verified findings
For each HIGH/MED finding from MOVE 2: re-read the file to confirm it is real (reviewers err), apply the minimal fix restoring pre-refactor behavior (the old code is always available: `git show 256a615:<file>`), never redesigning.
- **Expected observation:** per-fix `git diff` is a few lines; `npm run test` stays 37-pass after each fix.
- **Most likely failure:** a "fix" changes an API response shape. **Cause:** fixing toward what looks right instead of what `git show 256a615:<file>` proves was there. **Counter:** the pre-refactor file is the specification.

### MOVE 4 — T4: make initialize atomic and collision-proof
**Proof to capture first (read-only):**
```bash
grep -n "unknown@example.com\|prisma.userProfile.upsert\|\$transaction" app/api/user/initialize/route.ts
```
- **Expected observation:** `unknown@example.com` fallback present; upserts NOT wrapped in `$transaction` (no hit).
- **The fix (two edits, keep everything else verbatim):**
  1. Fallback email becomes per-user unique: replace `let email = "unknown@example.com";` with `let email = `user_${userId}@placeholder.invalid`;` (collision with `User.email @unique` between two Clerk-lookup-failed users currently 500s the second → onboarding block).
  2. Wrap the mutation sequence — `prisma.user.create` (inside the `!existingUser` branch), the three `upsert`s, and the `weightEntry.create` — in one `prisma.$transaction(async (tx) => { ... })`, switching each `prisma.` to `tx.` and typing the callback `(tx: Prisma.TransactionClient)` with `import { Prisma } from "@prisma/client"` (match `src/lib/user-init.ts` style). Keep the Clerk lookup OUTSIDE the transaction (network call). Response shapes unchanged.
- **Expected observation after edit:** `npm run test` 37-pass; `npm run lint` silent. Add one vitest in `src/lib/__tests__/` only if a pure function was extracted — otherwise cite the transaction wrap as the proof and note "route-level test not practical" in the report.
- **Most likely failure:** TS error on the tx callback type. **Cause:** missing `Prisma` type import. **Counter:** copy the exact import+signature from `src/lib/user-init.ts:26`.

### MOVE 5 — T5: cron auth (recon-gated)
**RECON NEEDED [R1]:** can an external request smuggle `x-vercel-cron`? Check `node_modules/next/dist/docs/` and Vercel behavior notes: `grep -ril "x-vercel-cron" node_modules/next/dist/docs/ vercel.json`. Vercel documents that it strips/reserves inbound `x-vercel-*` headers on its edge — but self-hosted/`npm start` deployments get NO such stripping.
- **If evidence confirms Vercel-only deploy AND header stripping** → record "not exploitable on current platform, latent if self-hosted" in the report; NO code change.
- **If unsettled or self-hosting is plausible** → minimal hardening in BOTH cron routes: keep the secret path, and accept `x-vercel-cron` **only when** `process.env.VERCEL === "1"`:
  ```ts
  const isVercelCron = process.env.VERCEL === "1" && req.headers.get("x-vercel-cron") === "1";
  ```
- **Expected observation:** diff is one line per route; tests/lint unchanged.
- **Most likely failure:** breaking real Vercel cron. **Cause:** removing the header path entirely. **Counter:** the fix above never removes it — it scopes it.

### MOVE 6 — Full re-verify
Run V1–V4 (§4). All must meet baseline.

## 2 — Fork map
- MOVE 1: baseline broken pre-change → ABORT-ENV.
- MOVE 2: finding touches hard invariant → HIGH, fix in MOVE 3.
- MOVE 5 [R1]: stripping proven → document only; else → one-line guard.
- Any move: fix wants >6 files or a schema migration → ABORT-SCOPE.

## 3 — Abort conditions
- **ABORT-ENV:** build/lint/test red before any edit. Capture full output tail; hand back verbatim; touch nothing.
- **ABORT-SCOPE:** a fix demands schema migration, timezone re-architecture (T6), >6 files, or new dependencies. Capture what was found; report as evidence-backed-unfixed.
- **ABORT-FOREIGN:** mid-run, new foreign commits or working-tree changes appear (another agent active). Stop edits, report tree state.

## 4 — Verification runs
- **V1** `npm run build` — **PASS:** exit 0, route table prints.
- **V2** `npm run lint` — **PASS:** exit 0, no output after header.
- **V3** `npm run test` — **PASS:** ≥37 tests, 0 failures (more is fine if you added tests).
- **V4** hex sweep from §0 — **PASS:** `0`.
- **V5** (only if `.env.local` valid and port 3000 free) `npm run dev` + `curl -s localhost:3000/api/health` — **PASS:** 200 JSON; then `curl -s localhost:3000 | grep -c "FAF9F5\|surface"` ≥1 proves the landing page serves the new theme. Kill the server after. If Clerk keys invalid → skip, note env blocker.

## 5 — MANUAL VERIFY (user/top-level agent)
- **M1 Visual QA:** dev server → screenshot landing, sign-in, dashboard (via `?test-user-id=` bypass), mobile viewport, `.dark` class. Expected: ivory/terracotta editorial theme, serif headings, no neon lime anywhere, no unstyled/overlapping regions. Rollback if catastrophic: `git checkout 256a615 -- app components` (destroys the reskin — user decision only).
- **M2 Commit/push decision:** per `AGENTS.md` §2.5 the user's acceptance ("looks good/ship it") authorizes commit+push. Executor never commits.

## 6 — Report skeleton
1. Review findings (fixed / false-positive / unfixed) with evidence quotes. 2. T4/T5 outcomes with diffs. 3. V1–V5 verbatim tails. 4. Env blockers. 5. Foreign-change log (anything not yours in the tree). 6. Residual risk.

## 7 — Residual risk noted at plan time
- **T6 timezone** stays live: all day-math is server-local midnight; on UTC servers, US-evening meals land on tomorrow's log and crons close days early. Correct fix = attribute days in `UserProfile.timezone` via one shared helper — deliberate out-of-scope (redesign-sized).
- SQLite/libSQL transaction isolation under concurrency is assumed, not proven, for the bank fixes in `109f127`.
- `|| ""` OpenAI key fallback means a missing key fails at request time with an OpenAI auth error, not a clean "AI unavailable" message — cosmetic, out of scope.
- Review lens A trusts that `git show 256a615:<file>` is the behavioral spec; if `256a615` itself contained a latent bug, byte-identical preservation preserves it (see sibling product plans for the known set).
