import { and, eq, ne } from "drizzle-orm";
import { agreementVersionsTable, db, pool } from "@workspace/db";
import { DEFAULT_AGREEMENT } from "./merchant-intake";
import { logger } from "./logger";
import {
  createStripeV2EventDestination,
  ensureStripeV2EventDestination,
} from "./stripe-webhooks";

/**
 * Idempotent: ensures MSA-2026-09-11-v2.0 is the single active agreement.
 * Upserts the v2.0 row, then deactivates every other active row (e.g. the
 * DRAFT that contains a $99 setup fee).
 */
export async function bootEnsureAgreement(): Promise<void> {
  await db.transaction(async (tx) => {
    // Upsert the canonical v2.0 row.
    await tx
      .insert(agreementVersionsTable)
      .values({ ...DEFAULT_AGREEMENT, isActive: true, isDraft: false })
      .onConflictDoUpdate({
        target: agreementVersionsTable.version,
        set: { isActive: true, isDraft: false },
      });

    // Deactivate every other active agreement (e.g. the DRAFT).
    await tx
      .update(agreementVersionsTable)
      .set({ isActive: false })
      .where(
        and(
          eq(agreementVersionsTable.isActive, true),
          ne(agreementVersionsTable.version, DEFAULT_AGREEMENT.version),
        ),
      );
  });

  logger.info(
    { version: DEFAULT_AGREEMENT.version },
    "Active merchant agreement ensured",
  );
}

/**
 * Idempotent: applies INSERT-only triggers on acceptance_audit_logs.
 * Uses a raw pg client because DDL (CREATE TRIGGER) must run outside a
 * drizzle-managed transaction and cannot be batched via drizzle.execute().
 */
export async function applyDatabaseConstraints(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION acceptance_audit_logs_block_mutation()
        RETURNS trigger
        LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION
          'acceptance_audit_logs is append-only; % is not permitted', TG_OP
          USING ERRCODE = 'restrict_violation';
      END;
      $$;

      DROP TRIGGER IF EXISTS trg_acceptance_audit_logs_no_update ON acceptance_audit_logs;
      DROP TRIGGER IF EXISTS trg_acceptance_audit_logs_no_delete ON acceptance_audit_logs;

      CREATE TRIGGER trg_acceptance_audit_logs_no_update
        BEFORE UPDATE ON acceptance_audit_logs
        FOR EACH ROW EXECUTE FUNCTION acceptance_audit_logs_block_mutation();

      CREATE TRIGGER trg_acceptance_audit_logs_no_delete
        BEFORE DELETE ON acceptance_audit_logs
        FOR EACH ROW EXECUTE FUNCTION acceptance_audit_logs_block_mutation();
    `);
    logger.info("acceptance_audit_logs INSERT-only triggers applied");
  } finally {
    client.release();
  }
}

/**
 * Ensures the Stripe v2 event destination exists for the given domain.
 * If missing, creates it and logs the signing secret to stderr with an
 * ACTION REQUIRED banner — operator must copy it to STRIPE_V2_WEBHOOK_SECRET
 * and restart the server.
 */
export async function setupStripeV2Destination(domain: string): Promise<void> {
  try {
    await ensureStripeV2EventDestination(domain);
    logger.info("Stripe v2 event destination verified");
  } catch {
    logger.warn("Stripe v2 event destination not found — creating it now...");
    const result = await createStripeV2EventDestination(domain);
    const secret =
      result.webhook_endpoint?.signing_secret ?? "(secret not returned)";
    process.stderr.write(
      `\n${"=".repeat(72)}\n` +
        `ACTION REQUIRED: Stripe v2 event destination was just created.\n` +
        `Copy the signing secret below into STRIPE_V2_WEBHOOK_SECRET,\n` +
        `then restart the server.\n\n` +
        `  STRIPE_V2_WEBHOOK_SECRET=${secret}\n\n` +
        `This secret is shown ONCE and cannot be retrieved again.\n` +
        `${"=".repeat(72)}\n\n`,
    );
    logger.info(
      { destinationId: result.id },
      "Stripe v2 event destination created — see stderr for signing secret",
    );
  }
}
