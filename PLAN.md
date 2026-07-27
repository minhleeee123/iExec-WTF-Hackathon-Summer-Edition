# Master Plan

> Initial status: Workspace handoff in preparation
> This file coordinates progress. Do not duplicate deadlines, requirements, or rubric details here.

## 1. Current Status

- Current phase: Phase 7 — Submission
- Status: In progress
- Next action: Publish the demo video and X submission post, then complete the
  final review.
- Current blocker: No technical blocker. Module V5 was re-enabled by the
  configured Safe owner and confirmed active at Sepolia block `11347078`.
- Awaiting approval from: None.
- Last updated: 2026-07-27T13:44:15+07:00

Allowed phase statuses: `Todo`, `In progress`, `Waiting for approval`, `Blocked`, `Completed`, `Skipped`.

## 2. Canonical Sources

| Content | Canonical File |
|---|---|
| Overview and Participation Fit Gate | `docs/competition-summary.md` |
| Detailed competition summary | `docs/competition-summary-detailed.md` |
| Requirements and submission checklist | `docs/requirements.md` |
| Rubric and weights | `docs/judging-criteria.md` |
| Source Register, deadline, conflicts, and unverified information | `docs/important-notes.md` |

## 3. Execution Plan

| Phase | Input | Work | Output | Approval Gate | Status |
|---|---|---|---|---|---|
| 0. Workspace handoff | Competition documents | Store sources, normalize context, and initialize plans | Valid workspace | User reviews handoff | Completed |
| 1. Context verification | Five canonical files in `docs/` | Resolve high-impact unknowns | Decision-ready context | User confirmation | Completed |
| 2. Research | Verified context | Research users, comparable products, and rubric benchmarks | Evidence Log, competitor/rubric benchmark, and research handoff | None | Completed |
| 3. Brainstorm | Research output | Apply hard gates, rubric scoring, and shortlist | Selected idea | User selects idea | Completed |
| 4. Product Definition | Selected idea | Define the MVP, non-goals, acceptance criteria, and demo scenario | Approved product scope | User approval | Completed |
| 5. Build Design | Approved product scope | Confirm the stack, architecture, milestones, verification, and risks | Approved implementation design | User approval | Completed |
| 6. Development | Approved Build Plan | Complete the core product, pass the Core Product Ready Gate, and deploy to Sepolia | Demo-ready application and landing page | Milestone verification | Completed |
| 7. Submission | Demo-ready application and landing page | Complete every mandatory deliverable | Complete submission | User final review | In progress |

## 4. Approval Log

| Gate | Decision | Confirmed By | Time | Evidence or Notes |
|---|---|---|---|---|
| Participation Fit | Approved | User | 2026-07-21T21:34:36+07:00 | The challenge requires a functional front end, end-to-end accessibility, Ethereum Sepolia deployment, UX, and iExec Nox integration. |
| Context verification | Approved | User | 2026-07-22T10:43:00+07:00 | The user confirmed the official deadline details (2026-08-02) and star-based rubric weights. |
| Idea selection | Approved | User | 2026-07-22T10:46:53+07:00 | Selected Option 1: NoxSwap — Confidential Liquidity & Swap Router. |
| Product Plan | Approved | User | 2026-07-22T10:56:00+07:00 | The user reviewed and approved the NoxSwap Product Plan. |
| Build Plan | Approved | User | 2026-07-22T10:56:30+07:00 | The user approved the NoxSwap Build Plan. |
| Core Development & Sepolia Deploy | Reopened | User | 2026-07-22 | An audit found that the previous deployment did not use the real Nox SDK/TEE; the user requested remediation and authorized redeployment with a test wallet. |
| Safe Treasury parity extension | Approved | User | 2026-07-24T00:10:25+07:00 | Implement configurable Safe swap tolerance/deadline, Safe activity, a draft-only Safe Strategy Agent, and Safe unwrap; keep direct Safe faucet, owner execute-order, and browser multisig out of scope. |
| Safe Treasury first-level workspace | Approved | User | 2026-07-24T12:45:00+07:00 | Move Safe out of Wallet into primary navigation while retaining all Wallet, Trade, Activity, and Safe capabilities with matching visual language. |
| Safe Treasury compact workspace | Approved | User | 2026-07-24T13:29:00+07:00 | Remove the redundant Overview and execution-context grid; retain Safe identity, threshold, module/signer state, four balances, reveal, and funding in a compact header above four operational sections. |
| Phase 6 final quality pass | Approved | User | 2026-07-24T14:10:00+07:00 | Align every Safe Treasury workflow with the established product UI/UX without removing capabilities, resolve remaining Phase 6 or rubric weaknesses, and leave Phase 7 to the user. |
| Phase 6 milestone verification | Completed | Codex verification | 2026-07-24T14:45:00+07:00 | Full compile/test/lint/build/UI regression passed; Safe workflows are visually unified, Lighthouse scored 92/100/100/100, a canonical MIT license exists, and the Phase 6-addressable rubric self-assessment is 12/12. |
| Safe wallet-prompt optimization | Approved | User | 2026-07-24T19:55:00+07:00 | Reopen Phase 6 to batch Safe ACL/input operations, use Safe 1-of-1 prevalidated signatures, preserve multisig authority, migrate Sepolia, test live, and redeploy production. |
| Safe wallet-prompt optimization verification | Completed | Codex verification | 2026-07-24T21:10:00+07:00 | Module V5 is live; batched input/viewer operations, prevalidated Safe execution, auto-operator restoration, four post-swap ACLs, Gateway-lag retries, full regression, responsive UI, and canonical production smoke all passed. |
| Production MetaMask rehearsal | Completed | User | 2026-07-25T14:23:06+07:00 | The user confirmed that the production MetaMask happy path works reliably on the public URL. |
| Final submission | Pending |  |  |  |

## 5. Blockers and Open Questions

| ID | Blocker/Question | Affected Phase | Impact | Owner | Status | Reference |
|---|---|---|---|---|---|---|
| BLK-001 | Submission deadline timezone was not independently verified | 1+ | Medium | User/Organizer | Closed | `docs/important-notes.md` |
| BLK-002 | The provided brief did not include a separate numerical percentage rubric | 1+ | Medium | User/Organizer | Closed | `docs/judging-criteria.md` |

## 6. Next Actions

1. Publish the prepared demo video, which is under four minutes.
2. Publish the X submission post with the live app, GitHub repository, video, and `@iEx_ec`.
3. Complete the canonical submission checklist and final review.

## 7. PLAN.md Update Rules

- Update `Current Status` when a phase starts or ends.
- Only one phase may be `In progress`.
- Do not begin a phase whose Approval Gate has not passed.
- When blocked, record the blocker, owner, and impact.

## 8. Completion Checklist

- [x] The user reviewed the competition context.
- [x] Research includes evidence and sources.
- [x] The user selected the final idea.
- [x] The Product Plan was approved.
- [x] The Build Plan was approved.
- [x] The Core Product Ready Gate passed again after remediation and approved feature extensions.
- [x] The landing page reflects the real product and its CTA works.
- [x] Real Nox/ERC-7984 smart contracts were redeployed and tested on Ethereum Sepolia.
- [x] The public confidential orderbook and stateless keeper were deployed and tested with real Sepolia orders.
- [x] The orderbook/keeper uses an incremental lifecycle-event index with rebuildable checkpoints; linear historical ID scans were removed.
- [x] Push/PR CI and manual secret-protected Sepolia E2E workflows were added and syntax-checked.
- [x] The threat model, positive default minOut, arbitrary-wallet E2E, MCP write flow, and sanitized evidence artifacts were implemented; live Sepolia verification passed.
- [x] A Docker-backed Nox runtime integration suite and nightly/manual workflow were added; local execution is skipped because Docker is unavailable in this workspace.
- [x] Groq Strategy Agent, the nine-tool MCP v4 adapter, and the fail-open keeper observer have unit, responsive, and live-provider evidence without granting AI transaction authority.
- [x] The server-side Groq secret is configured on Vercel; public planner/observer endpoints and `/app/trade?mode=agent` pass production smoke tests.
- [x] The production frontend is deployed and public read-only smoke tests pass at `https://noxswap-iexec.vercel.app`.
- [x] Safe v1.4.1 treasury, allowlisted Nox module, private swap, selective viewer, module revoke/re-enable, and confidential order create/cancel have live Sepolia evidence.
- [x] Safe swap tolerance/deadline, on-chain Activity, draft-only Strategy Agent, and recoverable Safe unwrap have unit, responsive, contract, and live Sepolia evidence.
- [x] Safe Treasury is a first-level desktop/mobile workspace with a compact custody header and four URL-addressable sections; Wallet, Trade, Activity, Landing, and Docs retain their previous content and pass responsive regression.
- [x] Safe Module V5 batches amount/minOut and viewer operations, automatically restores allowlisted operators, uses prevalidated 1-of-1 execution, survives Nox indexing delay, retains cross-version Activity, and passes live receipt #32 plus production smoke.
- [x] Safe Orders reuses the complete Trade public-orderbook UX; execution/expiry remain permissionless, cancellation remains Safe-owner/module controlled, and the keeper indexes both orderbooks with a shared bounded write budget.
- [x] Safe order parity includes minute-level expiry, creation readiness, explicit live OrderBook operator revoke/authorize, and owner-only batched ACL term reveal with live Sepolia decryption evidence.
- [x] Official `README.md` and `feedback.md` files exist at the repository root.
- [x] The required iExec Hello World onboarding journey was completed and recorded
  with sanitized Sepolia deployment, encrypted-deposit, and authorized-decryption
  evidence in `docs/verification.md`.
- [ ] The canonical submission checklist is complete.
- [ ] The submission has passed final review.
