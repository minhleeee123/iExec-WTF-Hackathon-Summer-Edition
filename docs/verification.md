# NoxSwap Remediation and Verification

Date: 2026-07-25

Production frontend: [https://noxswap-iexec.vercel.app](https://noxswap-iexec.vercel.app)

Current optimized production deployment: `dpl_5tceTxxJ7qRCw97LEwz7VVyrK1S7` (Safe Module V5, public Safe orderbook, owner term reveal, minute expiry, and operator controls production smoke: PASS).

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
| Receipt NFT | Router mints ERC-721 receipt and returns on-chain base64 JSON/SVG metadata | PASS, receipt `#2` verified on the current deployment |
| Swap history | Frontend reads actual `SwapExecuted` logs from the router deployment block | PASS |
| Proof inspector | Frontend displays actual tx hash, calldata, input/output handles, proof byte length, and block | PASS by build and source test |
| Price reference | Sepolia Chainlink ETH/USD `latestRoundData` replaces the simulated AI price | PASS |
| Strategy Agent | Groq GPT-OSS strict schema converts natural language and public Chainlink context into a reviewable draft; percentage balance math and Nox encryption stay local | PASS, unit, live provider, desktop/mobile UI, and public Vercel API smoke tests |
| Keeper AI observer | Optional Groq explanation receives public outcomes only and cannot alter deterministic keeper decisions | PASS, failure-isolation and no-private-field tests |
| MCP tools | MCP v4 exposes nine stdio tools spanning public planning/reads, signer-authorized decryption, and explicitly enabled protected writes | PASS, live Chainlink and Groq planning |
| Safe Treasury prompt optimization | Module V5 batches ciphertext/viewer writes, restores allowlisted operators within settlement, uses Safe prevalidated 1-of-1 execution, and caches the session Nox authorization; the frontend refreshes only changed balance handles. | PASS, live receipt #32 verified operator restoration, all four viewer ACLs, and post-indexing decryption |
| Production MetaMask happy path | Manual wallet flow on the canonical public URL | PASS, confirmed by the user on 2026-07-25 |
| Current Safe module state | Read `Safe.isModuleEnabled(Module V5)` and `getModulesPaginated` on Sepolia | ATTENTION on 2026-07-25: Module V5 remains deployed but is currently disabled and the Safe reports no enabled modules. Historical revoke/re-enable tests passed; the configured owner must enable V5 before owner-controlled module operations. Permissionless execution/expiry of existing Safe orders remains independent of the module. |
| Responsive UI | Production build plus 51 frontend unit tests and headless Chrome at `1440x1000`, `1280x900`, and `390x844`; validates EIP-6963 wallet selection, Safe prevalidated-signature encoding, provider-aware reconnect, keyboard tab semantics, modal focus/escape/scroll behavior, Strategy Agent, personal and Safe public orderbooks/details, filter persistence, operator revoke visibility, URL persistence, owner/non-owner controls, landing/app separation, desktop sidebar, mobile wallet drawer, bottom navigation, and observer endpoint auth/rate/body guards. Safe Swap & Unwrap, Orders & Agent, Activity, and Access & Security reuse the same interaction and visual patterns as the personal workspaces without removing Safe functionality. | PASS |
| Public source verification | Sourcify API v2 Standard JSON verification | PASS for all ten base deployment contracts; the personal orderbook's exact deployed source is repository revision `407d770`, while current `NoxLimitOrderBook.sol` is the later Safe-compatible revision. Read-only lookup on 2026-07-25 confirms that Safe Module V5 and the Safe orderbook remain unpublished on Sourcify |
| Read-only deployment consistency | `npm run verify:deployment` compares canonical artifacts with Sepolia deployment transactions, constructor arguments, receipts, deployed runtime code, and Sourcify lookup status | PASS for Router V2, Safe Module V5, and the Safe confidential orderbook; it performs no verification submission |
| Accessibility and discovery | Lighthouse against the final production build | PASS, Performance 92, Accessibility 100, Best Practices 100, SEO 100, CLS 0.014; robots and sitemap included |
| Open-source license | Root `LICENSE`, package metadata, and README | PASS, canonical MIT license is recognized from the repository root |

The latest Router V2 live E2E run verified normal settlement, an intentionally impossible minOut with exact confidential refund, both additional pools, permissionless order execution/expiry, owner-only cancellation, double-settlement rejection, ACL sharing, receipt ownership, and release of exactly `0.01 nWETH` during unwrap.

## Remaining Unsupported Features

| Previous claim | Current status | Reason |
|---|---|---|
| AI price prediction or settlement authority | Intentionally not implemented | The Strategy Agent drafts parameters only; Chainlink and contract logic remain authoritative. |
| Real-time Intel TDX terminal | Not implemented | The SDK verifies Gateway-signed responses but exposes no authoritative raw hardware telemetry API. |
| Historical ACL revoke | Not implemented | Installed Nox SDK/contract interface exposes `addViewer` but no `removeViewer`; a new balance handle does not inherit the prior grant. |
| Fixed MEV-savings calculator | Replaced | UI measures actual execution deviation against Chainlink only for supported ETH/USDC swaps. |
| Zero-MEV guarantee | Not claimed | Encrypted amount/minOut and deadline reduce leakage and bound settlement, but cannot prove immunity from every MEV strategy. |
| Permissionless LP lifecycle | Not implemented | Initial liquidity is real but deployer-funded; there are no LP shares or remove-liquidity operations. |
| Local Nox integration test | Not available in this environment | The Nox Hardhat off-chain services require Docker, which is not installed. Live Sepolia E2E is used instead. |

## Phase 6 Rubric Assessment

This is an internal evidence-based assessment, not an organizer score. The
official rubric awards whole stars and totals 14.

| Criterion | Self-assessment | Evidence and remaining work |
|---|---:|---|
| Creativity | 3/3 | Confidential AMM, encrypted slippage protection/refunds, confidential limit-order escrow, selective disclosure, Safe module composability, and non-custodial Agent/MCP workflows form a differentiated, coherent system. |
| Accessible and end-to-end without mock data | 3/3 | Core reads and writes use live Sepolia contracts, Chainlink, Nox SDK/Gateway, and real wallet signatures. Automated flows plus user-confirmed local/preview and production MetaMask paths cover connect, reveal, swap, refreshed reveal, revoke/authorize, and order create/cancel. |
| ETH Sepolia deployment | 2/2 | Ten NoxSwap contracts, three encrypted pools, the limit order book, Safe treasury, allowlisted module, and Safe order book are live. The final Phase 6 frontend is published at the canonical production URL. |
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
- This remains hackathon/testnet software and has not received an external smart-contract security audit.
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
