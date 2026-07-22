# NoxSwap Frontend

React/Vite client for the live NoxSwap deployment on Ethereum Sepolia.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run test:unit
npm run test:ui
npm run build
```

`test:ui` checks desktop/mobile layout and uses a read-only EIP-1193 provider backed by Sepolia to verify faucet cooldown messaging and amount validation. It never sends a transaction or uses a private key.

## Source layout

- `src/App.jsx`: application state and wallet transaction orchestration.
- `src/components/`: UI grouped by product workflow.
- `src/config.js`: deployed token configuration and initial state factories.
- `src/contracts.js`: minimal contract ABIs used by the client.
- `src/lib/nox.js`: Nox Handle SDK loading and bounded retry helper.
- `src/lib/history.js`: RPC-compatible event history query with bounded block-range fallback.
- `src/lib/format.js`: handle, token, receipt, and duration formatting.
- `src/lib/validation.js`: shared amount and faucet cooldown validation.
- `src/deployment.json`: canonical Sepolia addresses synchronized from the backend deployment.

## Private balances

The client never substitutes plaintext or mock balances for an encrypted balance. The eye control asks the connected wallet for the EIP-712 authorization required by the Nox Handle Gateway, then displays the returned plaintext only in local React state. Changing account/network or completing a balance-changing transaction hides and clears stale private balance state.
