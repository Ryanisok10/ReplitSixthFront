import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import Stripe from "stripe";
import { z } from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  STRIPE_V2_API_VERSION,
  STRIPE_V2_WEBHOOK_EVENTS,
  getStripeV2Destination,
} from "./mcp-stripe.js";
import {
  getActiveAgreement,
  submitPreview,
  submitStandard,
} from "./merchant-intake";
import {
  freshOnboardingLink,
  getOnboardingStatus,
} from "./merchant-onboarding";
import {
  createProjectPatchProposal,
  readProjectFile,
  runProjectCheck,
  type ProjectCheckName,
} from "./project-guardrails";

const MCP_CLIENT_ID = () =>
  process.env.MCP_CLIENT_ID?.trim() || "abacus-sixth-front";

export const getMcpClientId = MCP_CLIENT_ID;

export function getMcpClientSecret() {
  return process.env.MCP_CLIENT_SECRET?.trim() || null;
}

const MCP_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

type McpAccessTokenPayload = {
  audience: "sixth-front-mcp";
  expiresAt: number;
  issuedAt: number;
  nonce: string;
};

const accessTokenSignature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export function issueMcpAccessToken() {
  const secret = getMcpClientSecret();
  if (!secret) return null;
  const issuedAt = Date.now();
  const encodedPayload = Buffer.from(
    JSON.stringify({
      audience: "sixth-front-mcp",
      issuedAt,
      expiresAt: issuedAt + MCP_ACCESS_TOKEN_TTL_MS,
      nonce: randomUUID(),
    } satisfies McpAccessTokenPayload),
  ).toString("base64url");
  return `${encodedPayload}.${accessTokenSignature(encodedPayload, secret)}`;
}

export function validateMcpAccessToken(token: string) {
  const secret = getMcpClientSecret();
  const [encodedPayload, suppliedSignature, ...rest] = token.split(".");
  if (!secret || !encodedPayload || !suppliedSignature || rest.length) return false;

  const expected = Buffer.from(accessTokenSignature(encodedPayload, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as McpAccessTokenPayload;
    return (
      payload.audience === "sixth-front-mcp" &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

const jsonText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const errorText = (error: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: error instanceof Error ? error.message : "The requested operation failed.",
    },
  ],
});

const serviceSchema = z.enum(["food", "merch", "bundle", "landing"]);

const basicsShape = {
  ownerName: z.string().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().min(7).max(32),
  businessName: z.string().min(1).max(180),
  address: z.string().min(5).max(300),
  websiteType: z.string().min(1).max(80),
  monthlyOrderVolume: z.string().min(1).max(80),
};

const basicsSchema = z.object(basicsShape);
const servicesSchema = z.array(serviceSchema).min(1);

export function createMcpServer() {
  const server = new McpServer({
    name: "sixth-front",
    version: "1.0.0",
    websiteUrl: "https://sixthfront.com",
  });

  server.registerTool(
    "get_active_agreement",
    {
      title: "Get active merchant agreement",
      description:
        "Read the currently active Sixth Front merchant agreement and pricing schedule.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return jsonText(await getActiveAgreement());
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "stripe_sandbox_preflight",
    {
      title: "Check Stripe Sandbox readiness",
      description:
        "Check whether the direct Stripe configuration is present and whether the current development Accounts v2 event destination is ready. Secret values are never returned.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";
      const webhookSecret = process.env.STRIPE_V2_WEBHOOK_SECRET?.trim() || "";
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() || null;
      const expectedUrl = domain
        ? `https://${domain}/api/stripe/v2/webhook`
        : null;

      if (!secretKey) {
        return jsonText({
          configured: false,
          reason: "STRIPE_SECRET_KEY is not configured.",
          webhookSecretConfigured: Boolean(webhookSecret),
        });
      }

      try {
        const stripe = new Stripe(secretKey);
        const destinations =
          await stripe.v2.core.eventDestinations.list(
            { include: ["webhook_endpoint.url"] },
            { apiVersion: STRIPE_V2_API_VERSION },
          );
        const destination = expectedUrl
          ? destinations.data.find(
              (item) => item.webhook_endpoint?.url === expectedUrl,
            )
          : undefined;
        const enabledEvents = destination?.enabled_events ?? [];
        const missingEvents = STRIPE_V2_WEBHOOK_EVENTS.filter(
          (event) => !enabledEvents.includes(event),
        );
        return jsonText({
          configured: true,
          mode: /^(?:sk|rk)_test_/.test(secretKey) ? "test" : "unknown",
          webhookSecretConfigured: Boolean(webhookSecret),
          expectedWebhookUrl: expectedUrl,
          destinationFound: Boolean(destination),
          destinationStatus: destination?.status ?? null,
          eventsFrom: destination?.events_from ?? null,
          requiredEventsMissing: missingEvents,
        });
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "submit_preview_lead",
    {
      title: "Submit a storefront preview lead",
      description:
        "Create a Sixth Front preview lead. This writes application data and may trigger lead follow-up behavior.",
      inputSchema: {
        idempotencyKey: z.string().uuid(),
        businessName: z.string().min(1).max(180),
        ownerName: z.string().min(1).max(120),
        email: z.string().email().max(254),
        phone: z.string().min(7).max(32),
        venueType: z.string().max(100).optional(),
        dailyOrderVolume: z.string().max(80).optional(),
        services: servicesSchema,
        comments: z.string().max(2000).optional(),
        referenceCode: z.string().max(64).optional(),
      },
    },
    async (input) => {
      try {
        return jsonText(await submitPreview(input, "mcp"));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "submit_standard_signup",
    {
      title: "Submit a standard merchant signup",
      description:
        "Create a standard merchant signup and start Stripe Accounts v2 onboarding. This writes application data and calls Stripe.",
      inputSchema: {
        idempotencyKey: z.string().uuid(),
        basics: basicsSchema,
        services: servicesSchema,
        agreementVersion: z.string().min(1).max(80),
        accepted: z.literal(true),
      },
    },
    async (input) => {
      try {
        return jsonText(await submitStandard(input, "mcp"));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "get_onboarding_status",
    {
      title: "Get merchant onboarding status",
      description:
        "Read the Stripe Accounts v2 onboarding and capability status for a merchant using its private onboarding token.",
      inputSchema: {
        merchantId: z.string().min(1),
        token: z.string().min(32),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ merchantId, token }) => {
      try {
        return jsonText(await getOnboardingStatus(merchantId, token));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "create_onboarding_link",
    {
      title: "Create a fresh onboarding link",
      description:
        "Create a fresh Stripe Accounts v2 onboarding link for a merchant using its private onboarding token.",
      inputSchema: {
        merchantId: z.string().min(1),
        token: z.string().min(32),
      },
    },
    async ({ merchantId, token }) => {
      try {
        return jsonText(await freshOnboardingLink(merchantId, token));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "read_project_file",
    {
      title: "Read an approved project source file",
      description:
        "Read a non-secret source or configuration file for understanding the project. Access is limited to approved project paths; secrets, hidden metadata, dependencies, build output, and environment files are blocked.",
      inputSchema: {
        path: z.string().min(1).max(240),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path }) => {
      try {
        return jsonText(await readProjectFile(path));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "propose_project_patch",
    {
      title: "Propose a project patch for review",
      description:
        "Save a proposed replacement for approved project source files for human review. This tool never edits source files, cannot apply a proposal, and requires an expected SHA-256 for each file to prevent stale overwrites.",
      inputSchema: {
        summary: z.string().min(1).max(500),
        changes: z
          .array(
            z.object({
              path: z.string().min(1).max(240),
              expectedSha256: z.string().length(64),
              replacementContent: z.string().max(120_000),
            }),
          )
          .min(1)
          .max(5),
      },
    },
    async (input) => {
      try {
        return jsonText(await createProjectPatchProposal(input));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  server.registerTool(
    "run_project_check",
    {
      title: "Run an approved project check",
      description:
        "Run one fixed, non-interactive project typecheck or build command. Arbitrary shell commands are not accepted, and sensitive environment variables are removed from the child process.",
      inputSchema: {
        check: z.enum([
          "api_typecheck",
          "frontend_typecheck",
          "api_build",
          "frontend_build",
        ]),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ check }) => {
      try {
        return jsonText(await runProjectCheck(check as ProjectCheckName));
      } catch (error) {
        return errorText(error);
      }
    },
  );

  return server;
}
