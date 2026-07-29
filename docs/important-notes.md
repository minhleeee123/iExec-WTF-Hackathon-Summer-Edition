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
| Safe input proofs cannot use a Safe contract as the EOA Gateway owner | Live Sepolia smoke test, 2026-07-23 | Closed | A Safe owner prepares persistent Nox ACLs in the allowlisted module; only the Safe threshold can settle and spend treasury balances. |
| A standard Safe cannot receive the router's ERC-721 receipt callback | Live Sepolia smoke test, 2026-07-23 | Closed | Assets and refunds stay in Safe custody; the receipt owner is restricted to a verified Safe-owner EOA. |
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

- Canonical per-account Safe entry point: factory `0xdDB5C64eAa1c69426ad7bed8b98aE9F79B652B36`. It resolves or creates one separate Safe and one separate bound module per owner; there is no global Safe treasury address for new users.
- Registered legacy demo Safe `0x549585Be4d75b388B4f825E0bCbBaA85B4FbfffF` (Safe v1.4.1, threshold 1), its allowlisted Nox module V6 `0x8c17547b05835b77FeBC5Eb796d4be1a8e73e8f5`, and Safe orderbook `0xd8037cb70163eC52aa774f54590BB266ee0d9908` remain recorded in `packages/contracts/deployment-sepolia.json` for compatibility and historical evidence. V5 remains the rollback address but is disabled.
- The fresh-owner verification instance created Safe `0x961Ec2DAD6260748Be7F5C170c82E2a227BBF499` with bound module `0x65E2b55aB4425eC78e7541B81C1C661C7473C178`. Its full 22-transaction lifecycle passed; it is evidence of factory behavior, not a shared application treasury.
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
- Module controls were validated on Sepolia. V6 was enabled only after deployment
  and configuration checks, passed a live one-transaction swap at block
  `11360178`, and V5 was disabled afterward in
  `0x10d04653b8aa39c8a4c77ca11f5cb0b7c51f151fa4eee8582248e7ad0f8df010`.
- Auditor access is per-handle Nox viewer access only and does not grant token operator or Safe signing authority.
- Safe module V5 was deployed in transaction `0xe3017ef17fa515cbe50787fe775b1ead860b2b420a97fd23f36168528f3ad70a`, enabled in `0x1259be1fabe9501c066afe4a41cd21f51f8fd3cafe0fa8d647fa9f66e1ac6bfb`, and the preceding module was disabled only after V5 became active; the existing Safe orderbook was intentionally retained.
- V5 prompt-optimization evidence includes two ciphertext inputs prepared in one transaction (`0x1fe24270bdc0f75d553caf9f0cfa059a15c24a721c0bdbc2c9d9bfd0a351bc2a`) and a prevalidated Safe batch-viewer execution (`0x85212298df23eff1af488c7ceeb586875d04b018c15ee497dc9300647124fc33`).
- Live receipt #32 verified automatic router-operator restoration, output/refund viewer ACLs, refreshed input/output balance ACLs, and post-indexing decryption through V5; the final passing regression settled in Safe transaction `0x0954954a2c297a8e4227da9bceb77aa60b3ba8b657f98b1ceacdef09d4431cbb`.
- V6 validates the owner and app-bound Nox proofs inside the Safe execution,
  prevents input-handle reuse through its combined entry points, and settles
  after encryption in one Safe transaction. The live V6 transaction
  `0xe9c6b7cc5f647397abf9828b6eb4607f54c26e0d489e5b6777780d4605aab28c`
  used `1,409,986` gas versus V5's `185,032`-gas preparation plus
  `1,259,187`-gas settlement: one fewer transaction and 2.37% less total gas.
- On 2026-07-27, the project owner completed the manual Safe V6 test suite
  against the production flow, confirmed that every exercised check passed, and
  reported a clearly faster experience than V5. This is recorded as qualitative
  user validation; no controlled Gateway wall-clock result is inferred from it.
- The constant-handle router candidate
  `0x56F347a3E8bc5cDDE1477bF49824f6bE63B59Dcf` removed three
  `WrapAsPublicHandle` events per swap but increased swap gas from `1,043,712`
  to `1,052,488` (+0.84%) and increased deployment gas. It was not promoted;
  the two temporary wallet operator grants were revoked after the benchmark.
- Live Safe unwrap prepared its ciphertext ACL in `0x5d2e2f4ce6675a6d07e39bf112f071238d0894e2d6065de1107f881545104a57`, created request `0x0000aa36a7230112e2da3a5cacbbb742b709eda9b615a3524b7ad30046cd0857` through Safe transaction `0x9751ef8c8f998a3796183c8f03a6168fabae1541293a495307a7cccecd9f5cf7`, and finalized the exact one-base-unit public release in `0x146b9e2d482b137297b6a3ccb806afcddb8736387e9a3f76915df0473f8cde2e`.
- Safe Treasury is exposed at `/app/safe` as a first-level workspace. The Wallet tab was removed without removing Wallet Assets or Auditor Access; `/app/wallet?tab=safe` redirects to the new route for compatibility.
- The Safe workspace intentionally has no Overview section: Safe identity, owner threshold, module/signer state, four encrypted balances, reveal, and funding are consolidated in its compact custody header above Swap & Unwrap, Orders & Agent, Activity, and Access & Security.
- Current frontend deployment `dpl_EKKN5G5ZvZLGwHBSp7kbTRrWV4uU` is READY and
  aliased to `https://noxswap-iexec.vercel.app`. A fresh-owner production smoke
  resolved Safe `0x961E...F499`, confirmed its bound module and owner state,
  rendered all 23 indexed Activity rows, and reported no browser errors.
