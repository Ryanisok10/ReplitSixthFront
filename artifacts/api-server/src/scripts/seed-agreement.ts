/**
 * Seed / activate the finalized Master Merchant Services Agreement (MSA v2.0).
 *
 * The agreement served to merchants at signup is DB-backed: `getActiveAgreement()`
 * returns the row in `agreement_versions` where `is_active = true`. Editing the
 * DEFAULT_AGREEMENT constant in code is therefore NOT enough — an active row for the
 * new version must exist in the database, and any previously active (e.g. DRAFT) rows
 * must be deactivated.
 *
 * Run once after deploying this change (requires DATABASE_URL):
 *   pnpm --filter @workspace/api-server seed:agreement
 *
 * The operation is idempotent: it upserts the MSA v2.0 row by version and ensures it
 * is the only active agreement.
 */
import { eq, ne } from "drizzle-orm";
import { agreementVersionsTable, db, pool } from "@workspace/db";
import { DEFAULT_AGREEMENT } from "../lib/merchant-intake";

async function main() {
  const {
    version,
    isDraft,
    merchantServicesTitle,
    merchantServicesContent,
    pricingScheduleTitle,
    pricingScheduleContent,
  } = DEFAULT_AGREEMENT;

  await db.transaction(async (tx) => {
    // Upsert the finalized agreement row by version.
    await tx
      .insert(agreementVersionsTable)
      .values({
        version,
        isDraft,
        isActive: true,
        merchantServicesTitle,
        merchantServicesContent,
        pricingScheduleTitle,
        pricingScheduleContent,
      })
      .onConflictDoUpdate({
        target: agreementVersionsTable.version,
        set: {
          isDraft,
          isActive: true,
          merchantServicesTitle,
          merchantServicesContent,
          pricingScheduleTitle,
          pricingScheduleContent,
        },
      });

    // Ensure this is the ONLY active agreement.
    await tx
      .update(agreementVersionsTable)
      .set({ isActive: false })
      .where(ne(agreementVersionsTable.version, version));

    await tx
      .update(agreementVersionsTable)
      .set({ isActive: true })
      .where(eq(agreementVersionsTable.version, version));
  });

  console.log(
    `Activated agreement ${version} (isDraft=${isDraft}); all other versions deactivated.`,
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Failed to seed agreement:", error);
    await pool.end();
    process.exit(1);
  });
