import {
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  db,
  mcpOauthAuthorizationCodesTable,
  mcpOauthRefreshTokensTable,
} from "@workspace/db";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createMcpServer,
  getMcpClientId,
  getMcpClientSecret,
  issueMcpAccessToken,
  validateMcpAccessToken,
} from "../lib/mcp-server";

const router: IRouter = Router();
const streamableTransports = new Map<
  string,
  StreamableHTTPServerTransport
>();
const sseTransports = new Map<string, SSEServerTransport>();
const ABACUS_REDIRECT_URI = "https://abacus.ai/oauth/callback";
const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const oauthTokenResponse = (refreshToken?: string) => ({
  access_token: issueMcpAccessToken(),
  token_type: "Bearer",
  expires_in: 3600,
  scope: "mcp:tools",
  ...(refreshToken
    ? {
        refresh_token: refreshToken,
        refresh_token_expires_in: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
      }
    : {}),
});

const newRefreshToken = () => randomBytes(32).toString("base64url");

const refreshTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const baseUrl = (req: Request) => {
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  // The API router is mounted at /api publicly, but the same router is also
  // mounted at the app root so the public proxy can serve root-level OAuth
  // discovery fallbacks. Keep metadata URLs pointed at the public API mount.
  const mountedPath = req.baseUrl || "/api";
  return `${protocol}://${req.get("host")}${mountedPath}`;
};

const unauthorized = (res: Response) => {
  res.setHeader("WWW-Authenticate", 'Bearer realm="sixth-front-mcp"');
  res.status(401).json({ error: "MCP authentication required." });
};

function basicCredentials(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      clientId: decoded.slice(0, separator),
      clientSecret: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function authenticated(req: Request) {
  const clientSecret = getMcpClientSecret();
  if (!clientSecret) return false;

  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    const bearer = authorization.slice(7).trim();
    // Support clients that can send a static bearer credential but cannot
    // complete the client-credentials exchange. The normal OAuth-issued token
    // remains supported and preferred.
    return validateMcpAccessToken(bearer) || bearer === clientSecret;
  }

  const credentials = basicCredentials(req);
  return (
    credentials?.clientId === getMcpClientId() &&
    credentials.clientSecret === clientSecret
  );
}

function requireMcpAuth(
  req: Request,
  res: Response,
  next: () => void,
) {
  if (!getMcpClientSecret()) {
    res.status(503).json({ error: "MCP credentials are not configured." });
    return;
  }
  if (!authenticated(req)) {
    unauthorized(res);
    return;
  }
  next();
}

const oauthMetadata = (req: Request) => {
  const origin = baseUrl(req);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "client_credentials",
    ],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp:tools"],
  };
};

const protectedResourceMetadata = (req: Request) => {
  const origin = baseUrl(req);
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    scopes_supported: ["mcp:tools"],
  };
};

router.get(
  "/.well-known/oauth-protected-resource",
  (req, res) => {
    res.json(protectedResourceMetadata(req));
  },
);

router.get(
  "/.well-known/oauth-protected-resource/mcp",
  (req, res) => {
    res.json(protectedResourceMetadata(req));
  },
);

router.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json(oauthMetadata(req));
});

// Some MCP clients resolve discovery relative to the resource URL itself,
// e.g. /api/mcp/.well-known/oauth-protected-resource. Keep these aliases
// alongside the origin-level metadata above.
router.get("/mcp/.well-known/oauth-protected-resource", (req, res) => {
  res.json(protectedResourceMetadata(req));
});

router.get("/mcp/.well-known/oauth-authorization-server", (req, res) => {
  res.json(oauthMetadata(req));
});

router.get("/mcp/.well-known/openid-configuration", (req, res) => {
  res.json(oauthMetadata(req));
});

router.get("/.well-known/openid-configuration", (req, res) => {
  res.json(oauthMetadata(req));
});

// Abacus currently appends the resource/auth-server path after the standard
// discovery filename. Support those fallback forms as well.
router.get(
  "/.well-known/oauth-protected-resource/api/mcp",
  (req, res) => {
    res.json(protectedResourceMetadata(req));
  },
);

router.get(
  "/.well-known/oauth-authorization-server/api",
  (req, res) => {
    res.json(oauthMetadata(req));
  },
);

router.get(
  "/.well-known/openid-configuration/api",
  (req, res) => {
    res.json(oauthMetadata(req));
  },
);

router.get(
  "/.well-known/oauth-authorization-server/api/mcp",
  (req, res) => {
    res.json(oauthMetadata(req));
  },
);

router.get(
  "/.well-known/openid-configuration/api/mcp",
  (req, res) => {
    res.json(oauthMetadata(req));
  },
);

router.get("/oauth/authorize", async (req, res) => {
  const clientId =
    typeof req.query.client_id === "string" ? req.query.client_id : "";
  const redirectUri =
    typeof req.query.redirect_uri === "string" ? req.query.redirect_uri : "";
  const responseType =
    typeof req.query.response_type === "string" ? req.query.response_type : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const requestedScope =
    typeof req.query.scope === "string" ? req.query.scope : "mcp:tools";
  const codeChallenge =
    typeof req.query.code_challenge === "string"
      ? req.query.code_challenge
      : null;
  const codeChallengeMethod =
    typeof req.query.code_challenge_method === "string"
      ? req.query.code_challenge_method
      : null;

  if (
    clientId !== getMcpClientId() ||
    redirectUri !== ABACUS_REDIRECT_URI ||
    responseType !== "code"
  ) {
    res.status(400).json({
      error: "invalid_request",
      error_description: "The OAuth authorization request is invalid.",
    });
    return;
  }

  const callback = new URL(redirectUri);
  if (requestedScope !== "mcp:tools") {
    callback.searchParams.set("error", "invalid_scope");
    if (state) callback.searchParams.set("state", state);
    res.redirect(callback.toString());
    return;
  }
  if (
    !codeChallenge ||
    codeChallenge.length < 43 ||
    codeChallenge.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(codeChallenge) ||
    codeChallengeMethod !== "S256"
  ) {
    callback.searchParams.set("error", "invalid_request");
    callback.searchParams.set(
      "error_description",
      "A valid S256 PKCE challenge is required.",
    );
    if (state) callback.searchParams.set("state", state);
    res.redirect(callback.toString());
    return;
  }

  if (!getMcpClientSecret()) {
    res.status(503).json({ error: "MCP credentials are not configured." });
    return;
  }

  const code = randomBytes(32).toString("base64url");
  await db.insert(mcpOauthAuthorizationCodesTable).values({
    codeHash: createHash("sha256").update(code).digest("hex"),
    clientId,
    redirectUri,
    scope: requestedScope,
    codeChallenge,
    expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
  });

  callback.searchParams.set("code", code);
  if (state) callback.searchParams.set("state", state);
  res.redirect(callback.toString());
});

router.post("/oauth/token", async (req, res) => {
  const clientSecret = getMcpClientSecret();
  const credentials = basicCredentials(req);
  const clientId =
    credentials?.clientId ||
    (typeof req.body?.client_id === "string" ? req.body.client_id : "");
  const suppliedSecret =
    credentials?.clientSecret ||
    (typeof req.body?.client_secret === "string"
      ? req.body.client_secret
      : "");
  const grantType =
    typeof req.body?.grant_type === "string"
      ? req.body.grant_type
      : "client_credentials";

  if (
    !clientSecret ||
    clientId !== getMcpClientId() ||
    suppliedSecret !== clientSecret
  ) {
    res.status(400).json({
      error: "invalid_client",
      error_description: "The MCP client credentials are invalid.",
    });
    return;
  }

  if (grantType === "client_credentials") {
    res.json(oauthTokenResponse());
    return;
  }

  if (grantType === "authorization_code") {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const redirectUri =
      typeof req.body?.redirect_uri === "string" ? req.body.redirect_uri : "";
    const codeVerifier =
      typeof req.body?.code_verifier === "string" ? req.body.code_verifier : "";
    const [authorization] = await db
      .update(mcpOauthAuthorizationCodesTable)
      .set({ redeemedAt: new Date() })
      .where(
        and(
          eq(
            mcpOauthAuthorizationCodesTable.codeHash,
            createHash("sha256").update(code).digest("hex"),
          ),
          eq(mcpOauthAuthorizationCodesTable.clientId, clientId),
          eq(mcpOauthAuthorizationCodesTable.redirectUri, redirectUri),
          isNull(mcpOauthAuthorizationCodesTable.redeemedAt),
          gt(mcpOauthAuthorizationCodesTable.expiresAt, new Date()),
        ),
      )
      .returning();
    const verifierMatches =
      Boolean(authorization) &&
      codeVerifier.length >= 43 &&
      codeVerifier.length <= 128 &&
      /^[A-Za-z0-9._~-]+$/.test(codeVerifier) &&
      createHash("sha256").update(codeVerifier).digest("base64url") ===
        authorization?.codeChallenge;

    if (!authorization || !verifierMatches) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: "The authorization code is invalid or expired.",
      });
      return;
    }

    const refreshToken = newRefreshToken();
    await db.insert(mcpOauthRefreshTokensTable).values({
      tokenHash: refreshTokenHash(refreshToken),
      clientId,
      scope: authorization.scope,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    res.json(oauthTokenResponse(refreshToken));
    return;
  }

  if (grantType === "refresh_token") {
    const suppliedRefreshToken =
      typeof req.body?.refresh_token === "string"
        ? req.body.refresh_token
        : "";
    const replacementRefreshToken = newRefreshToken();
    const rotated = await db.transaction(async (tx) => {
      const [current] = await tx
        .update(mcpOauthRefreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(
              mcpOauthRefreshTokensTable.tokenHash,
              refreshTokenHash(suppliedRefreshToken),
            ),
            eq(mcpOauthRefreshTokensTable.clientId, clientId),
            isNull(mcpOauthRefreshTokensTable.revokedAt),
            gt(mcpOauthRefreshTokensTable.expiresAt, new Date()),
          ),
        )
        .returning();
      if (!current) return null;

      await tx.insert(mcpOauthRefreshTokensTable).values({
        tokenHash: refreshTokenHash(replacementRefreshToken),
        clientId,
        scope: current.scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      });
      return replacementRefreshToken;
    });

    if (!rotated) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: "The refresh token is invalid or expired.",
      });
      return;
    }

    res.json(oauthTokenResponse(rotated));
    return;
  }

  res.status(400).json({
    error: "unsupported_grant_type",
    error_description: "The requested OAuth grant type is not supported.",
  });
});

router.post("/mcp", requireMcpAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const existing = typeof sessionId === "string"
    ? streamableTransports.get(sessionId)
    : undefined;

  try {
    if (existing) {
      await existing.handleRequest(req, res, req.body);
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "A valid MCP initialize request is required.",
        },
        id: null,
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    const server = createMcpServer();
    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) streamableTransports.delete(id);
      void server.close();
    };
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    const id = transport.sessionId;
    if (id) streamableTransports.set(id, transport);
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "MCP request failed." },
        id: null,
      });
    }
  }
});

router.get("/mcp", requireMcpAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = typeof sessionId === "string"
    ? streamableTransports.get(sessionId)
    : undefined;
  if (!transport) {
    res.status(400).json({ error: "A valid MCP session is required." });
    return;
  }
  await transport.handleRequest(req, res);
});

router.delete("/mcp", requireMcpAuth, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = typeof sessionId === "string"
    ? streamableTransports.get(sessionId)
    : undefined;
  if (!transport) {
    res.status(404).json({ error: "MCP session not found." });
    return;
  }
  await transport.handleRequest(req, res);
});

router.get("/sse", requireMcpAuth, async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  sseTransports.set(transport.sessionId, transport);
  const server = createMcpServer();
  transport.onclose = () => {
    sseTransports.delete(transport.sessionId);
    void server.close();
  };
  await server.connect(transport);
  await transport.start();
});

router.post("/messages", requireMcpAuth, async (req, res) => {
  const sessionId =
    typeof req.query.sessionId === "string" ? req.query.sessionId : "";
  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "MCP SSE session not found." });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

export default router;