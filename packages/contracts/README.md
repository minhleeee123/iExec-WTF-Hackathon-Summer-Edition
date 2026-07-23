# NoxSwap Contracts

Canonical Solidity, Hardhat, Sepolia deployment data, browser-safe ABI surface,
deployment scripts, and confidential-protocol verification for NoxSwap.

## Commands

Run from the repository root:

```bash
npm run compile
npm run test:contracts
npm run sync:client
npm run deploy:sepolia --workspace @noxswap/contracts
npm run test:sepolia --workspace @noxswap/contracts
npm run test:nox --workspace @noxswap/contracts # requires Docker
```

`deployment-sepolia.json` is the canonical deployed-address artifact.
`client/abis.js` is the canonical minimal ABI surface consumed by the keeper and
MCP server. `npm run sync:client` writes deterministic snapshots to `apps/web/src/`
so the Vercel application remains self-contained. Push/PR tests fail if either
snapshot drifts from its canonical source.

Live deployment and E2E commands require `PRIVATE_KEY` and `SEPOLIA_RPC_URL`.
Copy only the names you need from `.env.example` into an ignored `.env`; never use
a valuable mainnet key.

The Docker-backed Nox runtime suite starts the official local Nox service stack.
It remains separate from push CI because Docker is not available in every
development environment; live Sepolia verification covers the deployed path.
