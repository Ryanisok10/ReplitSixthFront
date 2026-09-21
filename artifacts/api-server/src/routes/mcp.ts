import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  createMcpServer,
  getMcpAccessToken,
  getMcpClientId,
  getMcpClientSecret,
} from "../lib/mcp-server";

const router: IRouter = Router();
const streamableTransports = new Map<
  string,
  StreamableHTTPServerTransport
>();
const sseTransports = new Map<string, SSEServerTransport>();

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
    return bearer === getMcpAccessToken() || bearer === clientSecret;
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
    token_endpoint: `${origin}/oauth/token`,
    grant_types_supported: ["client_credentials"],
    token_endpoint_auth_methods_supported: [
      "client_secret_basic",
      "client_secret_post",
    ],
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

router.post("/oauth/token", (req, res) => {
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
    grantType !== "client_credentials" ||
    clientId !== getMcpClientId() ||
    suppliedSecret !== clientSecret
  ) {
    res.status(400).json({
      error: "invalid_client",
      error_description: "The MCP client credentials are invalid.",
    });
    return;
  }

  res.json({
    access_token: getMcpAccessToken(),
    token_type: "Bearer",
    expires_in: 3600,
    scope: "mcp:tools",
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