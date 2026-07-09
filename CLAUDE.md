---
tags:
  - type/doc
  - project/nutrimind
  - status/active
type: doc
project: nutrimind
status: active
aliases: []
---
@AGENTS.md

# NutriMind

Next.js 16 App Router, React 19, Clerk auth, SQLite via libSQL, Prisma ORM, Tailwind v4 + shadcn/ui, OpenAI gpt-4o-mini.

## Commands

```bash
npm run dev / build / lint
npm run test:e2e          # Playwright
npx prisma generate       # after schema changes
npx prisma migrate dev
```

## Non-obvious Gotchas

- **Prisma import**: always `@/src/lib/prisma` — NOT `@/lib/prisma`
- **OpenAI env collision**: use `NUTRIMIND_OPENAI_API_KEY` (not `OPENAI_API_KEY`) to avoid system-level override. Routes read this first with fallback.
- **OpenAI keys**: parse routes read `NUTRIMIND_OPENAI_API_KEY` first from `process.env`, with `OPENAI_API_KEY` fallback
- **proxy.ts**: Next.js 16 proxy convention is active. Clerk's wrapper is still named `clerkMiddleware`; keep it there for route protection.
- **Refresh strategy**: client components call `window.location.reload()` after mutations — intentional, no SWR/React Query yet
- **Dates**: current behavior mixes route-local/server-local and UTC semantics; preserve each route until the planned user-timezone migration is designed and reconciled
- **E2E auth bypass**: `X-Test-User-Id` header or `?test-user-id=` query param (non-prod only)
- Dashboard `page.tsx` is server component — fetches all data in parallel via `Promise.all`, passes as props
- Dashboard section state is durable in `?view=`; Meals/Activity day state is durable in `?date=`
- New meal-entry routes call `recordMeal()` from `src/lib/nutrition-day.ts` inside a Prisma transaction; do not duplicate DailyLog/bank mutation logic
- Finance UX: decorative `--brass` is not a small-text color; use `--brass-ink` / `.accent-text`

## CalorieBank Logic

`SPEND` transaction created when meal pushes over daily target. `BANK` (underspent calories) runs nightly via `app/api/cron/bank-calories/route.ts` + `vercel.json`.

## Key Models

`User` · `UserProfile` · `CalorieBank` · `BankTransaction` (BANK/SPEND/ADJUST/EXPIRE) · `DailyLog` · `Meal` · `WeightEntry` · `CachedFood` (normalizedKey unique, hitCount)
