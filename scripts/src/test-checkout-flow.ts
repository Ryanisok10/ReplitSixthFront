import { and, eq, isNotNull } from "drizzle-orm";
import { db, merchantsTable } from "@workspace/db";
import { createOrderTransaction } from "../../artifacts/api-server/src/lib/order-service";

const [merchant] = await db
  .select({
    id: merchantsTable.id,
    stripeConnectedAccountId: merchantsTable.stripeConnectedAccountId,
  })
  .from(merchantsTable)
  .where(
    and(
      isNotNull(merchantsTable.stripeConnectedAccountId),
      eq(merchantsTable.stripeChargesEnabled, true),
    ),
  )
  .limit(1);

if (!merchant?.stripeConnectedAccountId) {
  throw new Error("No test merchant with an enabled Stripe connected account was found");
}

if (!merchant.stripeConnectedAccountId.startsWith("acct_")) {
  throw new Error("The selected merchant does not have a valid Stripe connected account");
}

const result = await createOrderTransaction({
  merchantId: merchant.id,
  orderTotalCents: 2500,
  serviceType: "food",
  currency: "usd",
});

console.log(
  JSON.stringify(
    {
      transaction: result.transaction,
      paymentIntent: {
        id: result.paymentIntent.id,
        status: result.paymentIntent.status,
        amount: result.paymentIntent.amount,
        applicationFeeAmount: result.paymentIntent.application_fee_amount,
        connectedAccount: merchant.stripeConnectedAccountId,
      },
    },
    null,
    2,
  ),
);