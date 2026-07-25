# NoxSwap — Agent and Contributor Guide

## 1. Objective

This repository contains NoxSwap, an iExec Nox confidential DeFi application built for the iExec WTF Hackathon Summer Edition.

Preserve the working Ethereum Sepolia deployment, real Nox/ERC-7984 integration, short end-to-end demo flow, and judge-friendly repository structure.

## 2. Onboarding

Read these files before making changes:

1. `README.md` for the judge quick start, architecture, supported flows, and commands.
2. `PLAN.md` for the current submission status and remaining actions.
3. `docs/threat-model.md` for security and privacy boundaries.
4. `docs/verification.md` for remediation history and repeatable verification.

Consult the following files when a change depends on competition rules:

- `docs/competition-summary.md`
- `docs/competition-summary-detailed.md`
- `docs/requirements.md`
- `docs/judging-criteria.md`
- `docs/important-notes.md`

## 3. Source Priority

`docs/original/` stores source inputs. Do not assume every document there is official.

Use this priority order:

1. Official rules.
2. Official challenge or track page.
3. Official FAQ.
4. Sponsor technical documentation.
5. Official organizer email.
6. Third-party sources.
7. Unverified user-provided information.
8. Agent inference.

If a repository document conflicts with a higher-priority source, stop using the conflicting claim, verify the original source, update the relevant canonical document, and record the conflict in `docs/important-notes.md`.

## 4. Repository Map

- `apps/web/`: web client, landing page, and Vercel Agent API.
- `apps/keeper/`: stateless order keeper.
- `apps/mcp-server/`: MCP stdio server.
- `packages/contracts/`: Solidity contracts, deployment scripts, tests, and canonical client artifacts.
- `docs/`: competition context, threat model, and verification evidence.

Local submission drafts, slides, videos, and personal notes are not part of the public source repository unless the user explicitly requests otherwise.

## 5. Change Rules

- Keep sponsor technology central to the implemented flow.
- Do not replace real Nox behavior with mocks or plaintext shadow state.
- Preserve the documented privacy boundary and MetaMask signing authority.
- Do not expose secrets, private values, encrypted handles, signatures, or seed material in evidence or logs.
- Do not change deployed addresses, ABI snapshots, or canonical artifacts without completing the corresponding deployment and synchronization workflow.
- Avoid adding backends, databases, authentication, or major features unless they directly support an approved requirement.
- Keep judge-facing documentation concise, accurate, and reproducible.
- Distinguish official facts, project decisions, assumptions, and unverified information.

## 6. Validation

Run checks proportional to the change. Before a release or submission-facing commit, run:

```bash
npm test
npm run lint
npm run build
```

For contract or deployment changes, also use the relevant compile, synchronization, Sepolia, and verification commands documented in `README.md` and `packages/contracts/README.md`.

## 7. Submission Safety

- Keep `README.md` as the primary judge entry point.
- Preserve working live links and exact Sepolia addresses.
- Do not claim unsupported verification, multisig behavior, or privacy guarantees.
- Do not commit local submission media or private working notes accidentally.
- Update `PLAN.md` when the submission status, blocker, or next action changes.
