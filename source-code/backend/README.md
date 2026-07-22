# NoxSwap Backend

Solidity contracts, Sepolia deployment scripts, MCP tools, and the stateless
permissionless limit-order keeper.

## Keeper

The keeper treats the deployed `NoxLimitOrderBook` as its only state. It scans
open orders sequentially, executes trigger-ready orders, and calls the public
expiry refund after block time passes the expiry. It never cancels orders or
decrypts confidential handles.

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

`GET /health` defaults to port `8787` and returns only the chain, public keeper
address, ETH balance, cycle timestamps, last action, and error count. Set a public
`VITE_KEEPER_HEALTH_URL` in the frontend deployment to surface this status. The
optional webhook receives order ID, action, transaction, block, explorer URL, and
keeper address; webhook failure never changes the on-chain result.

## Verification

```bash
npm test
npm run compile
npm run keeper:dry
```

Live E2E, MCP, deployment, and Sourcify commands are documented in the repository
root README. Never pass a valuable mainnet key to this testnet project.
