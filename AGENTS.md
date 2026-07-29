# NoxSwap — Agent and Contributor Guide

## 1. Objective

This repository contains NoxSwap, an iExec Nox confidential DeFi application built for the iExec WTF Hackathon Summer Edition.

Preserve the working Ethereum Sepolia deployment, real Nox/ERC-7984 integration, short end-to-end demo flow, and judge-friendly repository structure.

## 2. Onboarding

Read these files before making changes:

1. `README.md` for the judge quick start, architecture, supported flows, and commands.
2. `docs/README.md` for the public documentation map.
3. `docs/deployment.md` for environment, deployment, synchronization, and rollback.
4. `docs/threat-model.md` for security and privacy boundaries.
5. `docs/verification.md` for remediation history and repeatable verification.

When a change depends on competition rules, verify the current official source
instead of relying on an internal planning document or an unverified summary.

## 3. Repository Map

- `apps/web/`: web client, landing page, and Vercel Agent API.
- `apps/keeper/`: stateless order keeper.
- `apps/mcp-server/`: MCP stdio server.
- `packages/contracts/`: Solidity contracts, deployment scripts, tests, and canonical client artifacts.
- `docs/`: user, deployment, threat-model, and verification documentation.

Local submission drafts, slides, videos, and personal notes are not part of the public source repository unless the user explicitly requests otherwise.

## 4. Change Rules

- Keep sponsor technology central to the implemented flow.
- Do not replace real Nox behavior with mocks or plaintext shadow state.
- Preserve the documented privacy boundary and MetaMask signing authority.
- Do not expose secrets, private values, encrypted handles, signatures, or seed material in evidence or logs.
- Do not change deployed addresses, ABI snapshots, or canonical artifacts without completing the corresponding deployment and synchronization workflow.
- Avoid adding backends, databases, authentication, or major features unless they directly support an approved requirement.
- Keep judge-facing documentation concise, accurate, and reproducible.
- Distinguish official facts, project decisions, assumptions, and unverified information.

## 5. Validation

Run checks proportional to the change. Before a release or submission-facing commit, run:

```bash
npm test
npm run lint
npm run build
```

For contract or deployment changes, also use the relevant compile, synchronization, Sepolia, and verification commands documented in `README.md` and `packages/contracts/README.md`.

## 6. Submission Safety

- Keep `README.md` as the primary judge entry point.
- Preserve working live links and exact Sepolia addresses.
- Do not claim unsupported verification, multisig behavior, or privacy guarantees.
- Do not commit local submission media or private working notes accidentally.
