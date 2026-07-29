# NoxSwap Documentation

Use this page as the documentation index for the public repository.

| Guide | Purpose |
|---|---|
| [User guide](./user-guide.md) | Wallet preparation, personal swaps, confidential orders, Safe Treasury, selective disclosure, and troubleshooting |
| [Deployment guide](./deployment.md) | Local setup, environment variables, Sepolia workflows, artifact synchronization, Vercel deployment, and post-deployment checks |
| [Threat model](./threat-model.md) | Confidentiality boundary, public metadata, privileged roles, compromise impact, and known limitations |
| [Verification record](./verification.md) | Repeatable checks, live Sepolia evidence, source verification, and remediation history |
| [Contracts workspace](../packages/contracts/README.md) | Contract commands, canonical deployment artifacts, and Nox runtime testing |
| [Web workspace](../apps/web/README.md) | Frontend routes, Groq configuration, and private-balance behavior |
| [Keeper workspace](../apps/keeper/README.md) | Stateless order execution/expiry worker and health endpoint |
| [MCP workspace](../apps/mcp-server/README.md) | Read-only defaults, opt-in writes, and available MCP tooling |
| [iExec developer feedback](../feedback.md) | Required implementation-based feedback on the Nox protocol and tooling |
| [Contributing](../CONTRIBUTING.md) | Development checks, change expectations, and security reporting |

The canonical public deployment is Ethereum Sepolia. Contract addresses and
deployment transactions are stored in
[`packages/contracts/deployment-sepolia.json`](../packages/contracts/deployment-sepolia.json).
Do not treat testnet assets as valuable or use a mainnet key with any repository
command.
