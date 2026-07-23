# NoxSwap Frontend

React/Vite client for the live NoxSwap Router V2 and confidential limit-order deployment on Ethereum Sepolia.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test:unit
npm run test:agent:live
npm run test:ui
npm run build
```

`test:ui` checks desktop/mobile layout, the wallet-free public orderbook, URL-backed filters, responsive order detail, and a read-only EIP-1193 wallet provider for faucet cooldown messaging and amount validation. It never sends a transaction or uses a private key.

## Source layout

- `src/App.jsx`: route-safe application state and wallet transaction orchestration.
- `src/pages/`: lazy-loaded workflow pages and the public landing page.
- `src/components/`: UI grouped by product workflow.
- `src/config.js`: deployed token configuration and initial state factories.
- `src/contracts.js`: generated browser-safe ABI snapshot from `packages/contracts/client/abis.js`.
- `src/lib/nox.js`: Nox Handle SDK loading and bounded retry helper.
- `src/lib/history.js`: RPC-compatible event history query with bounded block-range fallback.
- `src/lib/orders.js`: contract/operational status and permission policy.
- `src/lib/order-filters.js`: public filtering, sorting, and pagination.
- `src/lib/order-url-state.js`: privacy-safe shareable orderbook URL state.
- `src/lib/format.js`: handle, token, receipt, and duration formatting.
- `src/lib/validation.js`: shared amount and faucet cooldown validation.
- `src/lib/agent-plan.js`: strict Groq plan schema and semantic validation.
- `src/lib/agent-compile.js`: session-local percentage amount compilation.
- `api/agent/`: server-only Groq planner and keeper-observer endpoints.
- `src/deployment.json`: generated Sepolia snapshot from the canonical contracts workspace artifact.

## Routes

- `/`: standalone product landing page and live deployment evidence. The wallet and
  application navigation are intentionally hidden until the user launches the app.
- `/docs`: public user documentation for onboarding, encrypted balances, protected
  swaps, confidential limit orders, privacy boundaries, troubleshooting, and the
  deployed Sepolia contract addresses.
- `/app/trade`: protected swaps, confidential limit orders, and the Strategy
  Agent, selected with a URL-backed workflow tab.
- `/app/wallet`: test faucets, wrap/unwrap, and auditor access grants.
- `/app/activity`: wallet history, execution logs, proofs, and receipt evidence.

Wallet, network, reveal, and transaction state live above the router, so navigating
between workflows does not reset the connected session. On desktop, account, gas,
refresh, and private-balance reveal controls remain in the application sidebar. On
mobile they are available in the wallet drawer, while the three primary workflows
use bottom navigation. Legacy URLs redirect to the consolidated routes.

`vercel.json` provides the SPA fallback required when a route is opened directly on
Vercel.

## Live workflows

- Protected encrypted swaps with encrypted `minOut`, deadline, output, and refund handles.
- Chainlink-derived positive `minOut` suggestions with an explicit opt-in before zero-protection settlement.
- Three live pools: cUSDC/cETH, cWBTC/cUSDC, and cSOL/cUSDC.
- Chainlink-triggered confidential cUSDC/cETH limit-order create, execute, cancel, and expiry refund.
- Wallet-free public orderbook with isolated RPC failures, owner-only reveal, permissionless manual settlement, and optional keeper health.
- Four faucet/wrap/unwrap asset flows with balance-aware validation.
- Gateway signature evidence after authorized SDK decryption and measured ETH/USDC execution deviation.
- Groq strict-schema intent planning with public Chainlink context, local private-balance compilation, and explicit MetaMask review.

## Groq configuration

Copy `.env.example` to the ignored `.env.local` and set `GROQ_API_KEY`. The key is
read only by Vite's local server middleware and Vercel Functions; it is never
available through `import.meta.env`. Do not rename it with a `VITE_` prefix.

`POST /api/agent/plan` accepts only `intent` plus public `ethPriceUsd`,
`oracleUpdatedAt`, and `blockTimestamp`. `POST /api/agent/observe` accepts only
public keeper decision/result metadata and requires the server-side
`KEEPER_OBSERVER_SECRET`. The observer is limited to five requests per minute and
bounded request bodies. Neither endpoint accepts a wallet address, balance, handle,
proof, signature, or private key.

## Private balances

The client never substitutes plaintext or mock balances for an encrypted balance. The eye control asks the selected EIP-6963 wallet provider for the EIP-712 authorization required by the Nox Handle Gateway, then displays the returned plaintext only in local React state. Changing account/network clears stale private balance state. When a user starts a balance-changing operation with balances revealed, the client reads the newly confirmed handles and requests fresh decryption instead of retaining stale plaintext.

Swap suggestions use a configurable Chainlink-reference tolerance from 0.5% to 10%, defaulting to 5% for the deployed test pools. This is not a pool quote: reserves and price impact remain confidential, so the UI explicitly warns that a stricter minimum can still produce a full protected refund.

Limit-order authorization can be revoked per input token with `setOperator(orderBook, 0)`. Revocation prevents new escrow transfers and does not cancel or refund an existing order.
