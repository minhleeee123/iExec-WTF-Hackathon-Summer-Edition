# NoxSwap Frontend

React/Vite client for the live NoxSwap Router V2 and confidential limit-order deployment on Ethereum Sepolia.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test:unit
npm run test:ui
npm run build
```

`test:ui` checks desktop/mobile layout, the wallet-free public orderbook, URL-backed filters, responsive order detail, and a read-only EIP-1193 wallet provider for faucet cooldown messaging and amount validation. It never sends a transaction or uses a private key.

## Source layout

- `src/App.jsx`: route-safe application state and wallet transaction orchestration.
- `src/pages/`: lazy-loaded workflow pages and the public landing page.
- `src/components/`: UI grouped by product workflow.
- `src/config.js`: deployed token configuration and initial state factories.
- `src/contracts.js`: minimal contract ABIs used by the client.
- `src/lib/nox.js`: Nox Handle SDK loading and bounded retry helper.
- `src/lib/history.js`: RPC-compatible event history query with bounded block-range fallback.
- `src/lib/orders.js`: contract/operational status and permission policy.
- `src/lib/order-filters.js`: public filtering, sorting, and pagination.
- `src/lib/order-url-state.js`: privacy-safe shareable orderbook URL state.
- `src/lib/format.js`: handle, token, receipt, and duration formatting.
- `src/lib/validation.js`: shared amount and faucet cooldown validation.
- `src/deployment.json`: canonical Sepolia addresses synchronized from the backend deployment.

## Routes

- `/`: standalone product landing page and live deployment evidence. The wallet and
  application navigation are intentionally hidden until the user launches the app.
- `/app/trade`: protected swaps and confidential limit orders, selected with a
  URL-backed workflow tab.
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

## Private balances

The client never substitutes plaintext or mock balances for an encrypted balance. The eye control asks the connected wallet for the EIP-712 authorization required by the Nox Handle Gateway, then displays the returned plaintext only in local React state. Changing account/network or completing a balance-changing transaction hides and clears stale private balance state.
