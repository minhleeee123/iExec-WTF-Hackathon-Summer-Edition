# Contributing to NoxSwap

NoxSwap is a Sepolia-only confidential DeFi prototype. Contributions should
preserve the real iExec Nox/ERC-7984 path, current deployment evidence, wallet
signing authority, and documented privacy boundary.

Use Node.js 22.12 or newer; Node.js 24 is recommended and used by CI.

## Development setup

```bash
git clone https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition.git
cd iExec-WTF-Hackathon-Summer-Edition
npm ci
npm run compile
npm test
npm run lint
npm run build
```

Docker is required only for `npm run test:nox`. Live Sepolia commands require a
funded test wallet and must never use or log a valuable key.

Read:

- [Documentation index](./docs/README.md)
- [Deployment guide](./docs/deployment.md)
- [Threat model](./docs/threat-model.md)
- [Verification record](./docs/verification.md)

## Change expectations

- Keep sponsor technology in the implemented settlement path.
- Do not replace encrypted behavior with mock or plaintext shadow state.
- Do not expose private values, handles, proofs, signatures, keys, or seed
  material in logs, tests, screenshots, or evidence.
- Do not edit generated web deployment/ABI snapshots directly.
- Keep public metadata and privacy claims consistent with the threat model.
- Add or update tests for behavior changes.
- Keep unrelated changes out of the same pull request.

For a contract or deployment change, follow the synchronization and exact-source
verification workflow in `docs/deployment.md`. Do not change a canonical address,
ABI, or deployment artifact without its corresponding on-chain and client update.

## Pull requests

A submission-facing pull request should pass:

```bash
npm run compile
npm test
npm run lint
npm run build
npm run sync:check --workspace @noxswap/contracts
npm run verify:deployment
```

Describe the user-visible impact, security/privacy impact, verification run, and
whether any external deployment changed.

## Security reports

Do not publish a private key, signature, confidential plaintext, or exploitable
unpatched vulnerability in a public issue. Use GitHub's private security
reporting channel when available. The current trust assumptions and known
limitations are documented in [`docs/threat-model.md`](./docs/threat-model.md).
