import Stripe from "stripe";

const STRIPE_V2_API_VERSION = "2026-08-26.preview";
const TARGET_DOMAIN = "oblong-frank-category.replit.app";
const REQUIRED_EVENTS = [
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

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

const stripe = new Stripe(secretKey);
const destinations = await stripe.v2.core.eventDestinations.list(
  { include: ["webhook_endpoint.url"] },
  { apiVersion: STRIPE_V2_API_VERSION },
);
const destination = destinations.data.find(
  (candidate) =>
    candidate.event_payload === "thin" &&
    candidate.webhook_endpoint?.url?.includes(TARGET_DOMAIN),
);

if (!destination) {
  throw new Error(`No Stripe v2 event destination found for ${TARGET_DOMAIN}`);
}

const enabledEvents = Array.from(
  new Set([...(destination.enabled_events ?? []), ...REQUIRED_EVENTS]),
);
const updated = await stripe.v2.core.eventDestinations.update(
  destination.id,
  {
    enabled_events: enabledEvents,
    include: ["webhook_endpoint.url"],
  },
  { apiVersion: STRIPE_V2_API_VERSION },
);

console.log(JSON.stringify(updated, null, 2));