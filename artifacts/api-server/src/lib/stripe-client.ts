import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";
import { logger } from "./logger";

type StripeCredentials = { secretKey: string; webhookSecret?: string };

function requiredStripeSecret(name: "STRIPE_SECRET_KEY", pattern: RegExp) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to enable Stripe features.",
    );
  }
  if (!pattern.test(value)) {
    throw new Error(`${name} has an invalid format`);
  }
  return value;
}

export async function getStripeCredentials(): Promise<StripeCredentials> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (webhookSecret && !/^whsec_/.test(webhookSecret)) {
    throw new Error("STRIPE_WEBHOOK_SECRET has an invalid format");
  }
  return {
    secretKey: requiredStripeSecret(
      "STRIPE_SECRET_KEY",
      /^(?:sk|rk)_(?:test|live)_/,
    ),
    webhookSecret: webhookSecret || undefined,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
let stripeSyncPromise: Promise<StripeSync> | undefined;

export async function getStripeSync() {
  stripeSyncPromise ??= (async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    const { secretKey, webhookSecret } = await getStripeCredentials();
    return new StripeSync({
      poolConfig: { connectionString: databaseUrl },
      stripeSecretKey: secretKey,
      stripeWebhookSecret: webhookSecret ?? "",
      logger,
    });
  })();
  return stripeSyncPromise;
}
