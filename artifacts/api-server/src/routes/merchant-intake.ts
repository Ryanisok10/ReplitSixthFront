import { Router, type IRouter, type Request } from "express";
import {
  GetMerchantAgreementResponse,
  SubmitPreviewLeadBody,
  SubmitPreviewLeadResponse,
  SubmitSignupReferenceCodeBody,
  SubmitSignupReferenceCodeResponse,
  SubmitStandardSignupBody,
  SubmitStandardSignupResponse,
} from "@workspace/api-zod";
import {
  getActiveAgreement,
  IntakeConflictError,
  PaymentOnboardingError,
  recordInvalidReferenceCodeAttempt,
  submitPreview,
  submitSignupCode,
  submitStandard,
} from "../lib/merchant-intake";
import { fireLeadWebhook } from "../lib/n8n-webhook";

const router: IRouter = Router();

const requestIp = (req: Request) =>
  req.ip || req.socket.remoteAddress || "unknown";

const validationErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message,
  }));

const suppliedReferenceCode = (body: unknown) => {
  if (
    typeof body === "object" &&
    body !== null &&
    "referenceCode" in body &&
    typeof body.referenceCode === "string"
  ) {
    return body.referenceCode;
  }

  return null;
};

const attemptedIdentity = (body: unknown, flowType: "preview" | "signup") => {
  const source =
    flowType === "signup" &&
    typeof body === "object" &&
    body !== null &&
    "basics" in body &&
    typeof body.basics === "object" &&
    body.basics !== null
      ? body.basics
      : body;
  if (typeof source !== "object" || source === null) {
    return { businessName: "unavailable", email: "unavailable" };
  }
  return {
    businessName:
      "businessName" in source && typeof source.businessName === "string"
        ? source.businessName
        : "unavailable",
    email:
      "email" in source && typeof source.email === "string"
        ? source.email
        : "unavailable",
  };
};

router.get("/merchant-intake/agreement", async (req, res): Promise<void> => {
  const agreement = await getActiveAgreement();
  req.log.info({ agreementVersion: agreement.version }, "Serving merchant agreement");
  res.json(GetMerchantAgreementResponse.parse(agreement));
});

router.post("/merchant-intake/preview", async (req, res): Promise<void> => {
  const parsed = SubmitPreviewLeadBody.safeParse(req.body);
  if (!parsed.success) {
    const code = suppliedReferenceCode(req.body);
    if (code) {
      const identity = attemptedIdentity(req.body, "preview");
      await recordInvalidReferenceCodeAttempt({
        flowType: "preview",
        code,
        ipAddress: requestIp(req),
        ...identity,
      });
    }
    req.log.warn(
      { validationErrors: validationErrors(parsed.error.issues) },
      "Invalid preview lead submission",
    );
    res.status(400).json({ error: "Please check the highlighted fields." });
    return;
  }

  try {
    const result = await submitPreview(parsed.data, requestIp(req));
    req.log.info(
      { submissionId: result.submissionId, outcome: result.outcome },
      "Stored preview lead",
    );
    res.status(201).json(SubmitPreviewLeadResponse.parse(result));
    void fireLeadWebhook({
      flowType: "preview",
      businessName: parsed.data.businessName,
      ownerName: parsed.data.ownerName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      services: parsed.data.services as string[],
      referenceCode: parsed.data.referenceCode ?? null,
    });
  } catch (error) {
    if (error instanceof IntakeConflictError) {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.post(
  "/merchant-intake/signup/reference-code",
  async (req, res): Promise<void> => {
    const parsed = SubmitSignupReferenceCodeBody.safeParse(req.body);
    if (!parsed.success) {
      const code = suppliedReferenceCode(req.body);
      if (code) {
        const identity = attemptedIdentity(req.body, "signup");
        await recordInvalidReferenceCodeAttempt({
          flowType: "signup",
          code,
          ipAddress: requestIp(req),
          ...identity,
        });
      }
      req.log.warn(
        { validationErrors: validationErrors(parsed.error.issues) },
        "Invalid signup reference code submission",
      );
      res.status(400).json({ error: "Please check the highlighted fields." });
      return;
    }

    try {
      const result = await submitSignupCode(parsed.data, requestIp(req));
      req.log.info(
        {
          submissionId: result.submissionId,
          codeStatus: result.codeStatus,
          outcome: result.outcome,
        },
        "Processed signup reference code",
      );
      res.json(SubmitSignupReferenceCodeResponse.parse(result));
    } catch (error) {
      if (error instanceof IntakeConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
);

router.post(
  "/merchant-intake/signup/standard",
  async (req, res): Promise<void> => {
    const parsed = SubmitStandardSignupBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn(
        { validationErrors: validationErrors(parsed.error.issues) },
        "Invalid standard signup submission",
      );
      res.status(400).json({ error: "Please check the highlighted fields." });
      return;
    }

    try {
      const result = await submitStandard(parsed.data, requestIp(req), {
        userAgent: req.headers["user-agent"] ?? null,
        sessionId:
          (req as { cookies?: Record<string, string> }).cookies?.sessionId ??
          null,
      });
      req.log.info(
        { submissionId: result.submissionId, merchantId: result.merchantId },
        "Stored standard merchant signup",
      );
      res.status(201).json(SubmitStandardSignupResponse.parse(result));
      void fireLeadWebhook({
        flowType: "standard",
        businessName: parsed.data.basics.businessName,
        ownerName: parsed.data.basics.ownerName,
        email: parsed.data.basics.email,
        phone: parsed.data.basics.phone,
        services: parsed.data.services as string[],
        monthlyOrderVolume: parsed.data.basics.monthlyOrderVolume,
      });
    } catch (error) {
      if (error instanceof IntakeConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      if (
        error instanceof Error &&
        (error.message === "Agreement acceptance is required" ||
          error.message.startsWith("The agreement changed"))
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof PaymentOnboardingError) {
        req.log.error(
          { err: error.cause, merchantPersisted: true },
          "Payment onboarding could not be started",
        );
        res.status(502).json({ error: error.message });
        return;
      }
      throw error;
    }
  },
);

export default router;
