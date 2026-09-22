import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agreementVersionsTable = pgTable("agreement_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: text("version").notNull().unique(),
  isDraft: boolean("is_draft").notNull().default(true),
  isActive: boolean("is_active").notNull().default(false),
  merchantServicesTitle: text("merchant_services_title").notNull(),
  merchantServicesContent: text("merchant_services_content").notNull(),
  pricingScheduleTitle: text("pricing_schedule_title").notNull(),
  pricingScheduleContent: text("pricing_schedule_content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referenceCodeDealsTable = pgTable(
  "reference_code_deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull().unique(),
    codeLabel: text("code_label").notNull(),
    dealName: text("deal_name").notNull(),
    expectedEmail: text("expected_email"),
    expectedBusinessName: text("expected_business_name"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    // Kept as a UUID rather than a foreign key to avoid a circular schema
    // dependency with intake_submissions.reference_code_deal_id.
    redeemedSubmissionId: uuid("redeemed_submission_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "reference_code_deals_merchant_binding_check",
      sql`${table.expectedEmail} is not null or ${table.expectedBusinessName} is not null`,
    ),
  ],
);

export const agreementAcceptancesTable = pgTable("agreement_acceptances", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  payloadHash: text("payload_hash").notNull(),
  agreementVersion: text("agreement_version").notNull(),
  accepted: boolean("accepted").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address").notNull(),
  merchantServicesSnapshot: text("merchant_services_snapshot").notNull(),
  pricingScheduleSnapshot: text("pricing_schedule_snapshot").notNull(),
  agreementSnapshot: jsonb("agreement_snapshot").notNull(),
  fullFormPayload: jsonb("full_form_payload").notNull(),
});

/**
 * acceptance_audit_logs — append-only (INSERT-only) evidentiary log of every legal
 * document acceptance, per the Phase 1 compliance requirement.
 *
 * This table is deliberately narrow and immutable: it stores the exact document
 * version and a SHA-256 hash of the document body that was displayed and accepted,
 * together with the client context (IP, user agent, session id) captured at the
 * moment of acceptance. It complements `agreement_acceptances` (which stores full
 * form/payload snapshots) and is intended to be the tamper-evident record of record.
 *
 * INSERT-only enforcement: UPDATE and DELETE are blocked at the database level by
 * the trigger defined in `lib/db/sql/acceptance_audit_logs_insert_only.sql`, which
 * must be applied after `drizzle-kit push` (drizzle-kit does not manage triggers).
 */
export const acceptanceAuditLogsTable = pgTable("acceptance_audit_logs", {
  recordId: uuid("record_id").primaryKey().defaultRandom(),
  merchantId: uuid("merchant_id"),
  documentType: text("document_type").notNull(),
  documentVersion: text("document_version").notNull(),
  // SHA-256 hex digest of the exact document body that was displayed and accepted.
  documentHash: text("document_hash").notNull(),
  acceptanceTimestampUtc: timestamp("acceptance_timestamp_utc", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
});

export const merchantsTable = pgTable("merchants", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  businessName: text("business_name").notNull(),
  address: text("address").notNull(),
  websiteType: text("website_type").notNull(),
  monthlyOrderVolume: text("monthly_order_volume").notNull(),
  selectedServices: text("selected_services").array().notNull(),
  status: text("status").notNull(),
  termsStatus: text("terms_status"),
  standardTermsAcceptedAt: timestamp("standard_terms_accepted_at", {
    withTimezone: true,
  }),
  acceptanceId: uuid("acceptance_id").references(() => agreementAcceptancesTable.id),
  stripeConnectedAccountId: text("stripe_connected_account_id").unique(),
  stripeOnboardingAccessTokenHash: text("stripe_onboarding_access_token_hash"),
  stripeOnboardingStatus: text("stripe_onboarding_status")
    .notNull()
    .default("not_started"),
  stripeDetailsSubmitted: boolean("stripe_details_submitted")
    .notNull()
    .default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled")
    .notNull()
    .default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled")
    .notNull()
    .default(false),
  stripeCardPaymentsStatus: text("stripe_card_payments_status"),
  stripeBalancePayoutsStatus: text("stripe_balance_payouts_status"),
  // Retained for rows created by the legacy onboarding implementation.
  stripeTransfersStatus: text("stripe_transfers_status"),
  stripeLastEventId: text("stripe_last_event_id"),
  stripeLastEventCreatedAt: timestamp("stripe_last_event_created_at", {
    withTimezone: true,
  }),
  stripeProvisionedAt: timestamp("stripe_provisioned_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const intakeSubmissionsTable = pgTable("intake_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: uuid("idempotency_key").notNull().unique(),
  payloadHash: text("payload_hash").notNull(),
  flowType: text("flow_type").notNull(),
  status: text("status").notNull(),
  payload: jsonb("payload").notNull(),
  selectedServices: text("selected_services").array().notNull(),
  referenceCodeValue: text("reference_code_value"),
  referenceCodeDealId: uuid("reference_code_deal_id").references(
    () => referenceCodeDealsTable.id,
  ),
  merchantId: uuid("merchant_id").references(() => merchantsTable.id),
  acceptanceId: uuid("acceptance_id").references(() => agreementAcceptancesTable.id),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referenceCodeAttemptsTable = pgTable("reference_code_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  flowType: text("flow_type").notNull(),
  codeHash: text("code_hash").notNull(),
  result: text("result").notNull(),
  referenceCodeDealId: uuid("reference_code_deal_id").references(
    () => referenceCodeDealsTable.id,
  ),
  submissionId: uuid("submission_id").references(() => intakeSubmissionsTable.id),
  intendedEmail: text("intended_email").notNull(),
  intendedBusinessName: text("intended_business_name").notNull(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stripeAccountWebhookEventsTable = pgTable(
  "stripe_account_webhook_events",
  {
    eventId: text("event_id").primaryKey(),
    stripeAccountId: text("stripe_account_id").notNull(),
    eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const orderTransactionsTable = pgTable('order_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull().references(() => merchantsTable.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  stripeConnectedAccountId: text('stripe_connected_account_id').notNull(),
  orderTotalCents: integer('order_total_cents').notNull(),
  applicationFeeCents: integer('application_fee_cents').notNull(),
  serviceType: text('service_type').notNull(),
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('pending'),
  stripeStatus: text('stripe_status'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderTransactionSchema = createInsertSchema(orderTransactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrderTransaction = z.infer<typeof insertOrderTransactionSchema>;
export type OrderTransaction = typeof orderTransactionsTable.$inferSelect;

export const insertAgreementVersionSchema = createInsertSchema(
  agreementVersionsTable,
).omit({ id: true, createdAt: true });
export type InsertAgreementVersion = z.infer<typeof insertAgreementVersionSchema>;
export type AgreementVersion = typeof agreementVersionsTable.$inferSelect;

export const insertReferenceCodeDealSchema = createInsertSchema(
  referenceCodeDealsTable,
).omit({ id: true, createdAt: true });
export type InsertReferenceCodeDeal = z.infer<typeof insertReferenceCodeDealSchema>;
export type ReferenceCodeDeal = typeof referenceCodeDealsTable.$inferSelect;

export const insertAgreementAcceptanceSchema = createInsertSchema(
  agreementAcceptancesTable,
).omit({ id: true, acceptedAt: true });
export type InsertAgreementAcceptance = z.infer<
  typeof insertAgreementAcceptanceSchema
>;
export type AgreementAcceptance = typeof agreementAcceptancesTable.$inferSelect;

export const insertAcceptanceAuditLogSchema = createInsertSchema(
  acceptanceAuditLogsTable,
).omit({ recordId: true, acceptanceTimestampUtc: true });
export type InsertAcceptanceAuditLog = z.infer<
  typeof insertAcceptanceAuditLogSchema
>;
export type AcceptanceAuditLog = typeof acceptanceAuditLogsTable.$inferSelect;

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchantsTable.$inferSelect;

export const insertIntakeSubmissionSchema = createInsertSchema(
  intakeSubmissionsTable,
).omit({ id: true, createdAt: true });
export type InsertIntakeSubmission = z.infer<
  typeof insertIntakeSubmissionSchema
>;
export type IntakeSubmission = typeof intakeSubmissionsTable.$inferSelect;

export const insertReferenceCodeAttemptSchema = createInsertSchema(
  referenceCodeAttemptsTable,
).omit({ id: true, createdAt: true });
export type InsertReferenceCodeAttempt = z.infer<
  typeof insertReferenceCodeAttemptSchema
>;
export type ReferenceCodeAttempt = typeof referenceCodeAttemptsTable.$inferSelect;
