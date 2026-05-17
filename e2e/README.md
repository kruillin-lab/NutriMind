---
tags:
  - type/readme
  - project/nutrimind
  - status/active
type: readme
project: nutrimind
status: active
aliases: []
---
# E2E Testing for NutriMind

## Setup

Playwright is already installed. If you need to reinstall browsers:

```bash
npx playwright install
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug mode
```bash
npm run test:e2e:debug
```

### Run specific test
```bash
npx playwright test e2e/nutrimind-flow.spec.ts
```

## Test Structure

The main test file `nutrimind-flow.spec.ts` covers:

1. **Sign up with Clerk** - Creates a new test user
2. **Complete onboarding wizard** - 3-step form with BMR/TDEE calculations
3. **Verify dashboard loads** - Checks Calorie Bank, Daily Summary, Quick Log
4. **Log a meal** - Natural language meal logging
5. **Add water intake** - Water tracking functionality
6. **Verify Calorie Bank updates** - Confirms bank balance changes

## Environment Variables

Make sure your `.env.local` has Clerk test keys:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

## Screenshots

Tests capture screenshots at each step:
- `e2e/screenshots/01-landing-page.png`
- `e2e/screenshots/02-clerk-modal.png`
- `e2e/screenshots/03-signed-up.png`
- `e2e/screenshots/04-onboarding-step1.png`
- ... and more

## Notes

- Tests run sequentially (not parallel) to avoid user conflicts
- Tests use headless browser by default (set `headless: false` in config to see browser)
- Each test creates a unique email to avoid conflicts
- Screenshots and videos are saved for debugging
