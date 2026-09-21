import { ReplitConnectors } from "@replit/connectors-sdk";

export type EmailDelivery = "sent" | "configuration_required" | "failed";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ]!,
  );

export async function sendOnboardingEmail(input: {
  businessName: string;
  email: string;
  onboardingEntryUrl: string;
}): Promise<EmailDelivery> {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL?.trim();
  if (!from || !replyTo) return "configuration_required";

  const connectors = new ReplitConnectors();
  const safeBusinessName = escapeHtml(input.businessName);
  const safeOnboardingEntryUrl = escapeHtml(input.onboardingEntryUrl);
  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    body: {
      from,
      reply_to: replyTo,
      to: [input.email],
      subject: "Complete your Sixth Front payment account setup",
       text: `Hi ${input.businessName},\n\nYour Sixth Front storefront setup has started. Complete your secure payment account setup here:\n${input.onboardingEntryUrl}\n\nThis secure Sixth Front link generates a fresh Stripe-hosted onboarding session when you open it.`,
       html: `<div style="font-family:Arial,sans-serif;color:#2f251f;max-width:560px;margin:auto"><h1 style="color:#8b281c">Sixth Front</h1><p>Your storefront setup has started.</p><p>Complete the secure payment-account setup for <strong>${safeBusinessName}</strong>.</p><p><a href="${safeOnboardingEntryUrl}" style="display:inline-block;background:#d94a26;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:700">Set Up Your Payment Account</a></p><p style="color:#6f6258;font-size:13px">This secure Sixth Front link generates a fresh Stripe-hosted onboarding session when you open it.</p></div>`,
    },
  });
  return response.ok ? "sent" : "failed";
}