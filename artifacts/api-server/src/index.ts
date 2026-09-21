import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripe-client";
import type Stripe from "stripe";
import { refreshIncompleteMerchantAccounts } from "./lib/merchant-onboarding";
import {
  applyDatabaseConstraints,
  bootEnsureAgreement,
  setupStripeV2Destination,
} from "./lib/boot-ensure";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ── Boot sequence ──────────────────────────────────────────────────────────
// 1. Ensure MSA v2.0 is the single active agreement (deactivates DRAFT).
// 2. Apply INSERT-only DB triggers on acceptance_audit_logs.
// 3. Initialize Stripe (runs migrations, creates/verifies v2 event destination).
await bootEnsureAgreement();
await applyDatabaseConstraints();

async function initializeStripe() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    logger.warn(
      "Stripe is not configured; skipping Stripe initialization and webhook sync",
    );
    return false;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (!databaseUrl || !domain) {
    throw new Error("DATABASE_URL and REPLIT_DOMAINS are required for Stripe");
  }
  await runMigrations({ databaseUrl, logger });
  const sync = await getStripeSync();
  const enabledEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    ...new Set([...sync.getSupportedEventTypes(), "account.updated" as const]),
  ];
  await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`, {
    enabled_events: enabledEvents,
  });
  void sync.syncBackfill().then(
    () => logger.info("Stripe backfill completed"),
    (err) => logger.error({ err }, "Stripe backfill failed"),
  );
  // Ensure the Stripe v2 event destination exists; creates it if missing.
  await setupStripeV2Destination(domain);
  return true;
}

const stripeEnabled = await initializeStripe();

const pollIntervalMs = Math.max(
  60_000,
  Number(process.env.STRIPE_ONBOARDING_POLL_INTERVAL_MS ?? 300_000),
);
if (stripeEnabled) {
  const pollMerchantStatuses = () => {
    void refreshIncompleteMerchantAccounts().then(
      ({ refreshed, failed, skipped }) => {
        if (refreshed > 0 || failed > 0 || skipped) {
          logger.info(
            { refreshed, failed, skipped },
            "Stripe v2 onboarding poll completed",
          );
        }
      },
      (err) => logger.warn({ err }, "Stripe v2 onboarding poll failed"),
    );
  };
  setTimeout(pollMerchantStatuses, 10_000);
  setInterval(pollMerchantStatuses, pollIntervalMs);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
