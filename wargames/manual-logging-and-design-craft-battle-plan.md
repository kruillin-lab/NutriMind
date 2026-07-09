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

# Manual Logging Fix + Design Craft Battle Plan

WARGAMED 2026-07-06 at `7195b89` + 3 uncommitted route fixes (initialize, 2× cron). Planner: Claude Fable 5.
Two operations: **OP-A** fix the manual meal-logging break (user-reported: only the AI quick-log works). **OP-B** elevate the interface from "AI slop" template design to crafted editorial design (user directive: "do better").

## 0 — Theatre map

- **Root:** `/home/kruillin/Projects/Projects/NutriMind/my-app`, branch `claude/claude-design-2.0`. Tree carries 3 uncommitted route fixes — do not revert them. Never commit/checkout/stash.
- **Baseline (verified):** `npm run build` exit 0 · `npm run lint` silent · `npm run test` 37/37 · dev server `npm run dev` port 3000, `.env.local` present.
- **OP-A evidence:** dev-server request log during the user's failed manual attempts shows **zero** `POST /api/meals` non-200s — no request leaves the browser. The break is client-side in [QuickLogClient.tsx](../app/dashboard/_components/QuickLogClient.tsx): mode toggle (~line 349), manual form (~line 434), submit gate `disabled={!manualMeal.name.trim() || !manualMeal.calories.trim() || isSubmitting}` (~line 468), early-return validations in `handleManualSubmit` (~lines 243–278). Manual mode pre-existed the rebuild with the same logic shape — the regression may be a render/interaction detail, or the mode may have been broken pre-rebuild too. Auth is NOT the cause: `requireUserId` honors `X-Test-User-Id` in non-prod and the AI path (same headers, same endpoint) works.
- **Test-user machinery (for the executor's repro):** `POST /api/test-auth {email, externalId}` creates a user (non-prod only); `POST /api/user/initialize` with `X-Test-User-Id: <id>` creates profile+bank; dashboard accepts `?test-user-id=<id>`. Use ids prefixed `wargame-repro-` and list created rows in the report. This mutates only the local dev SQLite (`prisma/dev.db`) — acceptable during execution, never during read-only recon.
- **OP-B target inventory (the slop tells, confirmed in current UI):** badge-pill above hero h1; three identical icon-in-tinted-rounded-square feature cards; uniform `rounded-xl` card grid everywhere; icon-chip + label + big-number stat cards; every section the same rhythm. Design tokens in `app/globals.css` are sound (ivory/ink/terracotta) — OP-B is composition and typography, not palette.

## 1 — OP-A move sequence

### MOVE A1 — Scripted UI repro (Playwright, throwaway user)
Start dev server if down. Via Playwright: create `wargame-repro-<epoch>` user through test-auth + initialize (bodies exactly as theatre map), open `http://localhost:3000/dashboard?test-user-id=<id>`, then: click the **Manual** toggle button (text "Manual" in the Quick Log header) → fill "Meal name" input with `Repro bowl` → fill the "Calories" number input with `350` → read the submit button's `disabled` attribute → click it → capture console errors and whether a `POST /api/meals` request fires (browser network + server log).
- **Expected observation (one of four, each routes):**
  1. **Toggle click doesn't switch the form** (AI textarea still visible) → MOVE A2a.
  2. **Form shows but submit stays `disabled` after both fields filled** → MOVE A2b.
  3. **Submit enabled, click fires no network request** (console error or silent) → MOVE A2c.
  4. **Request fires and fails (4xx/5xx)** → MOVE A2d.
  If instead the meal logs successfully (200 + page reload + meal visible): the quick-log manual path WORKS under test bypass — **TRIGGER: route to MOVE A1b**, the break is elsewhere.
- **Most likely failure of the move itself:** dashboard redirects to sign-in. **Cause:** `?test-user-id=` not honored by the dashboard server component. **Counter:** set header instead: drive the page with Playwright `route`-injected `X-Test-User-Id` header, or evaluate `window.__TEST_USER_ID__ = '<id>'` then re-run; if still redirected, read `app/dashboard/page.tsx` for its test-bypass mechanism and use exactly that.

### MOVE A1b (fork) — The user means a different surface
Enumerate every other manual-entry surface and repro each the same way: Meals page (`/meals`) edit/add flow, `MealTemplates` "log" action, `MealPlanner` log action, `FoodDatabaseSearch` add, quick-add chips. The first one that fails is the target; then apply the matching A2 fork by failure class. If ALL surfaces pass under the test user, the failure is specific to the user's real Clerk session → write up exactly what was tested with screenshots, report `RECON NEEDED [R-user]`: ask the user for the failing page + what they observe (error text vs dead button) — do not guess-fix.

### MOVE A2a (fork) — Toggle doesn't switch
Cause A: another element overlays the toggle (check with elementFromPoint at the button's center). Cause B: a JS error at module/render scope killed hydration for this island (console shows it; note AI path working makes full-page hydration failure unlikely, but a lazy boundary can isolate). Counter: fix the specific overlay/error found; both are in `QuickLogClient.tsx` or `DashboardTabs.tsx` only.

### MOVE A2b (fork) — Submit stays disabled
Cause: controlled-input state not updating (e.g. the calories `<input type="number">` receives a value the browser rejects, `onChange` never fires with valid text, or the field rendered is not bound to `manualMeal.calories`). Verify by evaluating input `value` props in React devtools-style via `$$` + fiber, or simpler: add nothing — read the JSX around line 448: the calories field comes from `MANUAL_MACRO_FIELDS[0]`; confirm its `onChange` writes `field.key === "calories"`. Fix the binding found broken; keep the disabled gate itself (it is correct UX).

### MOVE A2c (fork) — Click fires nothing
Cause A: validation early-return fired and the error banner rendered off-screen/invisible (check `submitError` state and whether the banner is display-hidden by the restyle). Cause B: the button lost `type="submit"`/moved outside the `<form>` in a restyle. Counter A: surface the banner (it must be inside the visible card, `text-destructive` on `bg-destructive/5`). Counter B: restore `type="submit"` inside the form. Both single-file.

### MOVE A2d (fork) — Request 4xx/5xx
Capture the response body. `400 "Invalid meal data"` with decimal calories → `clampInt` rejects nothing (it rounds) — so a 400 means `name`/`calories` typing: log the exact payload, fix the client to send numbers not strings (`parseManualNumber` already does — so payload inspection decides). 500 → server stack in dev log, fix per trace. Keep response shapes identical.

### MOVE A3 — Regression-proof it
Add an e2e spec `e2e/manual-log.spec.ts` (pattern-match `nutrimind-flow.spec.ts`): create test user → dashboard → Manual → fill → submit → expect `POST /api/meals` 200 and the meal name visible after reload. **Expected observation:** `npx playwright test e2e/manual-log.spec.ts` green. **Most likely failure:** Playwright browsers not installed → `npx playwright install chromium`, retry; if network-blocked, note env blocker and rely on the manual repro evidence.

## 2 — OP-B: design craft directive

**The standard:** the current pages read as generated — competent tokens, zero point of view. The replacement standard is *editorial print design*: one strong typographic voice, asymmetric composition, rules and whitespace instead of boxes, exactly one accent moment per screen. A reviewer should be unable to guess it was machine-made.

**Anti-slop rules (hard, verifiable):**
1. No badge/pill above a hero heading. No icon-in-tinted-rounded-square anywhere.
2. Max ONE boxed card style per screen; grouping otherwise by hairline rules (`border-t border-border`) and whitespace. Kill card-in-card nesting.
3. Feature/marketing content = numbered editorial entries (`01`, `02`, `03` in small serif figures, rule-separated rows), never equal icon-cards.
4. Terracotta appears ONLY on interactive elements + at most one accent moment per screen. Olive strictly for positive data, `#B3402F` for negative.
5. Type scale is the design: display serif `clamp(2.75rem, 6vw, 5rem)`, line-height 1.02, weight 500; section heads serif 1.5rem; small-caps labels 11px/`tracking-[0.08em]` uppercase used as the ONLY label style; body 15px/1.6; ALL data numerals tabular (`.num`).
6. Copy is part of the craft: confident, concrete, no "AI-powered" self-labeling, no exclamation marks. Hero: headline ≤ 6 words + one working subline.
7. Charts: hairline axes, no filled backgrounds, terracotta/olive series only, axis labels 10px muted small-caps.

**Per-surface briefs (each agent gets one):**
- **Landing (`app/page.tsx`):** asymmetric 12-col: left 7 cols — small-caps kicker (`NUTRIMIND`), serif display headline about the calorie bank (write it; ≤6 words), one subline, one terracotta CTA + one text-link (not a second button). Right 5 cols — a *ledger vignette*: a passbook-style table (ruled rows, dates + BANK/SPEND entries in tabular figures, running balance column) built from real markup, not a fake screenshot. Below a single full-width rule: three numbered editorial feature rows. Footer: one rule, small-caps links. Delete the stat-strip and the three icon cards.
- **Dashboard (`app/dashboard/page.tsx` + `DailySummary*`, `CalorieBankCard`, `DashboardTabs`):** one hero metric — bank balance, large serif tabular numeral with small-caps unit and a ruled underline, BANK/SPEND ledger beneath it (reuse BankTransactionHistory rows restyled as ledger lines). Supporting metrics (consumed/remaining/water/streak) become ONE ruled row of quiet figures, not four cards. Tabs → text small-caps with a 2px terracotta underline on active (no pill container). Quick Log keeps its card (the screen's one box) — see next brief.
- **Quick Log (`QuickLogClient.tsx`) — after OP-A lands:** AI/Manual as small-caps text toggle with underline (not the pill control), textarea and manual grid share exact field styling; the manual grid groups Calories full-width first, macros in a 3-col row, micros collapsed behind a "More detail" disclosure. Submit copy: "Log it".
- **Meals + Settings + Auth (`app/meals/*`, `app/settings/*`, `(auth)/*`, `onboarding`):** apply rules 1–7; meal history becomes a dated ledger (day rules, meals as rows, calories right-aligned tabular); settings = one column, rule-separated sections, no card grid; onboarding steps numbered in serif figures.
- **Ownership is exclusive per brief; `globals.css` may gain utilities (`.rule`, `.smallcaps`, `.ledger-row`) added by the FIRST design agent only (landing agent) — others consume.**

**Craft loop (mandatory per surface):** implement → Playwright screenshot at 1440px and 390px → self-critique against rules 1–7 as a checklist (write pass/fail per rule) → iterate once. Attach final screenshots to the report.

## 3 — Fork map
A1 outcome 1→A2a · 2→A2b · 3→A2c · 4→A2d · success→A1b · A1b all-pass→R-user report. A3 browsers missing→install/skip-with-blocker.

## 4 — Aborts
- **ABORT-ENV:** baseline (build/lint/test) red before edits — capture, stop.
- **ABORT-SCOPE:** OP-A fix wants schema/API-shape changes, or OP-B wants new dependencies/fonts fetched from network — stop, report. (Serif stays the local Charter/Georgia stack.)
- **ABORT-FOREIGN:** foreign commits/edits appear mid-run — stop edits, report tree state.

## 5 — Verification
- **V1** `npm run build` — PASS exit 0. **V2** `npm run lint` — PASS silent. **V3** `npm run test` — PASS ≥37, 0 fail. **V4** old-hex sweep — PASS 0. **V5** `npx playwright test e2e/manual-log.spec.ts` — PASS green (or documented env blocker + manual repro evidence). **V6** screenshots (landing, dashboard, quick-log manual mode, meals; 1440+390) attached with rule-1–7 checklist all-pass.

## 6 — MANUAL VERIFY
- **M1 (user):** log a meal manually in your real session; expect 200 + it appears in today's log. Rollback: delete the meal in UI.
- **M2 (user):** judge the redesign against "would I ship this?"; iterate via a follow-up directive if not.

## 7 — Report skeleton
OP-A: failure class observed (A2a–d/A1b), fix diff, repro evidence, e2e status, throwaway rows created. OP-B: per-surface before/after screenshots + checklist. V1–V6 tails. Env blockers. Foreign changes. Residual risk.

## 8 — Residual risk
Timezone day-attribution (T6, prior plan) still open. Design craft on inner components (dialogs, scanner, charts detail) gets rules 1–7 but no dedicated composition pass. The user's real-session manual-log failure may differ from test-bypass conditions (cookie/extension interference) — M1 is the decisive check.
