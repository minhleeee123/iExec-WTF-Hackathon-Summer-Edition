# NoxSwap Remediation and Verification

Date: 2026-07-29

Production frontend: [https://noxswap-iexec.vercel.app](https://noxswap-iexec.vercel.app)

Current public frontend deployment: `dpl_4Q4dXZCxAvDrUwc57VKHoJpHEdqh`.
The canonical Sepolia backend and frontend use Safe Module V6. On 2026-07-29,
the per-account Safe frontend was assigned to the canonical production alias.
Direct production smoke checks confirmed the root, Docs, Safe route, factory
address, legacy-owner custody state, missing-owner create state, and separate
Grant/Shared viewer controls without runtime errors. A fresh-owner production
smoke resolved its newly created Safe, confirmed the owner and enabled module,
and loaded all 23 indexed Safe Activity rows without browser errors. On
2026-07-27, the project owner also completed the manual Safe V6 test suite
against the production flow, confirmed that every exercised check passed, and
reported a clearly faster experience than V5. A subsequent content audit
confirmed that the landing page, footer, public Docs, repository documentation,
and threat model identify the factory as the shared entry point and label fixed
Safe/module addresses as legacy or verification instances.

## Hello World onboarding verification

The required iExec Nox Hello World journey was completed on Ethereum Sepolia
with onboarding wallet
[`0xE412d04DA2A211F7ADC80311CC0FF9F03440B64E`](https://sepolia.etherscan.io/address/0xE412d04DA2A211F7ADC80311CC0FF9F03440B64E).
This records the wallet used for the journey; it does not claim that the address
must receive a prize or deploy every other project component.

| Evidence | Result |
|---|---|
| Tutorial contract | [`ConfidentialPiggyBank` at `0x3204467cB52e8b8065D52045Ed37094B030fb998`](https://sepolia.etherscan.io/address/0x3204467cB52e8b8065D52045Ed37094B030fb998) |
| Deployment | [Transaction `0xecfd20...a1422d1`](https://sepolia.etherscan.io/tx/0xecfd20fdd9fdc68c6648390362a9827127c84fe4259011b8aa90df052a1422d1), block `11359858`, receipt status `1` |
| Encrypted input | [Deposit transaction `0x1a1415...2da731`](https://sepolia.etherscan.io/tx/0x1a14157f2edd3d0d2d8317430b0079069fad8cdec58e03b86a4b522cc02da731), block `11359861`, receipt status `1` |
| Contract state | Runtime bytecode present and `owner()` equals the onboarding wallet |
| Nox verification | The target-bound input was encrypted with `@iexec-nox/handle`, accepted by `Nox.fromExternal`, and the resulting balance was successfully decrypted by the authorized owner |
| Independent chain check | Chain ID `11155111`, both receipts, runtime bytecode, and owner were confirmed through two independent Sepolia RPC providers |

The contract was compiled with Solidity `0.8.35`, which satisfies the tutorial's
`0.8.27+` instruction, using `@iexec-nox/nox-protocol-contracts` `0.2.4`.
Private keys, encrypted handles, proofs, authorization signatures, and the
decrypted test value are intentionally excluded from this evidence.

## Converted to Real Features

| Feature | Implementation evidence | Test result |
|---|---|---|
| Client input encryption | `@iexec-nox/handle.encryptInput` returns a 32-byte handle and 137-byte proof for the Sepolia router | PASS |
| ERC-7984 balances | Official `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts` | PASS |
| Confidential liquidity | Router stores Nox reserve handles for cUSDC/cETH, cWBTC/cUSDC, and cSOL/cUSDC | PASS, three initialized live pools |
| Protected confidential swap | Input/minOut are encrypted; Router V2 settles output or selects a full encrypted refund | PASS, settle tx `0xb3e661...`; forced rejection/refund tx `0x8ca995...` |
| Additional assets | nWBTC/cWBTC and nSOL/cSOL use deployed faucets, official wrappers, and encrypted liquidity | PASS, authorized post-settlement decryption succeeded for both additional pools; plaintext outputs are omitted from public evidence |
| Confidential limit orders | Amount/minOut escrowed as handles; Chainlink trigger, permissionless execution, owner cancel, expiry refund, and terminal-state guards are on-chain | PASS, order #6 executed, order #7 cancelled with an exact confidential refund, and order #8 expired with an exact confidential refund; repeated settlement and unauthorized cancellation reverted |
| Public confidential orderbook | Incremental lifecycle-event index, finalized checkpoint, active-order `canExecute`, block timestamp, and Chainlink feed drive wallet-free status/filter/detail views | PASS, real lifecycle data including still-open personal order #5 ([creation tx](https://sepolia.etherscan.io/tx/0x3c34dc608c80d39ebc62f4a3fc4652bd4ea6bfbb78161c1f114f08ead2a17228)); URL reload/back/forward, cache rebuild, bounded RPC ranges, and isolated RPC failure paths tested |
| Safe public confidential orderbook | The Safe workspace reuses the complete wallet-free lifecycle index, filters, pagination, shareable detail URLs, creation readiness, minute-level expiry, live OrderBook operator control, owner-module cancel, permissionless execute/expiry, and owner-only term reveal from Trade | PASS, real Safe orders load on desktop/mobile; order #3 was executed permissionlessly ([settlement tx](https://sepolia.etherscan.io/tx/0xf9c71fa94ae7bb3c175cf000c646c2c3db645fe9e90cf120465da3c3450e29e2)); order #4 remains `Open` in contract storage but is now past expiry and eligible for permissionless refund, and its two term handles were previously batch-authorized and decrypted ([viewer tx](https://sepolia.etherscan.io/tx/0xb1c34f5ca8b60fedb2e522d873422533caa95e1a43310c505ec77bf427d357fe)) |
| Stateless order keeper | Pure decision engine plus separate incremental active-order checkpoints for the personal and Safe orderbooks, a shared bounded action budget, sequential writes, dry-run, health, structured logs, webhook, and stale-race handling | PASS, keeper executed personal order #3 and Safe order #3 permissionlessly ([Safe settlement tx](https://sepolia.etherscan.io/tx/0xf9c71fa94ae7bb3c175cf000c646c2c3db645fe9e90cf120465da3c3450e29e2)); latest dual-book dry-run invoked no decrypt path |
| Authorized decryption | Handle SDK decrypts output and balance handles after EIP-712 authorization | PASS |
| Faucet and wrap | Faucet mints public test assets; wrapper escrows them and creates encrypted balances | PASS |
| Unwrap | Encrypted request, public decryption proof, contract finalization, and underlying release | PASS, `0.01 nWETH` verified |
| Selective ACL | Wrapper grants a viewer on the current balance handle; Nox subgraph confirms the account | PASS |
| Viewer recipient surfaces | Wallet and Safe Treasury `Shared with me` surfaces reread current handles, check the connected wallet's viewer ACL, reveal only authorized rows, and keep plaintext separate from Safe owner balances | PASS, unit coverage validates ACL status isolation, current-handle matching, changed-handle invalidation, and session-only viewer state |
| Per-account Safe factory | Official Safe v1.4.1 proxy factory creates one proxy and one constructor-bound Nox module per owner, initializes threshold 1, enables the module atomically, rejects duplicates, and registers the legacy demo Safe | PASS, contract isolation tests, live canary creation, and the 22-transaction fresh-owner lifecycle below |
| Receipt NFT | Router mints ERC-721 receipt and returns on-chain base64 JSON/SVG metadata | PASS, receipt `#2` verified on the current deployment |
| Swap history | Frontend reads actual `SwapExecuted` logs from the router deployment block | PASS |
| Proof inspector | Frontend displays actual tx hash, calldata, input/output handles, proof byte length, and block | PASS by build and source test |
| Price reference | Sepolia Chainlink ETH/USD `latestRoundData` replaces the simulated AI price | PASS |
| Strategy Agent | Groq GPT-OSS strict schema converts natural language and public Chainlink context into a reviewable draft; percentage balance math and Nox encryption stay local | PASS, unit, live provider, desktop/mobile UI, and public Vercel API smoke tests |
| Keeper AI observer | Optional Groq explanation receives public outcomes only and cannot alter deterministic keeper decisions | PASS, failure-isolation and no-private-field tests |
| MCP tools | MCP v4 exposes nine stdio tools spanning public planning/reads, signer-authorized decryption, and explicitly enabled protected writes | PASS, live Chainlink and Groq planning |
| Safe Treasury prompt optimization | Module V6 validates owner-bound, module-targeted amount/minOut proofs and settles inside one threshold-approved Safe transaction; its combined entry points prevent input-handle reuse. The client retains its V5 two-step fallback. | PASS, live V6 tx `0xe9c6b7...5aab28c`; 1 transaction and 1,409,986 gas versus V5's 2 transactions and 1,444,219 total gas |
| Production Safe V6 manual suite | Project-owner execution of the intended production Safe V6 checks | PASS, confirmed by the user on 2026-07-27; every exercised check passed and the V6 flow felt clearly faster than V5 |
| Production MetaMask happy path | Manual wallet flow on the canonical public URL | PASS, confirmed by the user on 2026-07-25 |
| Current legacy demo Safe module state | Read `Safe.isModuleEnabled(Module V6)` and `getModulesPaginated` on Sepolia | PASS on 2026-07-27: V6 `0x8c1754...73e8f5` is enabled, V5 is disabled after the passing runtime test, and the registered legacy Safe retains its expected sole owner and threshold 1. Factory-created Safes use their own bound module addresses. |
| Responsive UI | Production build plus 71 frontend unit tests and browser checks at `1440x1000`, `1280x900`, and `390x844`; validates EIP-6963 wallet selection, per-owner Safe discovery/create state, legacy Safe compatibility, shared-Safe lookup, fresh-Safe activity indexing, Safe prevalidated signatures, keyboard tabs, Strategy Agent, orderbooks, owner/non-owner controls, landing/app separation, desktop sidebar, mobile navigation, and API guards. | PASS for unit/build and targeted live browser smoke; fresh-owner production loaded 23 Activity rows, and isolated landing/Docs checks at `1440x1000` and `390x844` confirmed the factory wording, legacy labels, active TOC, zero page errors, and no horizontal overflow. The combined local browser matrix remains affected by this workspace's unrelated Chrome renderer resource exhaustion. |
| Public source verification | Sourcify API v2 Standard JSON verification | PASS with exact creation/runtime matches for all thirteen repository verification targets. Safe factory is public as match `42989366`, Safe Module V6 as `42918403`, and the Safe orderbook as `42858243`. |
| Read-only deployment consistency | `npm run verify:deployment` compares canonical artifacts with Sepolia deployment transactions, constructor arguments, receipts, deployed runtime code, and Sourcify lookup status | PASS for Router V2, Safe Module V6, Safe confidential orderbook, and per-account Safe factory; it performs no verification submission |
| Accessibility and discovery | Lighthouse against the final production build | PASS, Performance 92, Accessibility 100, Best Practices 100, SEO 100, CLS 0.014; robots and sitemap included |
| Open-source license | Root `LICENSE`, package metadata, and README | PASS, canonical MIT license is recognized from the repository root |

The latest Router V2 live E2E run verified normal settlement, an intentionally impossible minOut with exact confidential refund, both additional pools, permissionless order execution/expiry, owner-only cancellation, double-settlement rejection, ACL sharing, receipt ownership, and release of exactly `0.01 nWETH` during unwrap.

## Fresh-owner Safe lifecycle verification

On 2026-07-29, the full Safe flow was rerun with an isolated owner generated in
memory and funded by the configured Sepolia test wallet. The test created
[`Safe 0x961E...F499`](https://sepolia.etherscan.io/address/0x961Ec2DAD6260748Be7F5C170c82E2a227BBF499)
for owner
[`0x28EA...5231`](https://sepolia.etherscan.io/address/0x28EA15dC02E3e1f3C14aB0c3d974CebF76d45231)
with bound
[`module 0x65E2...C178`](https://sepolia.etherscan.io/address/0x65E2b55aB4425eC78e7541B81C1C661C7473C178).
All 22 submitted transactions succeeded. The generated owner key was never
printed or persisted and was intentionally discarded after its remaining ETH
was swept back to the funder; the test owner ended with `0 ETH`.

| Exercised flow | Public evidence |
|---|---|
| Fund isolated owner and create one-owner/threshold-1 Safe | [Fund tx `0x086f73...dda2f5`](https://sepolia.etherscan.io/tx/0x086f73d51f7a6a6e59450d295f97afb6434ea7525756cbd85566beae79dda2f5), [factory tx `0x4a230c...dd1bc4`](https://sepolia.etherscan.io/tx/0x4a230c17a30e7565c2666a9ce5ddf3b690282b9a5d8e698ce7cffb3200dd1bc4) |
| Faucet, approve, wrap, and fund the new Safe | [Faucet tx](https://sepolia.etherscan.io/tx/0xb8a004395c566d571ed05c78de4a60fb308b5d7385bfbc28354ee82a306c989b), [approval tx](https://sepolia.etherscan.io/tx/0x429a846bb322c86a00f8b27b23d98513984f0da92bcd41d9b4499e04f0c92d39), [wrap tx](https://sepolia.etherscan.io/tx/0x250bd5b60292e6dd96c592f50acd6900c14c854014788c0dc10cc87d4d65c3d3) |
| Owner and external-viewer ACL grant plus authorized Nox decryption | [Owner grant tx](https://sepolia.etherscan.io/tx/0x6ce342c1e95d051d7d61101ca2dc49033ef01b3e802198f1f036a141a3b830e6), [external viewer grant tx](https://sepolia.etherscan.io/tx/0xe4f8bef9397f37b19653572a9f81ccf0e673dc6bb976180fbb688d8254dc2224) |
| Safe Module V6 protected swap and handle-specific viewer refresh | [One-transaction swap](https://sepolia.etherscan.io/tx/0x53db9ce13d2d11e3505393abf78c8028aaaecd97e38d084d28f891de91693554), [rotated-handle regrant](https://sepolia.etherscan.io/tx/0x42387a3a5f852da0e4dd8312a0a9aeb11eb42de5e754be12de80e5a33d4796f3) |
| Confidential Safe order creation, term reveal, cancel, and exact encrypted refund | [Create order #12](https://sepolia.etherscan.io/tx/0xd41d907b7c07c0547287f12b9eef543af760267acfdc294a8371774d70fe067c), [term grant](https://sepolia.etherscan.io/tx/0x77bd518b0d67971253dc9265d3dc9491ced9e6ec465504bbbe7fd5092b222bb6), [cancel/refund](https://sepolia.etherscan.io/tx/0x47699c44bbc066b4d829e0d038e8d5a08dcc02621304f9dc1cdfc20ee9bd0938) |
| Safe unwrap request and public-proof finalization | [Request tx](https://sepolia.etherscan.io/tx/0x4a2947f381689c07d1556242cefe182d842e3b85f3e7793fbf1d32b921120792), [finalize tx](https://sepolia.etherscan.io/tx/0x6cc4a4dab93980f6e68e6a059246f05ca126e092f3bc735870b1b0e6c832a951) |
| Router/OrderBook operator revoke-restore and module emergency revoke-re-enable | [Router revoke](https://sepolia.etherscan.io/tx/0x3db5c2610d43584560520ed8d7408b2767d01eb69b7d589ad7e60dc9e5fe0f6d), [Router restore](https://sepolia.etherscan.io/tx/0x0c48d4ab2058d806a4ac55f493dbcbd2cd52541a0fd156a2bdca32cee9c9f745), [OrderBook revoke](https://sepolia.etherscan.io/tx/0x66a51a9be3d4fffe45cdd25ba67aea83732662c9a740d2dd38233f5aa47f70b2), [OrderBook restore](https://sepolia.etherscan.io/tx/0x2e30be2b4f3da2402bd7f67572c57d8be7e5b612ac24ad5c6701e3c9079f2710), [module revoke](https://sepolia.etherscan.io/tx/0x0990062f1f66944465a5f528ad3a4a26ca74b97cae4142eb5b973b040fbba3be), [module re-enable](https://sepolia.etherscan.io/tx/0xb5e1b3649d0a7f0a9027fd0fa9df25e57db93025e225b320e5b138b6fc33337b) |
| Return unused gas funds | [Sweep tx](https://sepolia.etherscan.io/tx/0x0e71b2e68947a0fa649afda29b11585b7f057e477c852a61edbee288d0d3d5fa) |

The same owner was then injected into a read-only browser session against the
canonical production URL. The UI resolved the correct Safe and module, showed
the separate Grant/Shared access surfaces, and rendered all 23 indexed activity
events with no browser error. Decrypted values, handles, proofs, signatures, and
private keys are intentionally omitted.

## Performance Comparison

The pre-change state is preserved on
`backup/pre-performance-optimization-20260727` at commit
`0bf09e9a1e61c3fd948dd4ffe94b2ce2178dc267`. Secrets and `.env` files are not
part of that backup.

| Area | Before | After | Decision |
|---|---:|---:|---|
| Safe protected swap after client encryption | 2 Sepolia transactions | 1 Sepolia transaction | Keep V6; one fewer signature/confirmation transaction |
| Safe protected swap gas | `1,444,219` total (`185,032` prepare + `1,259,187` settle) | `1,409,986` | Keep V6; `34,233` gas lower (`2.37%`) |
| Production manual experience | Two-stage V5 confirmation flow | All user-executed V6 checks passed and the flow felt clearly faster | Keep V6; qualitative user validation, not a controlled wall-clock benchmark |
| Private balance refresh | Decrypt every handle through one generic fixed retry loop | Decrypt only changed handles concurrently, deduplicate in-flight requests, preserve successful partial results, then reconcile in the background | Keep; less avoidable Gateway work and no whole-view failure when one handle lags |
| Gateway retry | 12 attempts at a fixed 8-second interval, including terminal errors | Exponential backoff with jitter, abort support, and immediate failure for invalid proofs or rejected signatures | Keep; avoids retrying non-transient failures and synchronized request bursts |
| Read path | Recreated providers and repeated immutable reads; history could rescan broad ranges | Shared providers, same-block snapshots, immutable-read cache, finalized checkpoints, and a reorg overlay | Keep; bounded and internally consistent reads |
| Keeper wake-up | Timer-only polling | New-block event wake-up with a polling fallback and clean abort | Keep; reacts to blocks without making correctness depend on WebSocket availability |
| Router constant handles | `1,043,712` gas/swap, 6 `WrapAsPublicHandle` events | `1,052,488` gas/swap, 3 events | Reject candidate; `8,776` more gas (`+0.84%`) and higher deployment gas |
| Automated regression | 92 tests: 91 pass, 1 Docker-only skip; `7.001 s` | 109 tests: 108 pass, 1 Docker-only skip; `6.921 s` | Keep; 17 more cases with no test-time regression |
| Main frontend bundle | `365.27 kB` / `112.46 kB` gzip | `378.08 kB` / `116.21 kB` gzip | Accepted trade-off: `+3.75 kB` gzip (`+3.33%`) for recovery, caching, and V6 support |
| Lint / production build wall time | `1.201 s` / `6.928 s` | `1.259 s` / `6.954 s` | No material regression in this workspace |

Gateway response time is external and variable, so the user-confirmed speed
improvement is recorded as a qualitative production observation rather than a
synthetic wall-clock benchmark. The quantitative comparison remains limited to
deterministic request behavior, transaction count, gas, bundle size, regression
coverage, and live Sepolia/production outcomes.

## Remaining Unsupported Features

| Previous claim | Current status | Reason |
|---|---|---|
| AI price prediction or settlement authority | Intentionally not implemented | The Strategy Agent drafts parameters only; Chainlink and contract logic remain authoritative. |
| Real-time Intel TDX terminal | Not implemented | The SDK verifies Gateway-signed responses but exposes no authoritative raw hardware telemetry API. |
| Historical ACL revoke | Not implemented | Installed Nox SDK/contract interface exposes `addViewer` but no `removeViewer`; a new balance handle does not inherit the prior grant. |
| Fixed MEV-savings calculator | Replaced | UI measures actual execution deviation against Chainlink only for supported ETH/USDC swaps. |
| Zero-MEV guarantee | Not claimed | Encrypted amount/minOut and deadline reduce leakage and bound settlement, but cannot prove immunity from every MEV strategy. |
| Permissionless LP lifecycle | Not implemented | Initial liquidity is real but deployer-funded; there are no LP shares or remove-liquidity operations. |
| Nox integration validation | Docker-backed local suite plus live Sepolia E2E | The local suite is available as a manual/nightly workflow; deployed-path validation uses live Sepolia E2E. |

## Phase 6 Rubric Assessment

This is an internal evidence-based assessment, not an organizer score. The
official rubric awards whole stars and totals 14.

| Criterion | Self-assessment | Evidence and remaining work |
|---|---:|---|
| Creativity | 3/3 | Confidential AMM, encrypted slippage protection/refunds, confidential limit-order escrow, selective disclosure, Safe module composability, and non-custodial Agent/MCP workflows form a differentiated, coherent system. |
| Accessible and end-to-end without mock data | 3/3 | Core reads and writes use live Sepolia contracts, Chainlink, Nox SDK/Gateway, and real wallet signatures. Automated flows plus user-confirmed local/preview and production MetaMask paths cover connect, reveal, swap, refreshed reveal, revoke/authorize, and order create/cancel. |
| ETH Sepolia deployment | 2/2 | The canonical NoxSwap contracts, three encrypted pools, personal and Safe orderbooks, legacy Safe treasury/module, and per-account Safe factory are live. The final frontend is published at the canonical production URL. |
| `feedback.md` | 2/2 | Root feedback records concrete SDK, ACL, indexing, Docker, version, and protected-minOut experience with actionable recommendations. |
| Demo video, no longer than four minutes | 0/2 | A 3:54.552 final candidate exists locally; publication with the X submission post remains pending. |
| Technical implementation | 1/1 | Official Nox encrypted types, arithmetic, ERC-7984 wrappers, Handle SDK encryption/decryption, proofs, and ACLs are in the settlement path rather than attached as a label. |
| UX | 1/1 | Personal and Safe custody are clearly separated but visually consistent, all workflows are responsive and keyboard-operable, and the final build scored Lighthouse Accessibility 100 with no horizontal overflow in tested viewports. |

**Phase 6-addressable score: 12/12. Current total submission score: 12/14.**
The missing two points are exclusively the Phase 7 publication of the prepared
demo video with the required X submission post.

## Repeatable Commands

```bash
npm install
npm run compile
npm test
npm run keeper:dry
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:safe:prompt:sepolia --workspace @noxswap/contracts
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:safe:swap:sepolia --workspace @noxswap/contracts
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:safe:factory:full:sepolia --workspace @noxswap/contracts
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:mcp:live
npm run test:agent:live --workspace @noxswap/web
npm run build
npm run lint
npm run test:ui
npm run verify:deployment
```

## Security Notes

- Runtime files contain no embedded private key or fallback signing key.
- GitHub Actions runs contract compilation/tests, generated-client synchronization,
  frontend unit/lint/build checks, and Gitleaks on pushes and pull requests.
  Read-only live deployment consistency is a separate command; write-enabled
  Sepolia E2E is manual and environment-secret protected.
- Keeper logs, webhook payloads, and health responses exclude private keys, plaintext order terms, decryption output, and encrypted handles.
- Groq endpoints reject wallet, balance, handle, proof, signature, and key fields; the API key remains server-side and AI cannot submit transactions.
- `.env` files are ignored by git.
- The browser currently uses reusable `MaxUint256` approvals for public faucet
  assets before wrapping. Those allowances are visible and revocable, but exact
  approvals would reduce impact if a wrapper were compromised.
- Designed for hackathon testnet demonstration on Sepolia; formal third-party audits are planned prior to mainnet deployment.
- Test faucet assets have no monetary value.
- The 2026-07-25 web production audit reports two high-severity package findings
  in `react-router`/`react-router-dom` for CSRF in Framework/RSC server-action
  request processing. NoxSwap is a client-rendered Vite SPA using declarative
  `BrowserRouter`; it defines no React Router loaders, actions, framework server,
  or RSC endpoints, so the reported execution path is not present in this
  deployment. The dependency should still be updated when a compatible patched
  release is available.
- The repository-wide production audit additionally retains two moderate findings
  in `@hono/node-server` through the MCP SDK. NoxSwap uses MCP over stdio on Linux
  and does not start the affected Windows static-file HTTP path; npm's suggested
  remediation is a breaking SDK downgrade, so the dependency is pinned pending an
  upstream compatible release.
- The development-only Hardhat/Nox plugin chain retains upstream advisories with no compatible fix. These packages do not ship in the web or MCP production runtimes.
