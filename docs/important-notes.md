# Important Notes

> Status: Active; updated during implementation validation
> This file manages sources, deadlines, conflicts, disqualification risks, and unverified information.

## 1. Source Register

| Source ID | Source Name | Source Type | File/URL | Publisher | Accessed | Priority |
|---|---|---|---|---|---|---:|
| SRC-001 | User-provided challenge brief for iExec WTF Hackathon Summer Edition | User-provided | `docs/original/user-provided-challenge-brief.md` | User-provided | 2026-07-21T21:34:36+07:00 | 7 |
| SRC-002 | Safe Smart Account concepts and module architecture | Official technical documentation | `https://docs.safe.global/advanced/smart-account-concepts` | Safe | 2026-07-23 | 4 |

## 2. Deadline

- Local timezone used for conversion: GMT+7 (Indochina Time)

| Milestone | Original Time | Original Timezone | Local Time (GMT+7) | Source ID | Status |
|---|---|---|---|---|---|
| Pre-registration | 2026/07/02 05:00 | Unknown, possibly UTC | 2026/07/02 05:00 | User | Confirmed |
| Submission opens | 2026/07/06 05:00 | Unknown, possibly UTC | 2026/07/06 05:00 | User | Confirmed |
| Submission deadline | 2026/08/02 04:59 | Unknown, possibly UTC | 2026/08/02 04:59 | User | Confirmed |

## 3. Source Conflicts

| Topic | Information A | Source ID A | Information B | Source ID B | Resolution | Status |
|---|---|---|---|---|---|---|
| Not yet reviewed |  |  |  |  |  | Open |

## 4. Disqualification or Judging Risks

| Risk | Evidence/Source ID | Impact | Mitigation |
|---|---|---|---|
| Reusing a project from the previous Vibe Coding Hackathon leads to disqualification | SRC-001 | High | Confirm that the project is new and does not reuse a previous entry. |
| Missing Ethereum Sepolia deployment or end-to-end accessibility | SRC-001 | High | Demonstrate the real Sepolia flow and avoid mock data in the core experience. |
| Missing public GitHub repository, README, docs, `feedback.md`, or X submission post | SRC-001 | High | Keep every mandatory deliverable in the submission scope. |
| Production MetaMask write-flow regression | User confirmation, 2026-07-25 | Closed | The user confirmed the happy path on the public URL; repeat only if the production build changes. |
| Local Nox integration stack cannot run because Docker is unavailable | Nox Hardhat plugin runtime check, 2026-07-22 | Low | Use compile/unit tests and live Sepolia E2E; rerun local integration in Docker-enabled CI when available. |
| Docker-backed Nox integration workflow has no completed run evidence | Internal implementation validation, 2026-07-23 | Low | The nightly/manual workflow exists; run it on GitHub and keep it separate from required PR checks until stable. |
| Safe Module V5 and Safe orderbook do not yet have public Sourcify records | Read-only Sourcify lookup, 2026-07-25 | Medium | Deployment consistency passes; verification targets are prepared but must be submitted only after user authorization. |
| Safe input proofs cannot use a Safe contract as the EOA Gateway owner | Live Sepolia smoke test, 2026-07-23 | Closed | A Safe owner prepares persistent Nox ACLs in the allowlisted module; only the Safe threshold can settle and spend treasury balances. |
| A standard Safe cannot receive the router's ERC-721 receipt callback | Live Sepolia smoke test, 2026-07-23 | Closed | Assets and refunds stay in Safe custody; the receipt owner is restricted to a verified Safe-owner EOA. |
| Safe Module V5 is currently disabled | Read-only `isModuleEnabled` and module-list query, 2026-07-25 | High for the owner-controlled Safe demo | The Safe still has its expected sole owner and threshold 1. The configured owner must review and enable canonical Module V5 before module-routed swaps, order create/cancel, ACL/operator, unwrap, or revoke flows. Permissionless Safe-order execute/expiry remains available. |
| MCP SDK includes two moderate `@hono/node-server` advisories | `npm audit --omit=dev`, rerun 2026-07-25 | Low | MCP runs only over stdio on Linux and does not start the affected static HTTP server; avoid a forced incompatible SDK downgrade and monitor upstream fixes. |
| React Router packages report two high Framework/RSC action advisories | `npm audit --omit=dev --workspace @noxswap/web`, 2026-07-25 | Low for the current architecture | The deployed Vite SPA uses declarative `BrowserRouter` and defines no React Router server actions, loaders, framework server, or RSC endpoints. Monitor for a compatible patched release and reassess if the routing architecture changes. |

## 5. Unverified Information

| Topic | Sources Checked | Unknown | Impact | Required Owner |
|---|---|---|---|---|
| Official submission portal beyond the X post | SRC-001 | Whether an additional form or submission step exists | Affects the submission checklist | User/Organizer |

## 6. Questions to Resolve

| Question | Why It Matters | Required By | Status |
|---|---|---|---|
| Is there an official submission portal beyond the X post? | Confirms every required submission channel | Before submission | Open |

## 7. Inferences and Assumptions

| Statement | Type | Basis | Requires User Approval? |
|---|---|---|---|
| A web/mobile app is a suitable format | Inference | The brief requires a functional front end, UX, and end-to-end accessibility | No; the fit gate is already approved |
| The temporary official website reference is the iExec Linktree | Inference | The link appears in the brief but has not been independently verified | Yes |

## 8. Safe Composability Validation

- Canonical Sepolia Safe: `0x549585Be4d75b388B4f825E0bCbBaA85B4FbfffF` (Safe v1.4.1, threshold 1).
- Canonical allowlisted Nox module V5 `0xF68B864b600dBb8cbCB7524899bF79B2ec2Dfbe2` and Safe orderbook `0xd8037cb70163eC52aa774f54590BB266ee0d9908` are recorded in `packages/contracts/deployment-sepolia.json`.
- The personal orderbook at `0xab903F78edEAF96faE78c0BF46810122fC9896fb`
  has an exact Sourcify match to repository revision `407d770`; the current
  `NoxLimitOrderBook.sol` is the later Safe-compatible revision and exactly
  matches the Safe orderbook creation bytecode instead.
- Live protected swap receipt #29 passed with the 10% default oracle tolerance;
  authorized Safe balance decryption succeeded and the plaintext value is omitted
  from public evidence.
- Safe confidential order #1 was created and cancelled through the module; the encrypted input was refunded.
- The Safe orderbook exposes the same public lifecycle, filters, details, and
  readiness controls as the personal Trade orderbook. The dual-book keeper
  permissionlessly executed trigger-ready Safe order #3 in transaction
  `0xf9c71fa94ae7bb3c175cf000c646c2c3db645fe9e90cf120465da3c3450e29e2`.
  As of the 2026-07-25 audit, Safe order #4 remains `Open` in contract storage but
  is past expiry and eligible for permissionless refund.
- Safe order #4 term-reveal validation batch-granted the owner viewer ACL for both amount/minOut handles in transaction `0xb1c34f5ca8b60fedb2e522d873422533caa95e1a43310c505ec77bf427d357fe`; both values decrypted successfully and were redacted from test output.
- Module revoke and owner-controlled re-enable were previously confirmed on
  Sepolia. A later read-only audit on 2026-07-25 found no enabled modules, so the
  canonical V5 module must be enabled again before owner-controlled Safe module
  operations.
- Auditor access is per-handle Nox viewer access only and does not grant token operator or Safe signing authority.
- Safe module V5 was deployed in transaction `0xe3017ef17fa515cbe50787fe775b1ead860b2b420a97fd23f36168528f3ad70a`, enabled in `0x1259be1fabe9501c066afe4a41cd21f51f8fd3cafe0fa8d647fa9f66e1ac6bfb`, and the preceding module was disabled only after V5 became active; the existing Safe orderbook was intentionally retained.
- V5 prompt-optimization evidence includes two ciphertext inputs prepared in one transaction (`0x1fe24270bdc0f75d553caf9f0cfa059a15c24a721c0bdbc2c9d9bfd0a351bc2a`) and a prevalidated Safe batch-viewer execution (`0x85212298df23eff1af488c7ceeb586875d04b018c15ee497dc9300647124fc33`).
- Live receipt #32 verified automatic router-operator restoration, output/refund viewer ACLs, refreshed input/output balance ACLs, and post-indexing decryption through V5; the final passing regression settled in Safe transaction `0x0954954a2c297a8e4227da9bceb77aa60b3ba8b657f98b1ceacdef09d4431cbb`.
- Live Safe unwrap prepared its ciphertext ACL in `0x5d2e2f4ce6675a6d07e39bf112f071238d0894e2d6065de1107f881545104a57`, created request `0x0000aa36a7230112e2da3a5cacbbb742b709eda9b615a3524b7ad30046cd0857` through Safe transaction `0x9751ef8c8f998a3796183c8f03a6168fabae1541293a495307a7cccecd9f5cf7`, and finalized the exact one-base-unit public release in `0x146b9e2d482b137297b6a3ccb806afcddb8736387e9a3f76915df0473f8cde2e`.
- Safe Treasury is exposed at `/app/safe` as a first-level workspace. The Wallet tab was removed without removing Wallet Assets or Auditor Access; `/app/wallet?tab=safe` redirects to the new route for compatibility.
- The Safe workspace intentionally has no Overview section: Safe identity, owner threshold, module/signer state, four encrypted balances, reveal, and funding are consolidated in its compact custody header above Swap & Unwrap, Orders & Agent, Activity, and Access & Security.
- Optimized frontend deployment `dpl_5tceTxxJ7qRCw97LEwz7VVyrK1S7` is READY and aliased to `https://noxswap-iexec.vercel.app`; production browser smoke at 1280×900 and 390×844 loaded four real Safe orders, hid reveal from public readers, exposed owner-only term reveal, preserved minute expiry and explicit operator controls, and showed no horizontal overflow.
