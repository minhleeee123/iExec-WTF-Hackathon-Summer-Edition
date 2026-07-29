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
npm run test:safe:factory:full:sepolia --workspace @noxswap/contracts
npm run test:nox --workspace @noxswap/contracts # requires Docker
npm run verify:deployment
npm run test:safe:v6:candidate:sepolia --workspace @noxswap/contracts
npm run benchmark:router:candidate:sepolia --workspace @noxswap/contracts
```

`deployment-sepolia.json` is the canonical deployed-address artifact.
`client/abis.js` is the canonical minimal ABI surface consumed by the keeper and
MCP server. `npm run sync:client` writes deterministic snapshots to `apps/web/src/`
so the Vercel application remains self-contained. Push/PR tests fail if either
snapshot drifts from its canonical source.

Addresses and deployment transactions in the JSON are canonical. Mutable fields
such as `safe.moduleEnabled` describe the state captured when the artifact was
written; clients and audits must read current module/operator state from Sepolia.
The fixed `safe.address` and `safe.module` fields identify the registered legacy
demo instance. `safe.factory` is the canonical shared entry point, and each new
owner receives distinct Safe and bound-module addresses discovered on-chain.

Deployment and write-enabled E2E commands require `PRIVATE_KEY`; an explicit
`SEPOLIA_RPC_URL` is recommended instead of the public fallback. Copy only the
names you need from `.env.example` into an ignored `.env`; never use a valuable
mainnet key.

`npm run verify:deployment` is a read-only comparison of the canonical artifacts
with Sepolia deployment transactions and runtime code. `npm run verify:sourcify`
submits any unverified target for public source verification, so it is an
external publication action rather than a read-only check.

The Docker-backed Nox runtime suite starts the official local Nox service stack.
It remains separate from push CI because Docker is not available in every
development environment; live Sepolia verification covers the deployed path.

`deployment-sepolia-candidate.json` records public, sanitized candidate and
before/after benchmark evidence. It is not consumed by the frontend. A candidate
address becomes canonical only through its promotion workflow after a passing
live runtime test; rejected candidates remain isolated from the production
router/orderbook/module graph.
