# NoxSwap Remediation and Verification

Date: 2026-07-24

Production frontend: [https://noxswap-iexec.vercel.app](https://noxswap-iexec.vercel.app)

## Converted to Real Features

| Feature | Implementation evidence | Test result |
|---|---|---|
| Client input encryption | `@iexec-nox/handle.encryptInput` returns a 32-byte handle and 137-byte proof for the Sepolia router | PASS |
| ERC-7984 balances | Official `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts` | PASS |
| Confidential liquidity | Router stores Nox reserve handles for cUSDC/cETH, cWBTC/cUSDC, and cSOL/cUSDC | PASS, three initialized live pools |
| Protected confidential swap | Input/minOut are encrypted; Router V2 settles output or selects a full encrypted refund | PASS, settle tx `0xb3e661...`; forced rejection/refund tx `0x8ca995...` |
| Additional assets | nWBTC/cWBTC and nSOL/cSOL use deployed faucets, official wrappers, and encrypted liquidity | PASS, live swaps decrypted as `598.140365 cUSDC` and `149.547018 cUSDC` |
| Confidential limit orders | Amount/minOut escrowed as handles; Chainlink trigger, permissionless execution, owner cancel, expiry refund, and terminal-state guards are on-chain | PASS, order #6 executed, order #7 cancelled with exact `2 cUSDC` refund, and order #8 expired with exact `1 cUSDC` refund; repeated settlement and unauthorized cancellation reverted |
| Public confidential orderbook | Incremental lifecycle-event index, finalized checkpoint, active-order `canExecute`, block timestamp, and Chainlink feed drive wallet-free status/filter/detail views | PASS, eight real orders including open order #5 ([creation tx](https://sepolia.etherscan.io/tx/0x3c34dc608c80d39ebc62f4a3fc4652bd4ea6bfbb78161c1f114f08ead2a17228)); URL reload/back/forward, cache rebuild, bounded RPC ranges, and isolated RPC failure paths tested |
| Stateless order keeper | Pure decision engine plus incremental active-order event index, rebuildable checkpoint, sequential writes, dry-run, health, structured logs, webhook, and stale-race handling | PASS, keeper executed order #3 permissionlessly ([settlement tx](https://sepolia.etherscan.io/tx/0x58f5918517ac0e0a821511379f2605a25a9931ed1db7579a0a1c09c324f1f3f5)); latest dry-run scanned only open order #5 and invoked no decrypt path |
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
| MCP tools | MCP v4 exposes nine public planning/read and opt-in protected write/decrypt tools over stdio | PASS, live Chainlink and Groq planning |
| Safe Treasury prompt optimization | Module V5 batches ciphertext/viewer writes, restores allowlisted operators within settlement, uses Safe prevalidated 1-of-1 execution, and caches the session Nox authorization; the frontend refreshes only changed balance handles. | PASS, live receipt #32 verified operator restoration, all four viewer ACLs, and post-indexing decryption |
| Responsive UI | Production build plus 47 frontend unit tests and headless Chrome at `1440x1000`, `1280x900`, and `390x844`; validates EIP-6963 wallet selection, Safe prevalidated-signature encoding, provider-aware reconnect, keyboard tab semantics, modal focus/escape/scroll behavior, Strategy Agent, public orderbook/detail, filter persistence, operator revoke visibility, URL persistence, owner/non-owner controls, landing/app separation, desktop sidebar, mobile wallet drawer, bottom navigation, and observer endpoint auth/rate/body guards. Safe Swap & Unwrap, Orders & Agent, Activity, and Access & Security now reuse the same interaction and visual patterns as the personal workspaces without removing Safe functionality. | PASS |
| Public source verification | Sourcify API v2 Standard JSON verification | PASS, exact creation/runtime match for all ten project contracts |
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
| Accessible and end-to-end without mock data | 3/3 | Core reads and writes use live Sepolia contracts, Chainlink, Nox SDK/Gateway, and real wallet signatures. Automated flows and the user-confirmed local/preview MetaMask path cover connect, reveal, swap, refreshed reveal, revoke/authorize, and order create/cancel. |
| ETH Sepolia deployment | 2/2 | Ten NoxSwap contracts, three encrypted pools, the limit order book, Safe treasury, allowlisted module, and Safe order book are live. The final Phase 6 frontend is published at the canonical production URL. |
| `feedback.md` | 2/2 | Root feedback records concrete SDK, ACL, indexing, Docker, version, and protected-minOut experience with actionable recommendations. |
| Demo video, no longer than four minutes | 0/2 | Phase 7 deliverable intentionally left to the user; no final video exists yet. |
| Technical implementation | 1/1 | Official Nox encrypted types, arithmetic, ERC-7984 wrappers, Handle SDK encryption/decryption, proofs, and ACLs are in the settlement path rather than attached as a label. |
| UX | 1/1 | Personal and Safe custody are clearly separated but visually consistent, all workflows are responsive and keyboard-operable, and the final build scored Lighthouse Accessibility 100 with no horizontal overflow in tested viewports. |

**Phase 6-addressable score: 12/12. Current total submission score: 12/14.**
The missing two points are exclusively the Phase 7 demo-video deliverable. Before
recording it, repeat the already-passing MetaMask happy path once on the public
URL.

## Repeatable Commands

```bash
npm install
npm run compile
npm test
npm run keeper:dry
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:safe:prompt:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:safe:swap:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:mcp:live
npm run test:agent:live --workspace @noxswap/web
npm run build
npm run lint
npm run test:ui
```

## Security Notes

- Runtime files contain no embedded private key or fallback signing key.
- GitHub Actions runs contract compilation/tests, frontend unit/lint/build, deployment consistency, and Gitleaks on pushes and pull requests; live Sepolia E2E is manual and environment-secret protected.
- Keeper logs, webhook payloads, and health responses exclude private keys, plaintext order terms, decryption output, and encrypted handles.
- Groq endpoints reject wallet, balance, handle, proof, signature, and key fields; the API key remains server-side and AI cannot submit transactions.
- `.env` files are ignored by git.
- This remains hackathon/testnet software and has not received an external smart-contract security audit.
- Test faucet assets have no monetary value.
- The web workspace production dependency audit reports 0 vulnerabilities after the Vite 8 upgrade.
- The repository-wide production audit retains two moderate transitive advisories in `@hono/node-server` through the MCP SDK. NoxSwap uses MCP over stdio on Linux and does not start the affected Windows static-file HTTP path; npm's suggested remediation is a breaking SDK downgrade, so the dependency is pinned pending an upstream compatible release.
- The development-only Hardhat/Nox plugin chain retains upstream advisories with no compatible fix. These packages do not ship in the web or MCP production runtimes.
