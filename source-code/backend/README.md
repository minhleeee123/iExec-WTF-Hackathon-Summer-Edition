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

## Verification

```bash
npm test
npm run compile
npm run keeper:dry
```

Live E2E, MCP, deployment, and Sourcify commands are documented in the repository
root README. Never pass a valuable mainnet key to this testnet project.
