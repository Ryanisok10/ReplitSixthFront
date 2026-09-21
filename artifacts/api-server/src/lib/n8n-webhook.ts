import { logger } from "./logger";

export interface LeadWebhookPayload {
  flowType: "preview" | "standard";
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  services: string[];
  referenceCode?: string | null;
  dailyOrderVolume?: string | null;
  comments?: string | null;
  monthlyOrderVolume?: string | null;
}

/**
 * Fire-and-forget: POSTs lead data to the N8N_WEBHOOK_URL.
 * If N8N_WEBHOOK_URL is not set, this is a no-op.
 * Network or HTTP errors are logged but never propagated to the caller.
 */
export function fireLeadWebhook(payload: LeadWebhookPayload): void {
  const url = process.env["N8N_WEBHOOK_URL"]?.trim();
  if (!url) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(
    (res) => {
      if (!res.ok) {
        logger.warn(
          { status: res.status, url },
          "n8n webhook returned non-2xx",
        );
      }
    },
    (err: unknown) => {
      logger.warn({ err, url }, "n8n webhook request failed");
    },
  );
}
