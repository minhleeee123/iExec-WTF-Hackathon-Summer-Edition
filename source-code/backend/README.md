# NoxSwap Backend

Solidity contracts, Sepolia deployment scripts, MCP tools, and the stateless
permissionless limit-order keeper.

## Keeper

The keeper treats the deployed `NoxLimitOrderBook` as its canonical state. It
builds an active-order set incrementally from lifecycle events, checks those
orders sequentially, executes trigger-ready orders, and calls the public expiry
refund after block time passes the expiry. It never cancels orders or decrypts
confidential handles.

```bash
npm run keeper:dry   # one read-only Sepolia scan
npm run keeper:once  # one write-enabled scan
npm run keeper       # polling worker plus GET /health
```

Copy the required names from `.env.example` into an ignored `.env`. Write mode
requires `KEEPER_PRIVATE_KEY`; dry-run mode deliberately does not. The configured
wallet needs Sepolia ETH and the process refuses writes below `KEEPER_MIN_ETH`.
Transactions are submitted sequentially and order status is read again immediately
before simulation/submission to tolerate competing keepers.

The default `.keeper-checkpoint.json` contains only chain ID, contract address,
the finalized block checkpoint, and public order IDs. It is an optional,
rebuildable cache rather than a database or source of truth. Set
`KEEPER_CHECKPOINT_FILE` to move it, or delete it at any time to rebuild the
index from contract events. Recent events remain an unpersisted overlay until
they pass `KEEPER_FINALITY_BLOCKS` confirmations.
`KEEPER_HISTORY_RPC_URL` must support archive `eth_getLogs`; it is intentionally
separate from the low-latency RPC used for current state and transactions.
`KEEPER_HISTORY_HEAD_LAG_BLOCKS` keeps log queries a few blocks behind provider
head to tolerate load-balanced archive nodes that briefly disagree on height.

`GET /health` defaults to port `8787` and returns only the chain, public keeper
address, ETH balance, cycle timestamps, last action, and error count. Set a public
`VITE_KEEPER_HEALTH_URL` in the frontend deployment to surface this status. The
optional webhook receives order ID, action, transaction, block, explorer URL, and
keeper address; webhook failure never changes the on-chain result.

Set `KEEPER_AI_OBSERVER_URL` to the frontend's public `/api/agent/observe`
endpoint to emit a Groq explanation for actionable/retry outcomes. The observer
runs after the deterministic decision is fixed, receives only public fields, and
cannot gate or alter settlement. Leave the variable empty to disable it and avoid
using Groq quota.

## MCP v4

The stdio server exposes nine tools, including `nox_get_market_context` and
`nox_plan_confidential_order`. Public reads and planning can start without a
signing key:

```bash
NOXSWAP_AGENT_API_URL="https://YOUR_FRONTEND/api/agent/plan" npm run mcp
```

Decryption requires `PRIVATE_KEY`. Transaction tools additionally require the
explicit `MCP_ALLOW_WRITES=true` opt-in. The planner endpoint receives only the
intent and live public Chainlink/block context; it receives no wallet address,
balance, handle, proof, or signature.

The package includes a `noxswap-mcp` bin and can be tested from a local checkout:

```bash
npx --yes --package . noxswap-mcp
```

For Claude Desktop, Cursor, or another MCP stdio client, use that command plus an
environment block containing `SEPOLIA_RPC_URL` and `NOXSWAP_AGENT_API_URL`.
Include `PRIVATE_KEY` only when signer-authorized tools are required, and keep
`MCP_ALLOW_WRITES=false` unless writes are intentionally enabled. The package is
CLI-ready but has not been published to the public npm registry.

## Verification

```bash
npm test
npm run compile
npm run keeper:dry
```

The Docker-backed Nox runtime suite uses the official Hardhat plugin to start
NoxCompute, KMS, Handle Gateway, runner, ingestor, NATS, and S3 before exercising
real confidential bytecode:

```bash
npm run test:nox
```

It runs nightly and on demand in `.github/workflows/nox-integration.yml`; it is
kept separate from push/PR CI while the external container stack is monitored for
stability.

Live write verification supports any funded Sepolia signer and produces
sanitized, secret-free evidence in `artifacts/evidence/`:

```bash
npm run test:sepolia
npm run test:mcp:write
```

Live E2E, MCP, deployment, and Sourcify commands are documented in the repository
root README. Never pass a valuable mainnet key to this testnet project.
