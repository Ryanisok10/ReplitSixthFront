import { eq } from "drizzle-orm";
import { db, merchantsTable, orderTransactionsTable } from "@workspace/db";
import { getUncachableStripeClient } from "./stripe-client";
import type Stripe from "stripe";

const SERVICE_FEE_RATES: Record<string, number> = {
  food: 0.08,
  qr: 0.08,
  landing: 0.08,
  merch: 0.12,
  bundle: 0.08,
};

export async function createOrderTransaction(params: {
  merchantId: string;
  orderTotalCents: number;
  serviceType: string;
  currency?: string;
}) {
  const { merchantId, orderTotalCents, serviceType, currency = "usd" } = params;

  const rate = SERVICE_FEE_RATES[serviceType];
  if (rate === undefined) {
    throw new Error(`Invalid service type: ${serviceType}`);
  }

  const applicationFeeCents = Math.round(orderTotalCents * rate);

  // Retrieve the merchant's connected account ID
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, merchantId))
    .limit(1);

  if (!merchant) {
    throw new Error(`Merchant not found: ${merchantId}`);
  }

  if (!merchant.stripeConnectedAccountId) {
    throw new Error(`Merchant ${merchantId} does not have a Stripe connected account`);
  }

  if (!merchant.stripeChargesEnabled) {
    throw new Error(`Merchant ${merchantId} is not ready to accept payments`);
  }

  const stripe = await getUncachableStripeClient();

  // Create direct charge PaymentIntent on the connected account
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: orderTotalCents,
      currency,
      application_fee_amount: applicationFeeCents,
      automatic_payment_methods: { enabled: true },
    },
    {
      stripeAccount: merchant.stripeConnectedAccountId,
    }
  );

  // Insert the pending transaction record
  const [transaction] = await db
    .insert(orderTransactionsTable)
    .values({
      merchantId,
      stripePaymentIntentId: paymentIntent.id,
      stripeConnectedAccountId: merchant.stripeConnectedAccountId,
      orderTotalCents,
      applicationFeeCents,
      serviceType,
      currency,
      status: "pending",
      stripeStatus: paymentIntent.status,
    })
    .returning();

  return { transaction, paymentIntent };
}

export async function handlePaymentIntentWebhook(event: Stripe.Event) {
  if (event.type.startsWith("payment_intent.")) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    let status = "pending";
    if (paymentIntent.status === "succeeded") {
      status = "paid";
    } else if (paymentIntent.status === "canceled") {
      status = "canceled";
    } else if (
      paymentIntent.status === "requires_payment_method" ||
      paymentIntent.status === "requires_action"
    ) {
      status = "failed";
    } else if (paymentIntent.status === "processing") {
      status = "processing";
    }

    const [updated] = await db
      .update(orderTransactionsTable)
      .set({
        status,
        stripeStatus: paymentIntent.status,
        updatedAt: new Date(),
      })
      .where(eq(orderTransactionsTable.stripePaymentIntentId, paymentIntent.id))
      .returning();

    return updated;
  }
  return null;
}

export async function getOrderTransaction(id: string) {
  const [transaction] = await db
    .select()
    .from(orderTransactionsTable)
    .where(eq(orderTransactionsTable.id, id))
    .limit(1);
  return transaction;
}

export async function getOrderTransactionByPaymentIntentId(stripePaymentIntentId: string) {
  const [transaction] = await db
    .select()
    .from(orderTransactionsTable)
    .where(eq(orderTransactionsTable.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return transaction;
}

export async function listOrderTransactions(merchantId: string) {
  return db
    .select()
    .from(orderTransactionsTable)
    .where(eq(orderTransactionsTable.merchantId, merchantId));
}
