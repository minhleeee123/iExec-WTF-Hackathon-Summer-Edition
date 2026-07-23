# NoxSwap Keeper

Stateless, permissionless lifecycle worker for the deployed confidential limit
order book. It reads public order events, builds a rebuildable finalized
checkpoint, rechecks every candidate, and can call only `executeOrder` or
`expireOrder`. It never decrypts confidential terms or cancels owner orders.

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

The checkpoint contains only chain ID, contract address, finalized block, and
public active order IDs. It is disposable and can be rebuilt from lifecycle
events. Polling mode exposes a public-data-only `GET /health` endpoint and can
optionally emit webhook notifications or send deterministic outcomes to the
Groq observer. Observer failures never block settlement.
