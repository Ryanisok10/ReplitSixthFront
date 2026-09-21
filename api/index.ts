/**
 * Vercel serverless entry for the Sixth Front API.
 *
 * Vercel invokes the default export as the request handler. We reuse the existing
 * Express application (artifacts/api-server/src/app.ts), which is exported WITHOUT
 * calling `app.listen()` — that lives in artifacts/api-server/src/index.ts and is
 * only used for the long-running Replit deployment (Stripe webhook bootstrap and the
 * onboarding poller). Those background jobs are intentionally NOT started in the
 * serverless context; run them from the persistent Replit deployment or a scheduled
 * job instead.
 *
 * Required environment variables on Vercel: DATABASE_URL, STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET, and any origin/base-path values the API expects.
 *
 * NOTE: This entry is deployment-prep scaffolding. It has not been build-verified on
 * Vercel from this environment; validate a preview deploy before relying on it. The
 * primary, fully supported deployment path for this monorepo remains Replit.
 */
import app from "../artifacts/api-server/src/app";

export default app;
