import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db, merchantsTable, orderTransactionsTable } from "@workspace/db";
import { getUncachableStripeClient } from "./stripe-client";

/**
 * Sixth Front money flow: Stripe Direct Charges with commission collected via
 * application_fee_amount on every PaymentIntent. No Transfers API — ever.
 * The platform never holds merchant funds; Stripe settles the order total to
 * the merchant's connected account minus the platform application fee.
 */

export type OrderServiceType = "food" | "merch" | "bundle" | "qr" | "landing";

// Commission rates, per the accepted Pricing Schedule:
// food / qr / landing → 8%, merch → 12%, bundle → 8% (food is the primary component).
const SERVICE_FEE_RATES: Record<OrderServiceType, number> = {
  food: 0.08,
  qr: 0.08,
  landing: 0.08,
  merch: 0.12,
  bundle: 0.08,
};

const VALID_SERVICE_TYPES = new Set<string>(Object.keys(SERVICE_FEE_RATES));

export class InvalidServiceTypeError extends Error {
  constructor(serviceType: string) {
    super(`Unsupported service type for checkout: ${serviceType}`);
    this.name = "InvalidServiceTypeError";
  }
}

export class MerchantNotChargeableError extends Error {
  constructor(merchantId: string) {
    super(`Merchant ${merchantId} cannot accept direct charges yet.`);
    this.name = "MerchantNotChargeableError";
  }
}

/**
 * Integer math only: applicationFeeCents = Math.round(orderTotalCents * rate).
 */
export function applicationFeeFor(
  serviceType: OrderServiceType,
  orderTotalCents: number,
): number {
  const rate = SERVICE_FEE_RATES[serviceType];
  if (rate === undefined) throw new InvalidServiceTypeError(serviceType);
  if (!Number.isInteger(orderTotalCents) || orderTotalCents <= 0) {
    throw new Error("orderTotalCents must be a positive integer");
  }
  return Math.round(orderTotalCents * rate);
}

export function isOrderServiceType(value: string): value is OrderServiceType {
  return VALID_SERVICE_TYPES.has(value);
}

async function chargeableMerchant(merchantId: string) {
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, merchantId))
    .limit(1);

  if (!merchant) throw new MerchantNotChargeableError(merchantId);
  if (!merchant.stripeConnectedAccountId || !merchant.stripeChargesEnabled) {
    throw new MerchantNotChargeableError(merchantId);
  }
  return merchant;
}

export type CreateOrderCheckoutInput = {
  merchantId: string;
  serviceType: OrderServiceType;
  orderTotalCents: number;
  currency?: string;
  metadata?: Record<string, string>;
};

/**
 * Creates a Direct Charge PaymentIntent on the merchant's connected account
 * with the platform commission attached as application_fee_amount.
 */
export async function createOrderCheckout(input: CreateOrderCheckoutInput) {
  const merchant = await chargeableMerchant(input.merchantId);
  const currency = (input.currency ?? "usd").toLowerCase();
  const applicationFeeCents = applicationFeeFor(
    input.serviceType,
    input.orderTotalCents,
  );

  const stripe = await getUncachableStripeClient();
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: input.orderTotalCents,
      currency,
      application_fee_amount: applicationFeeCents,
      automatic_payment_methods: { enabled: true },
      metadata: {
        sixth_front_service_type: input.serviceType,
        sixth_front_merchant_id: merchant.id,
        ...(input.metadata ?? {}),
      },
    },
    { stripeAccount: merchant.stripeConnectedAccountId! },
  );

  const [transaction] = await db
    .insert(orderTransactionsTable)
    .values({
      merchantId: merchant.id,
      stripePaymentIntentId: paymentIntent.id,
      stripeConnectedAccountId: merchant.stripeConnectedAccountId!,
      orderTotalCents: input.orderTotalCents,
      applicationFeeCents,
      serviceType: input.serviceType,
      currency,
      status: "pending",
      stripeStatus: paymentIntent.status,
    })
    .returning();

  return { paymentIntent, transaction };
}

/**
 * Records the latest Stripe status for a PaymentIntent that belongs to a
 * tracked order transaction. Safe to call from webhook handlers; unknown
 * PaymentIntents are ignored.
 */
export async function syncOrderTransactionFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
) {
  const status = paymentIntent.status === "succeeded" ? "paid" : "pending";
  await db
    .update(orderTransactionsTable)
    .set({ status, stripeStatus: paymentIntent.status })
    .where(eq(orderTransactionsTable.stripePaymentIntentId, paymentIntent.id));
}
