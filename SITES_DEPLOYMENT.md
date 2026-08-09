---
tags:
  - type/deployment-guide
  - project/nutrimind
  - status/active
type: deployment-guide
project: nutrimind
status: active
aliases: []
---
# Private OpenAI Sites deployment

NutriMind is packaged as a Cloudflare Worker through Vinext for private OpenAI Sites hosting. The live deployment must use a remote Turso/libSQL database; the local SQLite database is intentionally rejected when `NUTRIMIND_HOSTED_RUNTIME="1"`.

## Prepare a release

From `my-app/`:

```bash
npm ci
npm run lint
npm test
npm run build
npm run build:sites
```

The Sites package must contain both `dist/server/index.js` and `dist/.openai/hosting.json`. Do not copy `.env.local` into a hosted environment.

## Hosted environment

Set these values in the private Sites project before deploying:

- `NUTRIMIND_HOSTED_RUNTIME=1`
- `DATABASE_URL` — a remote `libsql://` or `https://` Turso/libSQL URL
- `TURSO_AUTH_TOKEN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NUTRIMIND_OPENAI_API_KEY` (or `OPENAI_API_KEY`)
- `CRON_SECRET`

Optional email digest values are `RESEND_API_KEY` and `DIGEST_FROM_EMAIL`. Cron calls outside Vercel must send `Authorization: Bearer <CRON_SECRET>`.

## Current release exceptions

- The normal quality-gate command failed twice on stale generated `.next/types/validator.ts` output. Per the repository gate policy it was not run a third time. The current source separately passes `npm run lint`, `npm test` (77 tests), `npm run build`, and `npm run build:sites`. See `.quality-gate/reports/gate-20260809T125137Z-b8c0b5d5.md`.
- `npm audit --audit-level=high` still reports two high `image-size` advisories through `vinext@1.0.0-beta.5`. The dependency is used by Vinext's build-time image and metadata generation, not imported in the produced Worker runtime. The offered `npm audit fix --force` resolution is a breaking downgrade to `vinext@0.0.45`; do not apply it without a separate compatibility review.

No live deployment should be enabled until the hosted database and every required secret above have been provisioned.
