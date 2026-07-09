# NutriMind Product Stability Wargame Prompt

WARGAME ORDER. You are not executing this mission. You are wargaming it. A cheaper executor runs the brief below later. Your job is to produce the route it will follow.

Recon first, read-only:

- Read `/home/kruillin/Projects/Projects/NutriMind/AGENTS.md`.
- Read `/home/kruillin/Projects/Projects/NutriMind/my-app/AGENTS.md`.
- Read `package.json`, `README.md`, `app/`, `lib/`, `prisma/schema.prisma`, and Playwright coverage relevant to onboarding, daily logging, calorie bank accounting, water tracking, auth, and AI meal parsing.
- For Next.js behavior, read relevant local docs under `node_modules/next/dist/docs/` before assuming current APIs.
- Do not edit files during recon.

Then fight the mission on paper, move by move, and write the battle plan to `wargames/nutrimind-product-battle-plan.md`:

- Every move states its expected observation, exactly what the executor should see if it worked.
- Every move carries its most likely failure, the cause it signals, and the counter-move.
- Every fork gets a trigger: if the executor observes X, take route B.
- Assumptions recon could not settle get marked `RECON NEEDED` with the exact check that settles it.
- End with abort conditions and verification runs, including what pass looks like for each.
- Keep the plan executable by a mid-tier coding model without asking follow-up questions.

=== THE MISSION BRIEF (the executor's orders, not yours) ===

Repository: `/home/kruillin/Projects/Projects/NutriMind/my-app`.

Goal: hunt and fix the top 3 real product defects in NutriMind that could corrupt calorie bank state, block onboarding, mis-handle user/day boundaries, break meal or water logging, leak auth assumptions, or make AI meal parsing unreliable.

Before touching anything, trace the core user flow: sign-in or user initialization, onboarding profile creation, TDEE calculation, dashboard loading, meal logging, cached food lookup, daily log creation, calorie bank transaction creation, water update, and E2E coverage.

Rules:

- No style nits.
- No broad redesign.
- Use existing shadcn/ui and project patterns.
- Do not overwrite user changes.
- Fix only the top 3 evidence-backed findings.
- Each finding must cite file and line, explain the failure scenario in one sentence, rate severity, and include proof from a failing test, reproduction command, API trace, Playwright trace, or concrete code path.
- If a secret such as `OPENAI_API_KEY`, Clerk config, or database URL is required, do not invent one; mark the check `RECON NEEDED` and name the exact env var or setup step.

Required verification:

- Run `npm run lint` if configured.
- Run `npm run build` if dependencies and env allow it.
- Run focused Playwright or API-level tests for changed flows when practical.
- If verification cannot run because of missing env, database, browser, or network setup, capture the exact error and provide the smallest next command or env setup needed.
- Final report must separate: fixed findings, unfixed evidence-backed findings, verification results, env blockers, migration/data risk, and residual risk.
