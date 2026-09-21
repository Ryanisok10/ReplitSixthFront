import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type {
  AgreementBundle,
  IntakeResult,
  PreviewLeadInput,
  SignupReferenceCodeInput,
  StandardSignupInput,
} from "@workspace/api-zod";
import {
  acceptanceAuditLogsTable,
  agreementAcceptancesTable,
  agreementVersionsTable,
  db,
  intakeSubmissionsTable,
  merchantsTable,
  referenceCodeAttemptsTable,
  referenceCodeDealsTable,
} from "@workspace/db";
import { provisionMerchantOnboarding } from "./merchant-onboarding";

const CUSTOM_AGREEMENT_MESSAGE =
  "Thanks — we've got your info. Your custom agreement will be emailed to you shortly for review and signature.";
const INVALID_CODE_MESSAGE =
  "Code not recognized — continuing with standard signup.";
const PREVIEW_RECEIVED_MESSAGE =
  "Thanks — your free storefront preview request has been received.";
const STANDARD_SIGNUP_MESSAGE =
  "Your storefront setup has started — check your email to complete payment account setup.";

export class PaymentOnboardingError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "Your merchant record was saved, but payment onboarding could not be started. Please retry.",
      options,
    );
    this.name = "PaymentOnboardingError";
  }
}

export class IntakeConflictError extends Error {
  constructor() {
    super("This submission key was already used for different information.");
    this.name = "IntakeConflictError";
  }
}

export const DEFAULT_AGREEMENT = {
  version: "MSA-2026-09-11-v2.0",
  isDraft: false,
  isActive: true,
  merchantServicesTitle: "Master Merchant Services Agreement",
  merchantServicesContent: `Master Merchant Services Agreement — Version 2.0 (dated September 11, 2026)

These are the current attorney-approved standard operating terms that apply when a Sixth Front merchant creates a storefront. This on-screen summary reflects the Master Merchant Services Agreement, Version 2.0 (dated September 11, 2026).

1. Services. Sixth Front will create and support the digital storefront services selected during signup. Availability, launch timing, and third-party services may depend on the merchant supplying complete and accurate business information.

2. Merchant responsibilities. The merchant is responsible for the accuracy of its menu, products, prices, tax settings, fulfillment information, customer service, and compliance with applicable laws.

3. Payment processing. Card payments will be processed by an independent payment processor under that processor's terms. Processor fees are deducted by the processor. Funds settle directly to the merchant's connected account, subject to the processor's review, holds, and payout schedule.

4. Sixth Front fees. Sixth Front may deduct the commissions and recurring fees shown in the accepted Pricing Schedule. There is no setup fee. Sixth Front's commission and the payment processor's disclosed fee are the only transaction-based costs stated in these standard terms.

5. Term and cancellation. Standard service is month-to-month unless a signed custom agreement says otherwise. Either party may end service on written notice, subject to outstanding obligations and third-party processing requirements.

6. Electronic records. By checking the acceptance box and submitting signup, the merchant confirms that it reviewed the Master Merchant Services Agreement, Version 2.0 (dated September 11, 2026), and the Pricing Schedule, agrees to be bound by them, and agrees to receive records electronically.`,
  pricingScheduleTitle: "Pricing Schedule",
  pricingScheduleContent: `Pricing Schedule — Master Merchant Services Agreement, Version 2.0 (dated September 11, 2026)

There is no setup fee. The service selection submitted with signup controls which of the following standard prices apply:

• Branded Food Ordering: 8% per processed food order, plus the card processor's standard fee. No setup fee.
• Branded Merch Ordering: 12% per merchandise sale, plus the card processor's standard fee. No setup fee.
• Food + Merch Bundle: 8% on processed food orders and 12% on merchandise sales, plus the card processor's standard fee on each applicable transaction. No setup fee.
• Custom Landing Page: $39 per month. No ordering is included. No setup fee. This custom web page is included free when bundled with Branded Food Ordering, Branded Merch Ordering, or the Food + Merch Bundle.

The card processor's current standard fee is 2.9% + 30¢ per card transaction. Processor pricing and settlement are governed by the processor's terms and may change if the processor updates them.`,
} as const;

type ReferenceCodeResult = {
  status: "valid" | "invalid" | "expired" | "mismatched";
  codeValue: string;
  dealId: string | null;
};

type ReferenceCodeAttemptResult =
  | ReferenceCodeResult["status"]
  | "used"
  | "invalid_payload";

const normalizeText = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const normalizeEmail = (value: string) => normalizeText(value).toLowerCase();

const normalizeBusinessName = (value: string) =>
  normalizeText(value).toLowerCase();

const normalizeReferenceCode = (value: string) =>
  normalizeText(value).toUpperCase();

const hashReferenceCode = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const normalizeServices = <T extends string>(services: T[]) =>
  [...new Set(services)].sort();

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
};

const hashPayload = (payload: unknown) =>
  createHash("sha256")
    .update(JSON.stringify(canonicalize(payload)))
    .digest("hex");

const assertPayloadMatches = (
  storedPayloadHash: string,
  incomingPayloadHash: string,
) => {
  if (storedPayloadHash !== incomingPayloadHash) {
    throw new IntakeConflictError();
  }
};

const normalizeBasics = (basics: StandardSignupInput["basics"]) => ({
  ownerName: normalizeText(basics.ownerName),
  email: normalizeEmail(basics.email),
  phone: normalizeText(basics.phone),
  businessName: normalizeText(basics.businessName),
  address: normalizeText(basics.address),
  websiteType: normalizeText(basics.websiteType),
  monthlyOrderVolume: normalizeText(basics.monthlyOrderVolume),
});

const resultForExistingSubmission = (
  submission: typeof intakeSubmissionsTable.$inferSelect,
): IntakeResult => {
  const isCustom = submission.status === "awaiting_signature";

  return {
    outcome: isCustom ? "custom_deal" : "standard",
    status: isCustom
      ? "awaiting_signature"
      : submission.status === "awaiting_payment_setup"
        ? "awaiting_payment_setup"
        : "preview_received",
    message: isCustom
      ? CUSTOM_AGREEMENT_MESSAGE
      : submission.status === "awaiting_payment_setup"
        ? STANDARD_SIGNUP_MESSAGE
        : PREVIEW_RECEIVED_MESSAGE,
    codeStatus: isCustom ? "valid" : "none",
    submissionId: submission.id,
    merchantId: submission.merchantId,
  };
};

const withPaymentOnboarding = async (result: IntakeResult): Promise<IntakeResult> => {
  if (!result.merchantId) throw new Error("Standard merchant record is missing");
  try {
    const onboarding = await provisionMerchantOnboarding(result.merchantId);
    return { ...result, message: STANDARD_SIGNUP_MESSAGE, ...onboarding };
  } catch (error) {
    throw new PaymentOnboardingError({ cause: error });
  }
};

const getExistingSubmission = async (idempotencyKey: string) => {
  const [submission] = await db
    .select()
    .from(intakeSubmissionsTable)
    .where(eq(intakeSubmissionsTable.idempotencyKey, idempotencyKey))
    .limit(1);

  return submission;
};

export const getActiveAgreement = async (): Promise<AgreementBundle> => {
  const [activeAgreement] = await db
    .select()
    .from(agreementVersionsTable)
    .where(eq(agreementVersionsTable.isActive, true))
    .orderBy(desc(agreementVersionsTable.createdAt))
    .limit(1);

  if (activeAgreement) {
    return {
      version: activeAgreement.version,
      isDraft: activeAgreement.isDraft,
      merchantServicesTitle: activeAgreement.merchantServicesTitle,
      merchantServicesContent: activeAgreement.merchantServicesContent,
      pricingScheduleTitle: activeAgreement.pricingScheduleTitle,
      pricingScheduleContent: activeAgreement.pricingScheduleContent,
    };
  }

  await db
    .insert(agreementVersionsTable)
    .values(DEFAULT_AGREEMENT)
    .onConflictDoNothing({ target: agreementVersionsTable.version });

  const [bootstrappedAgreement] = await db
    .select()
    .from(agreementVersionsTable)
    .where(eq(agreementVersionsTable.version, DEFAULT_AGREEMENT.version))
    .limit(1);

  if (!bootstrappedAgreement || !bootstrappedAgreement.isActive) {
    throw new Error("No active merchant agreement is configured");
  }

  return {
    version: bootstrappedAgreement.version,
    isDraft: bootstrappedAgreement.isDraft,
    merchantServicesTitle: bootstrappedAgreement.merchantServicesTitle,
    merchantServicesContent: bootstrappedAgreement.merchantServicesContent,
    pricingScheduleTitle: bootstrappedAgreement.pricingScheduleTitle,
    pricingScheduleContent: bootstrappedAgreement.pricingScheduleContent,
  };
};

const referenceCodeStatus = (
  deal: typeof referenceCodeDealsTable.$inferSelect | undefined,
  businessName: string,
  email: string,
): ReferenceCodeResult["status"] => {
  if (!deal?.active || deal.redeemedAt) return "invalid";

  const sixtyDaysAfterIssue = new Date(
    deal.issuedAt.getTime() + 60 * 24 * 60 * 60 * 1000,
  );
  const effectiveExpiry =
    deal.expiresAt < sixtyDaysAfterIssue ? deal.expiresAt : sixtyDaysAfterIssue;
  if (new Date() > effectiveExpiry) return "expired";

  const emailMatches =
    !deal.expectedEmail || normalizeEmail(deal.expectedEmail) === normalizeEmail(email);
  const businessMatches =
    !deal.expectedBusinessName ||
    normalizeBusinessName(deal.expectedBusinessName) ===
      normalizeBusinessName(businessName);
  return emailMatches && businessMatches ? "valid" : "mismatched";
};

const recordReferenceCodeAttempt = async (
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  {
    flowType,
    codeHash,
    result,
    dealId,
    submissionId,
    businessName,
    email,
    ipAddress,
  }: {
    flowType: "preview" | "signup";
    codeHash: string;
    result: ReferenceCodeAttemptResult;
    dealId: string | null;
    submissionId: string | null;
    businessName: string;
    email: string;
    ipAddress: string;
  },
) =>
  tx.insert(referenceCodeAttemptsTable).values({
    flowType,
    codeHash,
    result,
    referenceCodeDealId: dealId,
    submissionId,
    intendedEmail: email,
    intendedBusinessName: businessName,
    ipAddress,
  });

const redeemReferenceCode = async ({
  flowType,
  code,
  businessName,
  email,
  ipAddress,
  submissionValues,
}: {
  flowType: "preview" | "signup";
  code: string;
  businessName: string;
  email: string;
  ipAddress: string;
  submissionValues: Omit<
    typeof intakeSubmissionsTable.$inferInsert,
    "referenceCodeDealId"
  >;
}) => {
  const codeValue = normalizeReferenceCode(code);
  const codeHash = hashReferenceCode(codeValue);
  return db.transaction(async (tx) => {
    const [deal] = await tx
      .select()
      .from(referenceCodeDealsTable)
      .where(eq(referenceCodeDealsTable.codeHash, codeHash))
      .limit(1);
    const status = referenceCodeStatus(deal, businessName, email);
    const attemptResult: ReferenceCodeAttemptResult =
      deal?.redeemedAt ? "used" : status;

    if (status !== "valid" || !deal) {
      await recordReferenceCodeAttempt(tx, {
        flowType,
        codeHash,
        result: attemptResult,
        dealId: deal?.id ?? null,
        submissionId: null,
        businessName,
        email,
        ipAddress,
      });
      return { status, codeValue, submission: null };
    }

    // Claim with a conditional update. Only one concurrent transaction can
    // transition a deal from unredeemed to redeemed.
    const [claimed] = await tx
      .update(referenceCodeDealsTable)
      .set({ redeemedAt: new Date() })
      .where(
        and(
          eq(referenceCodeDealsTable.id, deal.id),
          isNull(referenceCodeDealsTable.redeemedAt),
        ),
      )
      .returning({ id: referenceCodeDealsTable.id });
    if (!claimed) {
      await recordReferenceCodeAttempt(tx, {
        flowType,
        codeHash,
        result: "used",
        dealId: deal.id,
        submissionId: null,
        businessName,
        email,
        ipAddress,
      });
      return { status: "invalid" as const, codeValue, submission: null };
    }

    const [submission] = await tx
      .insert(intakeSubmissionsTable)
      .values({ ...submissionValues, referenceCodeDealId: deal.id })
      .returning();
    if (!submission) throw new Error("Custom deal submission could not be created");

    await tx
      .update(referenceCodeDealsTable)
      .set({ redeemedSubmissionId: submission.id })
      .where(eq(referenceCodeDealsTable.id, deal.id));
    await recordReferenceCodeAttempt(tx, {
      flowType,
      codeHash,
      result: "valid",
      dealId: deal.id,
      submissionId: submission.id,
      businessName,
      email,
      ipAddress,
    });
    return { status: "valid" as const, codeValue, submission };
  });
};

export const recordInvalidReferenceCodeAttempt = async ({
  flowType,
  code,
  ipAddress,
  businessName = "unavailable",
  email = "unavailable",
}: {
  flowType: "preview" | "signup";
  code: string;
  ipAddress: string;
  businessName?: string;
  email?: string;
}) => {
  const codeValue = normalizeReferenceCode(code);
  if (!codeValue) {
    return;
  }

  await db.insert(referenceCodeAttemptsTable).values({
    flowType,
    codeHash: hashReferenceCode(codeValue),
    result: "invalid_payload",
    referenceCodeDealId: null,
    submissionId: null,
    intendedEmail: normalizeEmail(email),
    intendedBusinessName: normalizeBusinessName(businessName),
    ipAddress,
  });
};

const insertSubmissionIdempotently = async (
  values: typeof intakeSubmissionsTable.$inferInsert,
) => {
  const [created] = await db
    .insert(intakeSubmissionsTable)
    .values(values)
    .onConflictDoNothing({ target: intakeSubmissionsTable.idempotencyKey })
    .returning();

  if (created) {
    return created;
  }

  const existing = await getExistingSubmission(values.idempotencyKey);
  if (!existing) {
    throw new Error("Unable to resolve idempotent intake submission");
  }

  assertPayloadMatches(existing.payloadHash, values.payloadHash);
  return existing;
};

export const submitPreview = async (
  input: PreviewLeadInput,
  ipAddress: string,
): Promise<IntakeResult> => {
  const normalizedInput: PreviewLeadInput = {
    ...input,
    businessName: normalizeText(input.businessName),
    ownerName: normalizeText(input.ownerName),
    email: normalizeEmail(input.email),
    phone: normalizeText(input.phone),
    venueType: input.venueType ? normalizeText(input.venueType) : null,
    dailyOrderVolume: input.dailyOrderVolume
      ? normalizeText(input.dailyOrderVolume)
      : null,
    comments: input.comments?.trim() || null,
    referenceCode: input.referenceCode?.trim() || null,
    services: normalizeServices(input.services),
  };
  const payloadHash = hashPayload(normalizedInput);

  const existing = await getExistingSubmission(input.idempotencyKey);
  if (existing) {
    assertPayloadMatches(existing.payloadHash, payloadHash);
    return resultForExistingSubmission(existing);
  }
  const submissionValues = {
    idempotencyKey: normalizedInput.idempotencyKey,
    payloadHash,
    flowType: "preview",
    status: "awaiting_signature",
    payload: normalizedInput,
    selectedServices: normalizedInput.services,
    referenceCodeValue: normalizedInput.referenceCode
      ? normalizeReferenceCode(normalizedInput.referenceCode)
      : null,
    merchantId: null,
    acceptanceId: null,
    ipAddress,
  } satisfies Omit<
    typeof intakeSubmissionsTable.$inferInsert,
    "referenceCodeDealId"
  >;
  const redemption = normalizedInput.referenceCode
    ? await redeemReferenceCode({
        flowType: "preview",
        code: normalizedInput.referenceCode,
        businessName: normalizedInput.businessName,
        email: normalizedInput.email,
        ipAddress,
        submissionValues,
      })
    : null;
  const isCustom = redemption?.status === "valid";
  const submission = isCustom && redemption?.submission
    ? redemption.submission
    : await insertSubmissionIdempotently({
        ...submissionValues,
        status: "preview_received",
        referenceCodeValue: null,
        referenceCodeDealId: null,
      });

  return {
    outcome: isCustom ? "custom_deal" : "standard",
    status: isCustom ? "awaiting_signature" : "preview_received",
    message: isCustom ? CUSTOM_AGREEMENT_MESSAGE : PREVIEW_RECEIVED_MESSAGE,
    codeStatus: redemption?.status ?? "none",
    submissionId: submission.id,
    merchantId: null,
  };
};

export const submitSignupCode = async (
  input: SignupReferenceCodeInput,
  ipAddress: string,
): Promise<IntakeResult> => {
  const basics = normalizeBasics(input.basics);
  const normalizedPayload: SignupReferenceCodeInput = {
    ...input,
    basics,
    services: normalizeServices(input.services),
    referenceCode: normalizeReferenceCode(input.referenceCode),
  };
  const payloadHash = hashPayload(normalizedPayload);
  const existing = await getExistingSubmission(input.idempotencyKey);
  if (existing) {
    assertPayloadMatches(existing.payloadHash, payloadHash);
    return resultForExistingSubmission(existing);
  }

  const redemption = await redeemReferenceCode({
    flowType: "signup",
    code: normalizedPayload.referenceCode,
    businessName: basics.businessName,
    email: basics.email,
    ipAddress,
    submissionValues: {
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      flowType: "signup",
      status: "awaiting_signature",
      payload: normalizedPayload,
      selectedServices: normalizedPayload.services,
      referenceCodeValue: normalizedPayload.referenceCode,
      merchantId: null,
      acceptanceId: null,
      ipAddress,
    },
  });
  if (redemption.status !== "valid" || !redemption.submission) {
    return {
      outcome: "standard",
      status: "continue_standard",
      message: INVALID_CODE_MESSAGE,
      codeStatus: redemption.status,
      submissionId: null,
      merchantId: null,
    };
  }

  return {
    outcome: "custom_deal",
    status: "awaiting_signature",
    message: CUSTOM_AGREEMENT_MESSAGE,
    codeStatus: "valid",
    submissionId: redemption.submission.id,
    merchantId: null,
  };
};

export type AcceptanceContext = {
  userAgent?: string | null;
  sessionId?: string | null;
};

/**
 * SHA-256 hex digest of the exact agreement document that was displayed and accepted.
 * The digest covers both the Merchant Services section and the Pricing Schedule so a
 * change to either produces a different hash in the acceptance audit log.
 */
const hashAgreementDocument = (agreement: AgreementBundle) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        version: agreement.version,
        merchantServicesTitle: agreement.merchantServicesTitle,
        merchantServicesContent: agreement.merchantServicesContent,
        pricingScheduleTitle: agreement.pricingScheduleTitle,
        pricingScheduleContent: agreement.pricingScheduleContent,
      }),
    )
    .digest("hex");

export const submitStandard = async (
  input: StandardSignupInput,
  ipAddress: string,
  context: AcceptanceContext = {},
): Promise<IntakeResult> => {
  if (input.accepted !== true) {
    throw new Error("Agreement acceptance is required");
  }

  const agreement = await getActiveAgreement();
  if (input.agreementVersion !== agreement.version) {
    throw new Error(
      "The agreement changed before submission. Please review the current version.",
    );
  }

  const basics = normalizeBasics(input.basics);
  const acceptedAt = new Date();
  const fullFormPayload: StandardSignupInput = {
    ...input,
    basics,
    services: normalizeServices(input.services),
    accepted: true,
  };
  const payloadHash = hashPayload(fullFormPayload);
  const existing = await getExistingSubmission(input.idempotencyKey);
  if (existing) {
    assertPayloadMatches(existing.payloadHash, payloadHash);
    return withPaymentOnboarding(resultForExistingSubmission(existing));
  }

  const [createdAcceptance] = await db
    .insert(agreementAcceptancesTable)
    .values({
      idempotencyKey: input.idempotencyKey,
      payloadHash,
      agreementVersion: agreement.version,
      accepted: true,
      acceptedAt,
      ipAddress,
      merchantServicesSnapshot: agreement.merchantServicesContent,
      pricingScheduleSnapshot: agreement.pricingScheduleContent,
      agreementSnapshot: agreement,
      fullFormPayload,
    })
    .onConflictDoNothing({
      target: agreementAcceptancesTable.idempotencyKey,
    })
    .returning();

  const acceptance =
    createdAcceptance ??
    (
      await db
        .select()
        .from(agreementAcceptancesTable)
        .where(
          eq(
            agreementAcceptancesTable.idempotencyKey,
            input.idempotencyKey,
          ),
        )
        .limit(1)
    )[0];

  if (!acceptance) {
    throw new Error("Agreement acceptance could not be safely persisted");
  }
  assertPayloadMatches(acceptance.payloadHash, payloadHash);

  try {
    const result = await db.transaction(async (tx) => {
      const duplicate = await tx
        .select()
        .from(intakeSubmissionsTable)
        .where(eq(intakeSubmissionsTable.idempotencyKey, input.idempotencyKey))
        .limit(1);

      if (duplicate[0]) {
        assertPayloadMatches(duplicate[0].payloadHash, payloadHash);
        return { submission: duplicate[0], merchant: null };
      }

      const [merchant] = await tx
        .insert(merchantsTable)
        .values({
          ...basics,
          selectedServices: fullFormPayload.services,
          status: "awaiting_payment_setup",
          termsStatus: `standard terms — accepted ${acceptance.acceptedAt.toISOString()}`,
          standardTermsAcceptedAt: acceptance.acceptedAt,
          acceptanceId: acceptance.id,
        })
        .returning();

      if (!merchant) {
        throw new Error("Merchant record could not be created");
      }

      // Append-only, tamper-evident acceptance audit log (Phase 1 compliance).
      await tx.insert(acceptanceAuditLogsTable).values({
        merchantId: merchant.id,
        documentType: "master_merchant_services_agreement",
        documentVersion: agreement.version,
        documentHash: hashAgreementDocument(agreement),
        acceptanceTimestampUtc: acceptance.acceptedAt,
        ipAddress,
        userAgent: context.userAgent ?? null,
        sessionId: context.sessionId ?? null,
      });

      const [submission] = await tx
        .insert(intakeSubmissionsTable)
        .values({
          idempotencyKey: input.idempotencyKey,
          payloadHash,
          flowType: "signup",
          status: "awaiting_payment_setup",
          payload: fullFormPayload,
          selectedServices: fullFormPayload.services,
          referenceCodeValue: null,
          referenceCodeDealId: null,
          merchantId: merchant.id,
          acceptanceId: acceptance.id,
          ipAddress,
        })
        .returning();

      if (!submission) {
        throw new Error("Signup submission could not be created");
      }

      return { submission, merchant };
    });

    const merchantId = result.merchant?.id ?? result.submission.merchantId;

    return withPaymentOnboarding({
      outcome: "standard",
      status: "awaiting_payment_setup",
      message: STANDARD_SIGNUP_MESSAGE,
      codeStatus: "none",
      submissionId: result.submission.id,
      merchantId,
    });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      const duplicate = await getExistingSubmission(input.idempotencyKey);
      if (duplicate) {
        assertPayloadMatches(duplicate.payloadHash, payloadHash);
        return withPaymentOnboarding(resultForExistingSubmission(duplicate));
      }
    }

    throw error;
  }
};