import { Router, type IRouter } from "express";
import {
  CheckMerchantOnboardingStatusBody,
  CheckMerchantOnboardingStatusResponse,
} from "@workspace/api-zod";
import {
  freshOnboardingLink,
  getOnboardingStatus,
} from "../lib/merchant-onboarding";

const router: IRouter = Router();

router.post("/merchant-onboarding/status", async (req, res): Promise<void> => {
  const parsed = CheckMerchantOnboardingStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid onboarding request." });
    return;
  }
  const result = await getOnboardingStatus(
    parsed.data.merchantId,
    parsed.data.token,
  );
  if (result.kind === "not_found") {
    res.status(404).json({ error: "Merchant onboarding was not found." });
    return;
  }
  if (result.kind === "forbidden") {
    res.status(403).json({ error: "This onboarding link is not valid." });
    return;
  }
  res.json(CheckMerchantOnboardingStatusResponse.parse(result.status));
});

router.get(
  "/merchant-onboarding/:merchantId/start",
  async (req, res): Promise<void> => {
    const merchantId = Array.isArray(req.params.merchantId)
      ? req.params.merchantId[0]
      : req.params.merchantId;
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!merchantId || token.length < 32) {
      res.status(400).json({ error: "Invalid onboarding request." });
      return;
    }
    const result = await freshOnboardingLink(merchantId, token);
    if (result.kind === "not_found") {
      res.status(404).json({ error: "Merchant onboarding was not found." });
      return;
    }
    if (result.kind === "forbidden") {
      res.status(403).json({ error: "This onboarding link is not valid." });
      return;
    }
    res.redirect(303, result.url);
  },
);

router.get(
  "/merchant-onboarding/:merchantId/refresh",
  async (req, res): Promise<void> => {
    const merchantId = Array.isArray(req.params.merchantId)
      ? req.params.merchantId[0]
      : req.params.merchantId;
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!merchantId || token.length < 32) {
      res.status(400).json({ error: "Invalid onboarding request." });
      return;
    }
    const result = await freshOnboardingLink(merchantId, token);
    if (result.kind === "not_found") {
      res.status(404).json({ error: "Merchant onboarding was not found." });
      return;
    }
    if (result.kind === "forbidden") {
      res.status(403).json({ error: "This onboarding link is not valid." });
      return;
    }
    res.redirect(303, result.url);
  },
);

export default router;