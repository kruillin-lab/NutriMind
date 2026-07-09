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

# War Room - NutriMind Finance UX Redesign

**Status:** EXECUTED
**Date opened:** 2026-07-09
**Advisor:** Codex primary session, deep-route intent; runtime model selector unavailable
**Trigger:** user expanded scope to “complete redesign of the UX with a bank/finance theme” after the meal-path war room had begun execution
**Battle plan:** [nutrimind-finance-ux-redesign-battle-plan.md](nutrimind-finance-ux-redesign-battle-plan.md)

## 1. Frame

- **Current state:** a broad uncommitted Vault reskin already provides cream paper, ink, brass, ledger rows, seals, and monospaced figures. Its visual identity is strong, but the information architecture still reads like the old feature dashboard: the primary logging action is low on mobile, the dashboard client owns four large feature suites, navigation state is not durable, settings feedback is distant, and many controls lack explicit semantics.
- **Desired end state:** NutriMind behaves like a calm financial operating system for nutrition: a Reserve Account overview, a daily allocation statement, a transaction/activity ledger, analytics, planning, health records, and account controls. The UX must be responsive, accessible, and visually consistent from landing through authenticated surfaces.
- **In scope:** global design system, shell/navigation, landing/auth/onboarding, dashboard and its four views, Quick Log, meals/activity ledger, settings/account controls, responsive hierarchy, accessibility, loading/error states.
- **Out of scope:** database/schema migration, timezone conversion, expiration-lot accounting, new product features, API response changes, and changing nutrition/calorie-bank business rules.
- **Constraints:** preserve all user-owned logic in the dirty tree; use existing shadcn/Base UI/Radix primitives; keep existing routes and mutation flows; no new dependency; pass lint, unit tests, production build, and focused manual/visual checks.
- **Commander's intent:** every main route must read as one coherent finance product, put the next user action before secondary analysis on mobile, expose active/selected/error state accessibly, and preserve all existing nutrition behavior.

## 2. Recon

### Facts

| # | Fact | Evidence |
|---|------|----------|
| F1 | The current Vault palette and bank-statement motif are approved and distinct. | `app/globals.css:53-130`; `vault-dashboard.jpeg`, `vault-meals.jpeg`, `vault-settings.jpeg` |
| F2 | Current worktree is intentionally broad and uncommitted; the user has now explicitly authorized redesigning it. | `git status -sb`; latest user instruction |
| F3 | Quick Log appears after the ledger and full statement in mobile DOM order. | `app/dashboard/_components/DashboardTabs.tsx:128-159` |
| F4 | Dashboard view state is local `defaultValue`, not URL-addressable. | `DashboardTabs.tsx:97-116,163-187` |
| F5 | Meals already has server `?date=` support but client navigation loses it on reload/share. | `app/meals/page.tsx:120-154`; `MealHistoryClient.tsx:89-139` |
| F6 | Settings spans profile, goals, bank, destructive actions, notifications, and export in one long component with global feedback. | `SettingsClient.tsx:38-50,190-601` |
| F7 | Shared button sizes and icon actions are visually compact; Quick Log and navigation have semantic gaps. | `components/ui/button.tsx:25-35`; UX recon F8-F10 |
| F8 | Light brass is decorative-quality but fails normal small-text contrast on page/card backgrounds. | `app/globals.css:55-80`; measured ratios 3.31:1 and 3.78:1 |
| F9 | Baseline after the meal-domain slice: lint PASS, 41/41 tests PASS, production build PASS; typecheck retains only six known route-test errors. | verification outputs from this session |

### Assumptions

| # | Assumption | Settling check | Routing |
|---|------------|----------------|---------|
| A1 | Users understand “reserve, deposit, withdrawal, allocation, ledger” when paired with nutrition labels. | Manual comprehension pass on landing/dashboard. | If finance copy obscures nutrition, use dual labels (“Reserve / banked calories”). |
| A2 | Mobile logging frequency outweighs mobile analytics frequency. | 390px task-order check; future analytics. | Put Quick Log immediately after summary on mobile; retain richer desktop grid. |
| A3 | Route migration is not required for a complete perceived redesign. | Test deep-link needs with `?view=` and existing routes. | If inadequate, schedule child-route migration separately after this clean baseline. |

### RECON NEEDED

- [R1] Live in-app browser connection was unavailable (`node_repl` transport closed). Use existing current screenshots and post-build local screenshots/manual check; do not claim live browser proof without it.

## 3. Criteria

Fixed before COAs: product coherence 30; task clarity/responsiveness 25; behavior preservation 20; accessibility 15; implementation safety 10.

Screening gates: feasible; suitable; acceptable; distinguishable; complete.

## 4. Courses Of Action

### COA-0 - Keep Current Vault Pass

- Preserve current visuals and make no further UX change.

### COA-1 - Surface Reskin Only

- Change tokens, typography, cards, and copy while preserving current layout and local state.

### COA-2 - Finance Cockpit On Existing Routes

- Establish a finance design contract, rebuild page hierarchy and responsive order, make dashboard/meals state URL-aware where already supported, add accessible state/feedback, and keep APIs/routes stable.

### COA-3 - Full Feature Route Migration

- Split dashboard/settings into new nested routes with per-feature server loading and shared domain UI modules.

### Screening

| COA | Result | Reason |
|-----|--------|--------|
| COA-0 | killed: unsuitable | User explicitly requested a complete redesign. |
| COA-1 | survives | Visually feasible but does not solve hierarchy or state. |
| COA-2 | survives | Complete perceived redesign with controlled technical risk. |
| COA-3 | killed: unacceptable | Combines UX redesign with a routing/data-loading migration, increasing regression surface without adding immediate user value. |

## 5. Wargame

### COA-1

| Move | Expected | Failure and cause | Counter |
|------|----------|-------------------|---------|
| Retokenize surfaces | Stronger finance look | Same old task order remains under new paint | Reject as incomplete |
| Rewrite copy | Theme feels intentional | Banking jargon hides nutrition meaning | Use dual labels |

**Red-team verdict:** visually distinct but not a complete UX redesign.

### COA-2

| Move | Expected | Failure and cause | Counter |
|------|----------|-------------------|---------|
| Lock finance design contract | Agents produce one system | Parallel visual drift | Main session owns tokens/shell first; lanes consume them |
| Rebuild shell and overview hierarchy | Account state and next action are obvious | Dense finance metaphor increases cognitive load | Pair every finance label with plain nutrition context |
| Reorder responsive dashboard | Quick Log precedes analysis on mobile | Desktop order regresses | CSS order/grid areas per breakpoint |
| Make view/date state durable | reload/back/share preserve context | Router changes trigger data refetch bugs | Use existing query params and controlled Radix tabs only |
| Redesign account controls | local actions and risk are clear | long settings form still overwhelms | section cards, sticky/local status, danger zone |
| Verify | coherent routes and green build | foreign logic accidentally removed | diff-by-scope plus non-author review |

**Red-team verdict:** survives if visual ownership is centralized and each executor has disjoint files.
**Second-order effects:** establishes a stable baseline for later route splitting and domain migrations.

### Matrix (1-5, weighted / 500)

| Criterion | COA-0 | COA-1 | COA-2 | COA-3 |
|-----------|------:|------:|------:|------:|
| Product coherence (30) | 3 | 4 | 5 | 5 |
| Task clarity/responsive (25) | 2 | 2 | 5 | 5 |
| Behavior preservation (20) | 5 | 4 | 4 | 2 |
| Accessibility (15) | 2 | 3 | 5 | 5 |
| Implementation safety (10) | 5 | 4 | 3 | 1 |
| **Total** | **320** | **335** | **460** | **400** |

## 6. Decision

- **Selected:** COA-2, Finance Cockpit on existing routes.
- **Why COA-0 lost:** it contradicts the expanded request.
- **Why COA-1 lost:** it is a theme pass, not a hierarchy/state redesign.
- **Why COA-3 lost:** it mixes two expensive migrations and risks business behavior.
- **Residual risk:** URL state remains query-based rather than route-based; some low-frequency inner dialogs will inherit the system rather than receive bespoke composition; browser automation is unavailable until the in-app connection recovers.
- **Orders:** execute the sibling battle plan.

## 7. Supervision And After-Action

- **Execution log:** shared finance system and shell landed first; disjoint AER lanes rebuilt dashboard, Activity Ledger, and account journey; main integration completed landing, navigation, shared controls, error/404, documentation, and live verification.
- **Reviewer:** fresh non-author AER reviewer returned three P2 findings: impossible query dates, duplicate main landmarks, and stale edit E2E labels. All three were fixed. Date-key validation now round-trips real calendar dates and canonicalizes invalid URLs; route wrappers use the layout main landmark; E2E copy matches `Post amendment`/`kcal`.
- **Quality gate:** lint PASS; 6 test files/44 tests PASS; production build PASS; diff check PASS; typecheck has only the six pre-existing `app/api/meals/[id]/route.test.ts` mock errors. Headless Chromium verified landing/dashboard/activity/settings desktop plus landing/dashboard at 390px. Live disposable POST and PUT meal flows returned 200 and persisted to the Activity Ledger. Formal gate run `20260709T203741Z-c3736cba` remains red because `quality-gate.json` is Windows-only and two pre-existing untracked plans lack metadata.
- **Re-convene:** none after reviewer fixes. Deferred campaigns remain timezone attribution, credit-lot expiration, cache privacy, and eventual route decomposition.
