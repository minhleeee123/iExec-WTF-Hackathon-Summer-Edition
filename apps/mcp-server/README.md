# NoxSwap MCP Server

MCP v4 stdio server for public NoxSwap reads, Groq-assisted strategy planning,
authorized balance decryption, protected swaps, and confidential limit-order
management.

## Commands

Run from the repository root:

```bash
npm run test:mcp
npm run mcp
PRIVATE_KEY="YOUR_TEST_KEY" npm run test:live --workspace @noxswap/mcp-server
PRIVATE_KEY="YOUR_TEST_KEY" npm run test:write --workspace @noxswap/mcp-server
```

The server starts read-only. Decryption requires `PRIVATE_KEY`; transaction tools
also require the explicit `MCP_ALLOW_WRITES=true` opt-in. Set
`NOXSWAP_AGENT_API_URL` to the deployed `/api/agent/plan` endpoint for strategy
planning. The planner receives only intent text and public market context.

The `noxswap-mcp` bin remains available from the workspace:

```bash
npm exec --workspace @noxswap/mcp-server -- noxswap-mcp
```

The package has not been published to the public npm registry.
