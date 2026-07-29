# NoxSwap Keeper

Stateless, permissionless lifecycle worker for the deployed personal and Safe
confidential limit order books. It reads public order events, builds a separate
rebuildable finalized checkpoint for each contract, rechecks every candidate,
and can call only `executeOrder` or `expireOrder`. It never decrypts
confidential terms or cancels owner orders. The configured action cap is shared
across both books in each polling cycle.

See the repository [deployment guide](../../docs/deployment.md) for the shared
environment and release workflow.

## Commands

Run from the repository root:

```bash
npm run test:keeper
npm run keeper:dry
npm run keeper:once
npm run keeper
```

Dry-run mode requires no signing key. Write mode requires `KEEPER_PRIVATE_KEY`
and refuses writes below `KEEPER_MIN_ETH`. Copy configuration names from
`.env.example` into an ignored `apps/keeper/.env` when running the workspace
directly.

Each checkpoint contains only chain ID, contract address, finalized block, and
public active order IDs. The personal path uses `KEEPER_CHECKPOINT_FILE`; the
Safe path uses `KEEPER_SAFE_CHECKPOINT_FILE`. Both are disposable and can be
rebuilt from lifecycle events. Polling mode exposes a public-data-only
`GET /health` endpoint and can optionally emit webhook notifications or send
deterministic outcomes to the Groq observer. Logs and webhooks identify the
source orderbook. Observer failures never block settlement.
