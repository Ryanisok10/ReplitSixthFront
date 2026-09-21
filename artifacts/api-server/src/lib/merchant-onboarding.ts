import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import type Stripe from "stripe";
import {
  db,
  merchantsTable,
  stripeAccountWebhookEventsTable,
} from "@workspace/db";
import { getUncachableStripeClient } from "./stripe-client";
import { sendOnboardingEmail, type EmailDelivery } from "./onboarding-email";

// Stripe's Accounts v2 documentation currently shows this preview version.
// Keep all Accounts v2 requests on the same version so their response shapes
// and capability names remain consistent.
export const STRIPE_V2_API_VERSION = "2026-08-26.preview";

const secret = () => {
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");
  return process.env.SESSION_SECRET;
};

const tokenFor = (merchantId: string) =>
  createHmac("sha256", secret())
    .update(`merchant-onboarding:${merchantId}`)
    .digest("base64url");

const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const origin = () => {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (!domain) throw new Error("REPLIT_DOMAINS is required for Stripe onboarding URLs");
  return `https://${domain}`;
};

const frontendBasePath = () => {
  const configured = process.env.SIXTH_FRONT_PUBLIC_BASE_PATH?.trim();
  const value = configured || "/sixth-front";
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

function urls(merchantId: string, token: string) {
  const base = origin();
  const query = new URLSearchParams({ merchant: merchantId, token }).toString();
  return {
    refreshUrl: `${base}/api/merchant-onboarding/${merchantId}/refresh?token=${encodeURIComponent(token)}`,
    returnUrl: `${base}${frontendBasePath()}/payment-onboarding/return?${query}`,
    emailEntryUrl: `${base}/api/merchant-onboarding/${merchantId}/start?token=${encodeURIComponent(token)}`,
  };
}

async function link(account: string, merchantId: string, token: string) {
  const stripe = await getUncachableStripeClient();
  const target = urls(merchantId, token);
  return stripe.v2.core.accountLinks.create(
    {
      account,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant"],
          collection_options: {
            fields: "eventually_due",
            future_requirements: "include",
          },
          refresh_url: target.refreshUrl,
          return_url: target.returnUrl,
        },
      },
    },
    { apiVersion: STRIPE_V2_API_VERSION },
  );
}

function eventDate(created: string | number) {
  const timestamp =
    typeof created === "number" ? created * 1000 : Date.parse(created);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Stripe event has an invalid created timestamp");
  }
  return new Date(timestamp);
}

type AccountEvent = { id: string; created: string | number };

type MerchantStripeState = {
  stripeOnboardingStatus: string;
  stripeDetailsSubmitted: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeCardPaymentsStatus: string | null;
  stripeBalancePayoutsStatus?: string | null;
  stripeTransfersStatus?: string | null;
};

async function persistMerchantState(
  accountId: string,
  state: MerchantStripeState,
  event?: AccountEvent,
) {
  if (!event) {
    await db
      .update(merchantsTable)
      .set(state)
      .where(eq(merchantsTable.stripeConnectedAccountId, accountId));
    return;
  }

  const createdAt = eventDate(event.created);
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .insert(stripeAccountWebhookEventsTable)
      .values({
        eventId: event.id,
        stripeAccountId: accountId,
        eventCreatedAt: createdAt,
      })
      .onConflictDoNothing()
      .returning({ eventId: stripeAccountWebhookEventsTable.eventId });
    if (!claimed) return;

    await tx
      .update(merchantsTable)
      .set(state)
      .where(eq(merchantsTable.stripeConnectedAccountId, accountId));
    await tx
      .update(merchantsTable)
      .set({
        stripeLastEventId: event.id,
        stripeLastEventCreatedAt: createdAt,
      })
      .where(
        and(
          eq(merchantsTable.stripeConnectedAccountId, accountId),
          or(
            isNull(merchantsTable.stripeLastEventCreatedAt),
            lt(merchantsTable.stripeLastEventCreatedAt, createdAt),
            and(
              eq(merchantsTable.stripeLastEventCreatedAt, createdAt),
              lt(merchantsTable.stripeLastEventId, event.id),
            ),
          ),
        ),
      );
  });
}

function accountState(account: Stripe.V2.Core.Account) {
  const merchant = account.configuration?.merchant;
  const card = merchant?.capabilities?.card_payments?.status ?? null;
  const payouts =
    merchant?.capabilities?.stripe_balance?.payouts?.status ?? null;
  const requirementsPending =
    account.requirements?.entries?.some(
      (entry) => entry.awaiting_action_from === "user",
    ) ?? false;
  const detailsSubmitted = Boolean(account.identity);
  const chargesEnabled = card === "active";
  const payoutsEnabled = payouts === "active";
  const capabilitiesActive = chargesEnabled && payoutsEnabled;
  const complete =
    detailsSubmitted &&
    merchant?.applied === true &&
    !requirementsPending &&
    capabilitiesActive;

  return {
    stripeOnboardingStatus: complete ? "complete" : "incomplete",
    stripeDetailsSubmitted: detailsSubmitted,
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: payoutsEnabled,
    stripeCardPaymentsStatus: card,
    stripeBalancePayoutsStatus: payouts,
  };
}

export async function syncMerchantAccount(
  account: Stripe.V2.Core.Account,
  event?: AccountEvent,
) {
  await persistMerchantState(account.id, accountState(account), event);
}

export async function syncLegacyMerchantAccount(
  account: Stripe.Account,
  event?: AccountEvent,
) {
  const card = account.capabilities?.card_payments ?? null;
  const transfers = account.capabilities?.transfers ?? null;
  await persistMerchantState(
    account.id,
    {
      stripeOnboardingStatus:
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled &&
        card === "active" &&
        transfers === "active"
          ? "complete"
          : "incomplete",
      stripeDetailsSubmitted: account.details_submitted,
      stripeChargesEnabled: account.charges_enabled,
      stripePayoutsEnabled: account.payouts_enabled,
      stripeCardPaymentsStatus: card,
      stripeTransfersStatus: transfers,
    },
    event,
  );
}

export async function provisionMerchantOnboarding(merchantId: string) {
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, merchantId))
    .limit(1);
  if (!merchant?.acceptanceId) {
    throw new Error("Standard merchant acceptance is missing");
  }

  const token = tokenFor(merchant.id);
  const expectedHash = tokenHash(token);
  let accountId = merchant.stripeConnectedAccountId;
  const stripe = await getUncachableStripeClient();

  if (!accountId) {
    const account = await stripe.v2.core.accounts.create(
      {
        contact_email: merchant.email,
        display_name: merchant.businessName,
        dashboard: "express",
        identity: {
          country: "us",
          business_details: {
            registered_name: merchant.businessName,
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              // Accounts v2's merchant configuration includes
              // stripe_balance.payouts in its returned capability state;
              // the current create schema requests card_payments explicitly.
              card_payments: { requested: true },
            },
          },
        },
        defaults: {
          currency: "usd",
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        include: [
          "configuration.merchant",
          "identity",
          "requirements",
          "defaults",
        ],
        metadata: { sixthFrontMerchantId: merchant.id },
      },
      {
        apiVersion: STRIPE_V2_API_VERSION,
        idempotencyKey: `sixth-front-merchant-${merchant.id}-accounts-v2`,
      },
    );
    accountId = account.id;
    await db
      .update(merchantsTable)
      .set({
        stripeConnectedAccountId: account.id,
        stripeOnboardingAccessTokenHash: expectedHash,
        stripeOnboardingStatus: "incomplete",
        stripeProvisionedAt: new Date(),
      })
      .where(eq(merchantsTable.id, merchant.id));
    await syncMerchantAccount(account);
  } else if (merchant.stripeOnboardingAccessTokenHash !== expectedHash) {
    await db
      .update(merchantsTable)
      .set({ stripeOnboardingAccessTokenHash: expectedHash })
      .where(eq(merchantsTable.id, merchant.id));
  }

  const immediate = await link(accountId, merchant.id, token);
  const emailTarget = urls(merchant.id, token);
  let emailDelivery: EmailDelivery = "failed";
  try {
    emailDelivery = await sendOnboardingEmail({
      businessName: merchant.businessName,
      email: merchant.email,
      onboardingEntryUrl: emailTarget.emailEntryUrl,
    });
  } catch {
    emailDelivery = "failed";
  }
  return {
    onboardingUrl: immediate.url,
    onboardingStatus: "incomplete",
    emailDelivery,
  };
}

async function authorizedMerchant(merchantId: string, token: string) {
  const [merchant] = await db
    .select()
    .from(merchantsTable)
    .where(eq(merchantsTable.id, merchantId))
    .limit(1);
  if (!merchant) return { kind: "not_found" as const };
  const actual = Buffer.from(tokenHash(token));
  const expected = Buffer.from(merchant.stripeOnboardingAccessTokenHash ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { kind: "forbidden" as const };
  }
  return { kind: "ok" as const, merchant };
}

export async function freshOnboardingLink(merchantId: string, token: string) {
  const found = await authorizedMerchant(merchantId, token);
  if (found.kind !== "ok") return found;
  if (!found.merchant.stripeConnectedAccountId) {
    return { kind: "not_found" as const };
  }
  const created = await link(
    found.merchant.stripeConnectedAccountId,
    merchantId,
    token,
  );
  return { kind: "ok" as const, url: created.url };
}

export async function getOnboardingStatus(merchantId: string, token: string) {
  const found = await authorizedMerchant(merchantId, token);
  if (found.kind !== "ok") return found;
  const accountId = found.merchant.stripeConnectedAccountId;
  if (!accountId) return { kind: "not_found" as const };
  const stripe = await getUncachableStripeClient();
  const account = await stripe.v2.core.accounts.retrieve(
    accountId,
    {
      include: [
        "configuration.merchant",
        "identity",
        "requirements",
        "defaults",
      ],
    },
    { apiVersion: STRIPE_V2_API_VERSION },
  );
  await syncMerchantAccount(account);
  const state = accountState(account);
  const nextLink = state.stripeOnboardingStatus === "complete"
    ? null
    : await link(accountId, merchantId, token);
  return {
    kind: "ok" as const,
    status: {
      merchantId,
      status: state.stripeOnboardingStatus,
      detailsSubmitted: state.stripeDetailsSubmitted,
      chargesEnabled: state.stripeChargesEnabled,
      payoutsEnabled: state.stripePayoutsEnabled,
      capabilitiesReady:
        state.stripeCardPaymentsStatus === "active" &&
        state.stripeBalancePayoutsStatus === "active",
      message:
        state.stripeOnboardingStatus === "complete"
          ? "Your payment account setup is complete."
          : "Stripe still needs some information before your payment account is ready.",
      onboardingUrl: nextLink?.url ?? null,
    },
  };
}

let refreshInFlight = false;

export async function refreshIncompleteMerchantAccounts(limit = 25) {
  if (refreshInFlight) {
    return { refreshed: 0, failed: 0, skipped: true };
  }
  refreshInFlight = true;
  try {
    const merchants = await db
      .select({
        id: merchantsTable.id,
        stripeConnectedAccountId: merchantsTable.stripeConnectedAccountId,
      })
      .from(merchantsTable)
      .where(
        and(
          eq(merchantsTable.stripeOnboardingStatus, "incomplete"),
          isNotNull(merchantsTable.stripeConnectedAccountId),
        ),
      )
      .limit(limit);
    if (merchants.length === 0) {
      return { refreshed: 0, failed: 0, skipped: false };
    }

    const stripe = await getUncachableStripeClient();
    let refreshed = 0;
    let failed = 0;
    for (const merchant of merchants) {
      if (!merchant.stripeConnectedAccountId) continue;
      try {
        const account = await stripe.v2.core.accounts.retrieve(
          merchant.stripeConnectedAccountId,
          {
            include: [
              "configuration.merchant",
              "identity",
              "requirements",
              "defaults",
            ],
          },
          { apiVersion: STRIPE_V2_API_VERSION },
        );
        await syncMerchantAccount(account);
        refreshed += 1;
      } catch {
        failed += 1;
      }
    }
    return { refreshed, failed, skipped: false };
  } finally {
    refreshInFlight = false;
  }
}