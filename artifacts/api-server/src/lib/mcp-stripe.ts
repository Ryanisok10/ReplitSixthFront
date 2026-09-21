import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripe-client";

export const STRIPE_V2_API_VERSION = "2026-08-26.preview";

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

export async function getStripeV2Destination(domain: string) {
  const stripe = await getUncachableStripeClient();
  const url = `https://${domain}/api/stripe/v2/webhook`;
  const destinations =
    await stripe.v2.core.eventDestinations.list(
      { include: ["webhook_endpoint.url"] },
      { apiVersion: STRIPE_V2_API_VERSION },
    );
  return {
    expectedUrl: url,
    destination: destinations.data.find(
      (destination) => destination.webhook_endpoint?.url === url,
    ),
  };
}