import { randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import app from "../src/app";
import { getMcpClientId } from "../src/lib/mcp-server";

const testClientId = "abacus-mcp-regression-test";
const testSecret = randomBytes(32).toString("base64url");
const previousClientId = process.env.MCP_CLIENT_ID;
const previousClientSecret = process.env.MCP_CLIENT_SECRET;

let server: Server;
let baseUrl: string;

function restoreEnvironment() {
  if (previousClientId === undefined) {
    delete process.env.MCP_CLIENT_ID;
  } else {
    process.env.MCP_CLIENT_ID = previousClientId;
  }

  if (previousClientSecret === undefined) {
    delete process.env.MCP_CLIENT_SECRET;
  } else {
    process.env.MCP_CLIENT_SECRET = previousClientSecret;
  }
}

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(5_000),
  });
}

async function initializeMcp(path: string, bearer: string) {
  const response = await request(path, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: {
          name: "abacus-regression-test",
          version: "1.0.0",
        },
      },
    }),
  });

  assert.equal(response.status, 200);
  const sessionId = response.headers.get("mcp-session-id");
  assert.ok(sessionId);
  return sessionId;
}

async function closeMcpSession(path: string, sessionId: string, bearer: string) {
  const response = await request(path, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${bearer}`,
      "mcp-session-id": sessionId,
    },
  });
  assert.ok(response.status < 300);
}

before(async () => {
  process.env.MCP_CLIENT_ID = testClientId;
  process.env.MCP_CLIENT_SECRET = testSecret;

  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("The MCP test server did not expose an address.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  restoreEnvironment();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("Abacus MCP discovery", () => {
  it("returns the API resource and token endpoint from root and API aliases", async () => {
    const expectedOrigin = `${baseUrl}/api`;
    const protectedResourcePaths = [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
      "/mcp/.well-known/oauth-protected-resource",
      "/api/.well-known/oauth-protected-resource",
      "/api/.well-known/oauth-protected-resource/mcp",
      "/api/mcp/.well-known/oauth-protected-resource",
    ];

    for (const path of protectedResourcePaths) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      const metadata = (await response.json()) as Record<string, unknown>;
      assert.equal(metadata.resource, `${expectedOrigin}/mcp`, path);
      assert.equal(
        metadata.token_endpoint,
        undefined,
        `protected resource metadata should not expose a token endpoint: ${path}`,
      );
    }

    const authorizationServerPaths = [
      "/.well-known/oauth-authorization-server",
      "/.well-known/openid-configuration",
      "/mcp/.well-known/oauth-authorization-server",
      "/mcp/.well-known/openid-configuration",
      "/api/.well-known/oauth-authorization-server",
      "/api/.well-known/openid-configuration",
      "/api/mcp/.well-known/oauth-authorization-server",
      "/api/mcp/.well-known/openid-configuration",
      "/.well-known/oauth-authorization-server/api",
      "/.well-known/openid-configuration/api",
      "/.well-known/oauth-authorization-server/api/mcp",
      "/.well-known/openid-configuration/api/mcp",
      "/api/.well-known/oauth-authorization-server/api",
      "/api/.well-known/openid-configuration/api",
      "/api/.well-known/oauth-authorization-server/api/mcp",
      "/api/.well-known/openid-configuration/api/mcp",
    ];

    for (const path of authorizationServerPaths) {
      const response = await request(path);
      assert.equal(response.status, 200, path);
      const metadata = (await response.json()) as Record<string, unknown>;
      assert.equal(
        metadata.token_endpoint,
        `${expectedOrigin}/oauth/token`,
        path,
      );
    }
  });
});

describe("Abacus MCP authentication", () => {
  it("accepts OAuth-issued and configured static Bearer credentials", async () => {
    const tokenResponse = await request("/api/oauth/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${getMcpClientId()}:${testSecret}`,
        ).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    assert.equal(tokenResponse.status, 200);
    const tokenPayload = (await tokenResponse.json()) as {
      access_token?: unknown;
      token_type?: unknown;
    };
    assert.equal(tokenPayload.token_type, "Bearer");
    assert.equal(typeof tokenPayload.access_token, "string");
    assert.ok(tokenPayload.access_token);

    const oauthSessionId = await initializeMcp(
      "/api/mcp",
      tokenPayload.access_token,
    );
    await closeMcpSession(
      "/api/mcp",
      oauthSessionId,
      tokenPayload.access_token,
    );

    const staticSessionId = await initializeMcp("/mcp", testSecret);
    await closeMcpSession("/mcp", staticSessionId, testSecret);
  });

  it("rejects invalid credentials before initializing MCP", async () => {
    const response = await request("/api/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer invalid-abacus-credential",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {},
      }),
    });

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("www-authenticate"), 'Bearer realm="sixth-front-mcp"');
    const body = await response.text();
    assert.equal(body, JSON.stringify({ error: "MCP authentication required." }));
  });
});