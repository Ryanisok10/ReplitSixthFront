import { db, merchantsTable } from "@workspace/db";

const stripeConnectedAccountId = "acct_1UI0yA3B5qyVeGBL";

const [merchant] = await db
  .insert(merchantsTable)
  .values({
    ownerName: "Development Test Merchant",
    email: "test-merchant@example.invalid",
    phone: "0000000000",
    businessName: "Sixth Front Development Test Merchant",
    address: "Development sandbox",
    websiteType: "test",
    monthlyOrderVolume: "test",
    selectedServices: ["food", "merch"],
    status: "test",
    stripeConnectedAccountId,
    stripeOnboardingStatus: "complete",
    stripeDetailsSubmitted: true,
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
    stripeCardPaymentsStatus: "active",
    stripeBalancePayoutsStatus: "active",
  })
  .onConflictDoUpdate({
    target: merchantsTable.stripeConnectedAccountId,
    set: {
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      updatedAt: new Date(),
    },
  })
  .returning();

console.log(JSON.stringify(merchant, null, 2));