---
name: MCP streamable HTTP clients
description: The response negotiation requirement for streamable HTTP MCP initialization requests.
---

Streamable HTTP MCP initialize requests must send an `Accept` header containing both `application/json` and `text/event-stream`.

**Why:** The MCP transport rejects a valid authenticated initialize request with HTTP 406 when the client advertises only JSON or omits the header.

**How to apply:** Include both media types in MCP client smoke tests and any internal client implementation that exercises the streamable `/mcp` endpoint.