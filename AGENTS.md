<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# AGENTS.md

> **AI AGENT INSTRUCTIONS**
> This file contains operational parameters for AI agents working on NutriMind.

## 1. Project Overview

**NutriMind** is a Next.js 16.2.1 nutrition tracking application with a unique "Calorie Bank" concept that allows users to bank underspent calories and spend from reserves when overspending.

- **Framework**: Next.js 16.2.1 (App Router)
- **React**: 19.2.4
- **Auth**: Clerk (@clerk/nextjs)
- **Database**: SQLite + Prisma 7.6.0
- **ORM**: Prisma with libSQL adapter
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **AI Integration**: OpenAI for natural language meal parsing
- **Testing**: Playwright for E2E testing

## 2. Build & Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Run linting
npm run lint

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug  # Debug mode
```

## 2.5 Completion Repo Update Rule

When the user says a task, feature, report, or design is completed/accepted
("completed", "done", "looks good", "go with this", "ship it", etc.), treat that
as permission to update the GitHub repo for the completed work.

Default completion flow:

1. Run the relevant verification command when practical.
2. Inspect `git status` and `git remote -v`.
3. Stage only files that belong to the completed task.
4. Commit with a concise message describing the completed work.
5. Push to GitHub.
6. If a branch must be created, use the `codex/` prefix unless the user names a branch.

Do not stage unrelated user changes, secrets, local environment files, or throwaway
logs. If GitHub auth, a remote, verification, or unrelated dirty files prevent a
safe update, report the blocker and the exact next step instead of forcing it.

## 3. Project Structure

```
my-app/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (Hero + Features)
│   ├── layout.tsx                # Root layout with Clerk
│   ├── globals.css               # Global Tailwind styles
│   ├── dashboard/                # Main dashboard
│   │   ├── page.tsx              # Dashboard server component
│   │   └── _components/          # Dashboard components
│   │       ├── CalorieBankCard.tsx
│   │       ├── DailySummaryClient.tsx
│   │       └── QuickLogClient.tsx
│   ├── onboarding/               # 3-step onboarding wizard
│   │   └── page.tsx              # TDEE calculation flow
│   ├── api/                      # API Routes
│   │   ├── meals/route.ts
│   │   ├── parse-meal/route.ts
│   │   ├── user/initialize/route.ts
│   │   ├── water/route.ts
│   │   ├── cached-foods/route.ts
│   │   └── webhooks/clerk/route.ts
│   └── (auth)/                   # Auth routes if needed
├── components/                   # Shared UI components
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── ...
├── lib/                          # Shared utilities
│   ├── prisma.ts                 # Prisma client singleton
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   ├── user-init.ts              # User initialization logic
│   └── clerk.ts                  # Clerk configuration
├── prisma/
│   └── schema.prisma             # Database schema
├── e2e/                          # Playwright E2E tests
│   ├── README.md
│   └── ...
└── public/                       # Static assets
```

## 4. Database Schema

### Core Models

**User** (`users`)
- `id` (String, CUID) - Primary key
- `email` (String, unique)
- `name` (String?, optional)
- Relations: `profile`, `metabolicProfile`, `calorieBank`, `dailyLogs[]`, `weightEntries[]`

**UserProfile** (`user_profiles`)
- User's physical stats and goals
- `heightCm`, `birthDate`, `gender` (MALE/FEMALE/OTHER)
- `goalWeightKg`, `targetDate`, `activityLevel` (SEDENTARY/LIGHT/MODERATE/ACTIVE/VERY_ACTIVE)
- `timezone` (default: "America/New_York")

**MetabolicProfile** (`metabolic_profiles`)
- Learned metabolic values
- `trueMetabolicRate` - Actual calories burned per day
- `bmrEstimate` - Baseline BMR for comparison
- `adaptiveFactor` - Metabolic adaptation %
- `predictionAccuracy` - How accurate predictions are (0-1)
- `calculationMethod` - How we started (default: "harris_benedict")

**CalorieBank** (`calorie_banks`)
- Core "Calorie Bank" concept
- `currentBalance` - Available to spend
- `totalBanked` - Lifetime earned
- `totalSpent` - Lifetime spent
- `dailyTarget` - Current target (learned, default: 2000)
- `allowNegative` - Can go into debt? (default: false)
- Relations: `transactions[]`

**BankTransaction** (`bank_transactions`)
- `type` (BANK/SPEND/ADJUST/EXPIRE)
- `amount` - Transaction amount
- `reason` - Human-readable explanation
- `caloriesConsumed`, `caloriesTarget` - Context
- `llmAdvice`, `userFollowed` - AI recommendations

**DailyLog** (`daily_logs`)
- Daily nutrition tracking per user
- `date` (DateTime) - Unique per user
- `caloriesConsumed`, `proteinG`, `carbsG`, `fatG`, `fiberG`
- `calorieTarget` - Target for this day
- `caloriesBurned`, `exerciseMinutes`
- `bankedAmount` - Positive = banked, negative = spent
- `waterMl` - Water tracking in milliliters
- Relations: `meals[]`

**Meal** (`meals`)
- Individual meals within a DailyLog
- `name`, `mealType` (BREAKFAST/LUNCH/DINNER/SNACK/OTHER)
- `calories`, `proteinG`, `carbsG`, `fatG`
- `source` - manual, photo, voice, recipe, barcode
- `aiConfidence` - If AI parsed it

**WeightEntry** (`weight_entries`)
- Daily weight tracking
- `weightKg`, `date` (unique per user)
- `source` - manual, smart_scale, import

**CachedFood** (`cached_foods`)
- AI-parsed food cache to reduce API calls
- `normalizedKey` (unique) - lowercase, trimmed
- `originalText` - What user typed
- `calories`, `proteinG`, `carbsG`, `fatG`
- `aiConfidence`, `source`
- `hitCount`, `lastUsedAt` - Cache statistics

## 5. Key Features

### Calorie Bank Concept
The app's core differentiator:
1. Users have a daily calorie target
2. If they eat **under** target, the difference is "banked"
3. If they eat **over** target, they "spend" from bank reserves
4. The bank balance persists across days
5. Users can optionally allow negative balances (debt)

### Onboarding Flow (3 Steps)
1. **Physical Stats**: Height, birth date, gender
2. **Weight Info**: Current weight, goal weight, target date
3. **Activity Level**: Sedentary → Very Active

TDEE is calculated using **Harris-Benedict equation**:
- Men: `88.362 + (13.397 × weightKg) + (4.799 × heightCm) - (5.677 × age)`
- Women: `447.593 + (9.247 × weightKg) + (3.098 × heightCm) - (4.330 × age)`
- Multiply by activity factor: 1.2 (sedentary) → 1.9 (very active)

### Natural Language Meal Logging
- User types something like "Grilled chicken salad with avocado"
- OpenAI parses into structured nutrition data
- Results cached in `CachedFood` table
- If similar text seen before, use cached result

### Water Tracking
- Daily water intake in milliliters
- Tracked on DailyLog.waterMl
- Quick-add buttons for common amounts

## 6. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/meals` | GET | List meals for date |
| `/api/meals` | POST | Log a new meal |
| `/api/parse-meal` | POST | Parse natural language to nutrition |
| `/api/user/initialize` | POST | Initialize new user profile |
| `/api/water` | POST | Update water intake |
| `/api/cached-foods` | GET | Search cached foods |
| `/api/webhooks/clerk` | POST | Clerk webhook handler |

## 7. Authentication

**Clerk** is used for authentication:
- Middleware protects routes automatically
- `auth()` function gets current user in server components
- E2E tests can bypass auth via `X-Test-User-Id` header

### Protected Routes
- `/dashboard` - Requires sign-in
- `/onboarding` - Requires sign-in, redirects if profile complete

## 8. Code Conventions

### File Structure
- Use App Router with `page.tsx` for routes
- Private components in `_components/` folders
- Shared UI in `components/ui/`
- Utilities in `lib/`

### Naming
- **Components**: PascalCase (e.g., `CalorieBankCard.tsx`)
- **Files**: Kebab-case for utilities (e.g., `user-init.ts`)
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### TypeScript
- Strict mode enabled
- Prefer explicit types over `any`
- Use Prisma-generated types where possible

### Prisma
- Always use `@map()` for table names
- Use `onDelete: Cascade` for user relations
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` for migrations

### Tailwind / Styling
- Use Tailwind CSS v4 syntax
- Component variants via `class-variance-authority`
- Merge classes with `tailwind-merge` (via `cn()` utility)

## 9. Testing

**E2E Tests (Playwright)**
- Tests in `e2e/` directory
- Auth bypass supported for testing
- Run: `npm run test:e2e`

**Test Auth Bypass**
Set header `X-Test-User-Id: test-user-id` to bypass Clerk in E2E tests.

## 10. Environment Variables

Key variables needed (in `.env.local`):
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
OPENAI_API_KEY=
DATABASE_URL=
```

## 11. Common Issues

**Next.js 16 Breaking Changes**
- Read `node_modules/next/dist/docs/` before implementing features
- Some APIs may differ from older versions
- Check deprecation notices carefully

**Prisma with SQLite**
- Uses libSQL adapter (`@prisma/adapter-libsql`)
- Connection URL format differs from standard SQLite

**Clerk Middleware**
- Auto-protects routes based on config
- Webhook signature verification required for `/api/webhooks/*`

**OpenAI API Key Caching - ACTIVE INVESTIGATION**
- **Problem**: `process.env.OPENAI_API_KEY` returns wrong key (`bff9a033...` instead of `sk-proj...`)
- **Status**: Module-level fix attempted but wrong key still being loaded
- **Investigation**: Added debug logging to trace env var source
- **Next Steps**: Need to verify if `.env.local` is actually being read by Next.js

## 12. Current Status

- **Landing Page**: Complete with Hero + 3 feature sections
- **Onboarding**: 3-step wizard complete with TDEE calculation
- **Dashboard**: CalorieBankCard, DailySummary, QuickLog, Water tracking, Exercise Log, Weight Tracker, Bank Transaction History
- **Meal Logging**: Natural language parsing via OpenAI - Working (with file path sanitization)
- **Meal History**: Browse by date, edit/delete, micronutrient summaries
- **Settings**: Profile, Goals, Calorie Bank configuration
- **Database**: Full schema implemented
- **E2E Tests**: Playwright configured
- **OpenAI Integration**: Working with .env.local direct read

## 13. Next Steps (Potential)

- Macro Targets
- Meal Templates / Favorites
- Calorie Expiration Cron
- Daily Notes/Journal
- Data Export (CSV)
- Body Measurements
- Dark Mode Toggle
- Food Database Search
- Meal Planning
- Progress Photos
- Push Notifications

## 14. Feature Roadmap (In Progress)

| # | Feature | Status | Files |
|---|---------|--------|-------|
| 1 | Bank Transaction History | ✅ Complete | `app/dashboard/_components/BankTransactionHistory.tsx` |
| 2 | Weekly/Monthly Dashboard View | ✅ Complete | `app/api/daily-logs/route.ts`, `app/dashboard/_components/WeeklyView.tsx` |
| 3 | Streak Tracking | ✅ Complete | `app/dashboard/page.tsx` (streak calc), `app/api/daily-logs/route.ts` (streak stats) |
| 4 | Macro Targets | ✅ Complete | `prisma/schema.prisma`, `app/settings/_components/SettingsClient.tsx`, `app/api/settings/route.ts`, `app/dashboard/_components/DailySummary.tsx`, `app/dashboard/_components/DailySummaryClient.tsx` |
| 5 | Meal Templates / Favorites | ✅ Complete | `prisma/schema.prisma`, `app/api/meal-templates/route.ts`, `app/dashboard/_components/MealTemplates.tsx`, `app/dashboard/_components/MealTemplatesWrapper.tsx` |
| 6 | Calorie Expiration Cron | ✅ Complete | `prisma/schema.prisma`, `app/api/cron/expire-calories/route.ts`, `vercel.json`, `app/settings/_components/SettingsClient.tsx` |
| 7 | Daily Notes/Journal | ✅ Complete | `prisma/schema.prisma`, `app/api/daily-notes/route.ts`, `app/dashboard/_components/DailyJournal.tsx` |
| 8 | Data Export (CSV) | ✅ Complete | `app/api/export/route.ts`, `app/settings/_components/SettingsClient.tsx` |
| 9 | Body Measurements | ✅ Complete | `prisma/schema.prisma`, `app/api/body-measurements/route.ts`, `app/dashboard/_components/BodyMeasurements.tsx` |
| 10 | Dark Mode Toggle | ✅ Complete | `components/ThemeProvider.tsx`, `components/ThemeToggle.tsx`, `app/layout.tsx`, `package.json` (next-themes) |
| 11 | Food Database Search | ✅ Complete | `app/api/cached-foods/route.ts`, `app/dashboard/_components/FoodDatabaseSearch.tsx`, `app/dashboard/page.tsx` |
| 12 | Meal Planning | ✅ Complete | `prisma/schema.prisma` (MealPlan, MealPlanItem models), `app/api/meal-plans/route.ts`, `app/api/meal-plans/items/route.ts`, `app/api/meal-plans/log/route.ts`, `app/dashboard/_components/MealPlanner.tsx` |
| 13 | Progress Photos | ✅ Complete | `prisma/schema.prisma` (ProgressPhoto model), `app/api/progress-photos/route.ts`, `app/dashboard/_components/ProgressPhotos.tsx` |
| 14 | Push Notifications | ✅ Complete | `prisma/schema.prisma` (PushSubscription model), `app/api/push-subscriptions/route.ts`, `public/sw.js`, `app/dashboard/_components/PushNotifications.tsx`, `app/settings/_components/SettingsClient.tsx`, `components/ui/switch.tsx` |
