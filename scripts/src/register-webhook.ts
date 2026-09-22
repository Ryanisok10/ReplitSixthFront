import Stripe from "stripe";

const webhookUrl =
  "https://oblong-frank-category.replit.app/api/stripe/v2/webhook";
const enabledEvents: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.created",
];

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

const stripe = new Stripe(secretKey);
const existingEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const existingEndpoint = existingEndpoints.data.find(
  (endpoint) => endpoint.url === webhookUrl,
);

if (existingEndpoint) {
  console.log(
    JSON.stringify(
      {
        status: "already_exists",
        id: existingEndpoint.id,
        enabledEvents: existingEndpoint.enabled_events,
      },
      null,
      2,
    ),
  );
} else {
  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: enabledEvents,
    connect: false,
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        id: endpoint.id,
        url: endpoint.url,
        enabledEvents: endpoint.enabled_events,
        connect: endpoint.connect,
      },
      null,
      2,
    ),
  );
}