# NoxSwap Deployment Guide

This guide covers local setup, the canonical Sepolia deployment workflow, client
artifact synchronization, Vercel deployment, and post-deployment verification.

NoxSwap is hackathon testnet software. Use only funded Sepolia test wallets and
never use a mainnet or valuable key.

## 1. Deployment model

The public application uses:

- Ethereum Sepolia (`chainId` `11155111`);
- the contracts recorded in
  [`packages/contracts/deployment-sepolia.json`](../packages/contracts/deployment-sepolia.json);
- generated browser snapshots in `apps/web/src/deployment.json` and
  `apps/web/src/contracts.js`;
- a Vite frontend plus Vercel Functions under `apps/web/`;
- optional stateless keeper and MCP clients.

`npm run deploy:sepolia` is intentionally an **extension deployment**, not a
clean-slate protocol installer. It reuses the original nUSDC/nWETH wrappers,
requires the existing deployment owner, deploys the four-token Router V2 graph,
initializes the three encrypted pools, and rewrites the canonical deployment
snapshot. This protects the exact source-to-deployment mapping used by the live
demo.

A fork that needs a completely new deployment must provide its own initial
nUSDC/nWETH deployment record and review all constructor inputs, liquidity
amounts, Chainlink feed addresses, NoxCompute address, and Safe infrastructure
before adapting the extension script. Do not point the current production UI at
partially deployed contracts.

## 2. Prerequisites

- Git.
- npm.
- Node.js 22.12 or newer. Node.js 24 is recommended and used by CI and
  repository tooling.
- Docker only for the local Nox runtime integration suite.
- A funded Sepolia wallet for live writes.
- An archive-capable Sepolia RPC for reliable historical event indexing.
- A Vercel account for frontend deployment.
- Optional Groq credentials for Strategy Agent features.

Clone and install:

```bash
git clone https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition.git
cd iExec-WTF-Hackathon-Summer-Edition
npm ci
```

Validate the source before configuring a signer:

```bash
npm run compile
npm test
npm run lint
npm run build
npm run verify:deployment
```

## 3. Environment variables

Copy only the variables required by the component being run. All real `.env`
files are ignored by Git.

| Variable | Component | Required | Purpose |
|---|---|---:|---|
| `SEPOLIA_RPC_URL` | Contracts, keeper, MCP | Recommended | Sepolia JSON-RPC endpoint |
| `PRIVATE_KEY` | Contract deployment/live E2E/MCP signer | For writes | Funded Sepolia test-wallet signer |
| `VITE_SEPOLIA_ARCHIVE_RPC_URL` | Web | Optional | Archive-capable public history reads |
| `VITE_KEEPER_HEALTH_URL` | Web | Optional | Public keeper `/health` endpoint |
| `GROQ_API_KEY` | Web server functions | Optional | Server-side Strategy Agent credential |
| `GROQ_MODEL` | Web server functions | Optional | Groq model override |
| `KEEPER_OBSERVER_SECRET` | Web observer function | Optional | Bearer secret for keeper observations |
| `KEEPER_PRIVATE_KEY` | Keeper | For writes | Dedicated low-value Sepolia keeper signer |
| `MCP_ALLOW_WRITES` | MCP | For writes | Explicit opt-in in addition to `PRIVATE_KEY` |

Templates:

- `packages/contracts/.env.example`
- `apps/web/.env.example`
- `apps/keeper/.env.example`
- `apps/mcp-server/.env.example`

Never prefix `GROQ_API_KEY` or `KEEPER_OBSERVER_SECRET` with `VITE_`; that would
expose them to browser JavaScript. Never print signing keys, EIP-712
authorizations, encrypted proofs, or decrypted values in deployment logs.

## 4. Local web deployment

The public read path works without secrets:

```bash
npm run dev
```

Open `http://localhost:5173`.

For local Strategy Agent support:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill only `GROQ_API_KEY` and any optional public RPC/keeper values. The local
Vite middleware exposes `/api/agent/plan` and `/api/agent/observe` with the same
server-only boundary used by Vercel.

Create and inspect a production build:

```bash
npm run build
npm run preview --workspace @noxswap/web
```

## 5. Canonical Sepolia contract workflow

Only the recorded deployment owner can run the canonical extension or Safe
factory scripts. These commands change external state and spend Sepolia ETH.

1. Confirm the working tree, chain ID, owner wallet, RPC, and wallet balance.
2. Compile and run the local release checks.
3. Set signer variables in the current shell or ignored contracts `.env`.
4. Run the intended deployment command.
5. Review every receipt and the generated deployment diff before committing it.

Extension deployment:

```bash
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" \
SEPOLIA_RPC_URL="YOUR_SEPOLIA_RPC_URL" \
npm run deploy:sepolia
```

Per-account Safe factory deployment, when the canonical snapshot does not
already contain a live factory:

```bash
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" \
SEPOLIA_RPC_URL="YOUR_SEPOLIA_RPC_URL" \
npm run deploy:safe:factory:sepolia --workspace @noxswap/contracts
```

The scripts synchronize canonical contract data into the web workspace. Verify
that synchronization explicitly:

```bash
npm run sync:check --workspace @noxswap/contracts
npm run verify:deployment
```

For a new or changed deployment, also run the relevant live tests documented in
the [contracts workspace guide](../packages/contracts/README.md). Live tests
write sanitized evidence under ignored `packages/contracts/artifacts/evidence/`.

`npm run verify:sourcify` publishes source verification for unverified targets.
It is not a read-only command and should run only after constructor arguments,
bytecode, addresses, and source provenance have been reviewed.

## 6. Vercel deployment

The Vercel project uses `apps/web` as its application directory:

- framework: Vite;
- install command: `npm install`;
- build command: `npm run build`;
- output directory: `dist`;
- server functions: `api/`;
- SPA route fallback: `vercel.json`.

Create or link the project through the Vercel dashboard, set the application
directory to `apps/web`, and add environment variables for the intended
Production/Preview environments. `GROQ_API_KEY`, `GROQ_MODEL`, and
`KEEPER_OBSERVER_SECRET` must remain server-side. `VITE_*` values are public and
embedded at build time.

With a linked Vercel CLI project:

```bash
cd apps/web
npx vercel --prod
```

Every deployment URL is public production evidence. Review the exact source
commit and build output before assigning the canonical alias.

## 7. Keeper and MCP deployment

The keeper is stateless. Start with a read-only dry run:

```bash
npm run keeper:dry
```

Write mode requires a dedicated `KEEPER_PRIVATE_KEY`, minimum-balance policy,
and explicit configuration from `apps/keeper/.env.example`. It can only execute
or expire orders.

The MCP server starts read-only:

```bash
npm run mcp
```

Decryption requires a signer with Nox ACL access. Transaction tools require both
`PRIVATE_KEY` and `MCP_ALLOW_WRITES=true`. Do not configure a valuable wallet.

## 8. Post-deployment verification

Run:

```bash
npm run compile
npm test
npm run lint
npm run build
npm run sync:check --workspace @noxswap/contracts
npm run verify:deployment
```

Then smoke-test:

- `/` and `/docs`;
- `/app/trade?mode=orders` without a wallet;
- wallet connect and correct-network detection;
- faucet, wrap, protected swap, authorized reveal, and receipt;
- Safe discovery/create state for the connected owner;
- Safe module/operator state read from Sepolia;
- transaction links and public lifecycle history.

Before publishing evidence, confirm that no private key, plaintext confidential
value, encrypted handle/proof, authorization signature, or seed material appears
in logs or artifacts.

## 9. Rollback and synchronization safety

- Do not edit generated `apps/web/src/deployment.json` or
  `apps/web/src/contracts.js` manually.
- Do not change a canonical address or ABI without its deployment receipt and
  synchronization workflow.
- Do not promote an experimental candidate based only on compilation or gas
  estimates; require live settlement and exact source verification.
- If a frontend release fails, restore the last verified Vercel version without
  changing the canonical Sepolia graph.
- If a contract candidate fails, revoke temporary operators and leave the
  current router/orderbook/module graph unchanged.

The [verification record](./verification.md) contains the current exact-source
and live-flow evidence. The [threat model](./threat-model.md) defines what a
deployment does and does not protect.
