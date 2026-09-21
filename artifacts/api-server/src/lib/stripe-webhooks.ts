import type Stripe from "stripe";
import { getStripeSync, getUncachableStripeClient } from "./stripe-client";
import {
  STRIPE_V2_API_VERSION,
  syncLegacyMerchantAccount,
  syncMerchantAccount,
} from "./merchant-onboarding";
import { handlePaymentIntentWebhook } from "./order-service";

export const STRIPE_V2_WEBHOOK_EVENTS = [
  "v2.core.account.created",
  "v2.core.account.updated",
  "v2.core.account.closed",
  "v2.core.account[configuration.merchant].updated",
  "v2.core.account[configuration.merchant].capability_status_updated",
  "v2.core.account[requirements].updated",
  "v2.core.account[identity].updated",
  "v2.core.account[defaults].updated",
  "v2.core.account_link.returned",
];

const accountLookupIncludes = [
  "configuration.merchant",
  "identity",
  "requirements",
  "defaults",
] as const;

export async function ensureStripeV2EventDestination(domain: string) {
  const stripe = await getUncachableStripeClient();
  const url = `https://${domain}/api/stripe/v2/webhook`;
  const destinations =
    await stripe.v2.core.eventDestinations.list(
      { include: ["webhook_endpoint.url"] },
      { apiVersion: STRIPE_V2_API_VERSION },
    );
  const current = destinations.data.find(
    (destination) =>
      destination.type === "webhook_endpoint" &&
      destination.webhook_endpoint?.url === url,
  );

  if (!current) {
    throw new Error(
      "Create the Sixth Front Accounts v2 event destination in Stripe, then store its signing secret as STRIPE_V2_WEBHOOK_SECRET",
    );
  }
  return current;
}

export async function createStripeV2EventDestination(domain: string) {
  const stripe = await getUncachableStripeClient();
  const url = `https://${domain}/api/stripe/v2/webhook`;
  return stripe.v2.core.eventDestinations.create(
    {
      name: "Sixth Front Accounts v2",
      description: "Sixth Front merchant onboarding and capability updates",
      type: "webhook_endpoint",
      event_payload: "thin",
      events_from: ["@accounts"],
      enabled_events: STRIPE_V2_WEBHOOK_EVENTS,
      webhook_endpoint: { url },
      include: ["webhook_endpoint.signing_secret", "webhook_endpoint.url"],
    },
    { apiVersion: STRIPE_V2_API_VERSION },
  );
}

function accountIdFromEvent(event: Record<string, any>) {
  const relatedId =
    typeof event.related_object?.id === "string"
      ? event.related_object.id
      : null;
  const dataId =
    typeof event.data?.account_id === "string"
      ? event.data.account_id
      : typeof event.data?.object?.id === "string"
        ? event.data.object.id
        : null;
  return relatedId ?? dataId;
}

export async function processStripeWebhook(payload: Buffer, signature: string) {
  if (!Buffer.isBuffer(payload)) {
    throw new Error("Stripe webhook payload must be a Buffer");
  }
  const sync = await getStripeSync();
  await sync.processWebhook(payload, signature);
  const event = JSON.parse(payload.toString("utf8")) as Stripe.Event;
  if (event.type === "account.updated") {
    const eventAccount = event.data.object as Stripe.Account;
    const stripe = await getUncachableStripeClient();
    const currentAccount = await stripe.accounts.retrieve(eventAccount.id);
    await syncLegacyMerchantAccount(currentAccount, {
      id: event.id,
      created: event.created,
    });
  } else if (event.type.startsWith("payment_intent.")) {
    await handlePaymentIntentWebhook(event);
  }
}

export async function processStripeV2Webhook(
  payload: Buffer,
  signature: string,
) {
  if (!Buffer.isBuffer(payload)) {
    throw new Error("Stripe v2 webhook payload must be a Buffer");
  }
  const secret = process.env.STRIPE_V2_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_V2_WEBHOOK_SECRET is required");
  }

  const stripe = await getUncachableStripeClient();
  const event = stripe.parseEventNotification(
    payload,
    signature,
    secret,
  ) as unknown as Record<string, any>;
  const accountId = accountIdFromEvent(event);
  if (!accountId || !event.type.startsWith("v2.core.account")) return;

  const account = await stripe.v2.core.accounts.retrieve(
    accountId,
    { include: [...accountLookupIncludes] },
    { apiVersion: STRIPE_V2_API_VERSION },
  );
  await syncMerchantAccount(account, {
    id: String(event.id),
    created: String(event.created),
  });
}