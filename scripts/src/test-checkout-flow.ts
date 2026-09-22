import { createOrderTransaction } from "../../artifacts/api-server/src/lib/order-service";

const merchantId = "ac3b680a-35cd-4c3c-93df-3454f07271bc";

const foodResult = await createOrderTransaction({
  merchantId,
  orderTotalCents: 2500,
  serviceType: "food",
  currency: "usd",
});

const merchResult = await createOrderTransaction({
  merchantId,
  orderTotalCents: 5000,
  serviceType: "merch",
  currency: "usd",
});

const results = [
  {
    test: "food",
    paymentIntentId: foodResult.paymentIntent.id,
    orderTotalCents: foodResult.transaction.orderTotalCents,
    applicationFeeCents: foodResult.transaction.applicationFeeCents,
    rateUsed: "8%",
    expectedApplicationFeeCents: 200,
  },
  {
    test: "merch",
    paymentIntentId: merchResult.paymentIntent.id,
    orderTotalCents: merchResult.transaction.orderTotalCents,
    applicationFeeCents: merchResult.transaction.applicationFeeCents,
    rateUsed: "12%",
    expectedApplicationFeeCents: 600,
  },
].map((result) => ({
  ...result,
  result:
    result.applicationFeeCents === result.expectedApplicationFeeCents
      ? "PASS"
      : "FAIL",
}));

for (const result of results) {
  console.log(JSON.stringify(result, null, 2));
}

if (results.some((result) => result.result === "FAIL")) {
  throw new Error("One or more checkout fee assertions failed");
}