# Sixth Front

Sixth Front helps restaurants launch online ordering, merchandise stores, and custom storefronts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_V2_WEBHOOK_SECRET`
- Stripe features are disabled when these secrets are absent, allowing the public site and API health checks to run. Use separate Stripe sandbox secrets for development and live-mode secrets for production; add them through Replit Secrets, never source control or chat.
- `STRIPE_WEBHOOK_SECRET` signs the legacy `/api/stripe/webhook` endpoint. `STRIPE_V2_WEBHOOK_SECRET` signs the Accounts v2 `/api/stripe/v2/webhook` endpoint.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

- The API uses direct Stripe secrets and does not read the Replit Stripe connector environment. If publishing still displays the Integrated Payments claim gate after the secrets are configured, detach the old Stripe integration from the project before publishing.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
