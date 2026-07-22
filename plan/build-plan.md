# Build Plan

> Trạng thái: Approved; extended real-feature implementation and public frontend deployment complete.

## 1. Preconditions

- [x] Participation Fit Gate đã được xác nhận.
- [x] Product Plan đã được người dùng phê duyệt.
- [x] Requirements, rubric và deadline đã được đọc.
- [x] Người dùng đã yêu cầu thay toàn bộ chức năng mô phỏng bằng chức năng thật hoặc báo cáo rõ phần không thể làm.

## 2. Product profile

- Client: React 19 + Vite + React Router + responsive CSS.
- Wallet/RPC: Ethers v6 `BrowserProvider`, MetaMask và Ethereum Sepolia.
- Core flow: Connect -> Faucet -> Wrap -> SDK encrypt -> Confidential swap -> SDK decrypt -> Receipt/history.
- Supporting real flows: Unwrap với public decryption proof, ACL viewer, Chainlink reference price, MCP stdio.
- Public frontend deployment: `https://frontend-dusky-five-56.vercel.app`; external mobile smoke test and eight-order public read passed locally against live Sepolia data.
- Contract deployment: Live on Ethereum Sepolia, addresses canonical trong `source-code/backend/deployment-sepolia.json`.

## 3. Tech stack

| Layer | Technology | Vai trò |
|---|---|---|
| Web client | React 19, Vite 8, Vanilla CSS | Operational swap UI và responsive layout |
| Wallet/contracts | Ethers 6 | EIP-1193 wallet, contract reads/writes và event parsing |
| Client Nox SDK | `@iexec-nox/handle@0.1.0-beta.13` | `encryptInput`, `decrypt`, `publicDecrypt`, `viewACL` |
| Confidential contracts | `@iexec-nox/nox-confidential-contracts@0.2.2` | Official ERC-7984 wrapper |
| Nox Solidity SDK | `@iexec-nox/nox-protocol-contracts@0.2.4` | Encrypted types, ACL và arithmetic primitives |
| Contract tooling | Hardhat 3, Solidity 0.8.35, Node 24 | Compile và artifacts |
| Oracle | Chainlink ETH/USD Sepolia feed | UI reference price, không quyết định settlement |
| Agent integration | MCP SDK stdio server | Real protected swap/decrypt/pool/ACL/limit-order tools |

Không có database hoặc authentication server. MCP là một optional local agent adapter và chỉ ký bằng `PRIVATE_KEY` từ environment.

## 4. Kiến trúc

```text
[React / MetaMask]
  |-- standalone landing --> Launch App --> Trade / Wallet / Activity shell
  |-- shared wallet state --> desktop sidebar / mobile wallet drawer
  |-- read --> Sepolia router, wrappers, events, Chainlink
  |-- encryptInput(value, uint256, target) --> Nox Handle Gateway
  |-- handle + proof --> NoxSwap / ERC-7984 wrapper

[NoxSwap]
  |-- Nox.fromExternal
  |-- confidentialTransferFrom input token
  |-- Nox.mul/div/add/sub encrypted reserves
  |-- confidentialTransfer output token
  |-- SwapExecuted + ERC-721 receipt

[Authorized user]
  |-- decrypt(handle) --> private value
  |-- publicDecrypt(unwrapHandle) --> value + proof --> finalizeUnwrap
```

Failure handling:

- RPC/gateway errors are surfaced to the UI; no fake balance or success fallback.
- Subgraph ACL/decrypt operations use bounded retries for indexing delay.
- If MetaMask is absent, only read-only pool and oracle data are shown.
- Local Nox integration stack cannot run without Docker, so live Sepolia E2E is the acceptance test in this environment.

## 5. Milestones

### Milestone 1: Tooling and contracts

- [x] Configure Hardhat/Nox dependencies and compile with Node 24.
- [x] Replace custom fake IERC7984/token ledger with official wrapper.
- [x] Implement encrypted constant-product router and receipt NFT.
- [x] Add faucet-backed underlying test assets.

### Milestone 2: Sepolia deployment

- [x] Deploy nUSDC, nWETH, cUSDC, cETH and NoxSwap.
- [x] Wrap and add encrypted initial liquidity using real SDK handles/proofs.
- [x] Verify deployed bytecode and pool handles.
- [x] Publish Solidity source with exact creation/runtime matches on Sourcify.

### Milestone 3: End-to-end flows

- [x] Faucet and wrap.
- [x] Encrypt, swap, decrypt and verify receipt ownership.
- [x] Grant and verify selective ACL viewer.
- [x] Request unwrap, obtain public proof, finalize and verify underlying delta.
- [x] Read actual event history and Chainlink price.

### Milestone 4: Client and MCP

- [x] Replace frontend mock state with chain/SDK data.
- [x] Remove fake limit orders, assets, AI price and TEE telemetry.
- [x] Replace MCP mock responses with real tools.
- [x] Build, lint and responsive headless-browser checks.
- [x] Separate landing from the app shell; consolidate workflows into Trade, Wallet, and Activity.
- [x] Keep account, gas, refresh, and private-balance reveal globally available across app workflows.
- [x] Replace wallet-scoped order cards with a real public orderbook, URL filters, detail drawer, permission-aware actions, and session-only owner reveal.
- [x] Add the stateless permissionless keeper with dry-run, health, structured logs, optional webhook, and competing-keeper protection.
- [x] Replace linear `1..nextOrderId` polling with lifecycle-event indexes, finalized checkpoints, bounded log ranges, and active-order reads.
- [x] Add push/PR CI for contracts, keeper, frontend, deployment consistency, and secret scanning; keep signer-backed Sepolia E2E manual.
- [ ] Manual MetaMask smoke test in the final public-hosted URL.

### Milestone 5: Submission

- [x] Update README, developer feedback and verification report.
- [x] Deploy frontend publicly and record its canonical URL.
- [ ] Verify repository public accessibility.
- [ ] Record/publish demo video no longer than four minutes.
- [ ] Publish X post and complete final submission review.

### Milestone 6: Approved feature extension

- [x] Add encrypted min-out and deadline settlement with encrypted refund on rejection.
- [x] Deploy nWBTC/cWBTC and nSOL/cSOL plus real encrypted pools.
- [x] Add a Chainlink-triggered confidential limit-order contract and client flow.
- [x] Surface SDK-verified gateway response evidence and measured execution comparison.
- [x] Keep historical ACL revoke, raw Intel TDX telemetry, and unverifiable AI output out because the installed protocol exposes no authoritative APIs for them.

## 6. Verification matrix

| Flow | Test | Evidence | Status |
|---|---|---|---|
| Compile/ABI/security regression | `npm run compile && npm test` | 23 passing Node tests plus one Docker-gated Nox runtime suite, including 2,000 deterministic swap invariants | Pass |
| Local Nox runtime | `npm run test:nox` | Official Docker stack suite covers wrap, reserves/collateral, protected swap/refund, order execute/cancel/expire, double settlement, and unwrap proof | Added; nightly/manual CI, local run blocked by missing Docker |
| Keeper decisions, indexing, and lifecycle | `npm test`, `npm run keeper:dry`, and live cycles | Unit coverage, incremental active-order checkpoint, order #3 permissionless execution, and an order #5-only dry scan | Pass |
| Live Router V2 protections | `npm run test:sepolia` | Any funded signer; positive minOut settlement plus forced rejection with exact confidential refund and sanitized evidence artifact | Pass |
| New pools | Same live E2E | cWBTC and cSOL swaps decrypt to real cUSDC output | Pass |
| Confidential limit order | Same live E2E | Permissionless execution/expiry, exact cancel/expiry refunds, owner permissions, and double-settlement rejection | Pass |
| ACL viewer | Same live E2E | ACL subgraph contains granted viewer | Pass |
| Unwrap | Same live E2E | Exactly `0.01 nWETH` released after proof finalization | Pass |
| MCP protocol | `npm run test:mcp` and `npm run test:mcp:write` | Seven tools, live reads, real small swap, order create/cancel, receipt/event/status assertions, and sanitized evidence | Pass |
| Frontend static quality | `npm run test:unit && npm run build && npm run lint` | 21 unit tests including positive minOut derivation/validation, incremental event index/cache, production build, and zero lint errors | Pass |
| Continuous integration | `.github/workflows/ci.yml` | Push/PR compile, tests, lint, build, deployment consistency, and Gitleaks; YAML validated locally | Pass |
| Responsive layout | Headless Chrome 1440x1000 and 390x844 | Wallet-free live orderbook, responsive detail, URL reload, owner/non-owner controls, landing/app separation, and no horizontal overflow | Pass |
| Public dApp accessibility | Headless external URL test | Production route loads the live public orderbook at `https://frontend-dusky-five-56.vercel.app` | Pass |
| MetaMask UI happy path | Manual browser wallet test | Requires extension/user confirmation | Pending |

## 7. Remaining risks

| Risk | Impact | Mitigation |
|---|---|---|
| No external smart-contract audit | High for any non-testnet use | Keep testnet-only messaging; do not handle valuable assets |
| Chưa có LP shares/remove-liquidity | Medium for completeness | Giữ scope là test pool do deployer cấp vốn; không quảng bá permissionless LP product |
| Public RPC rate limits/timeouts | Medium | Allow configurable RPC and use static network configuration |
| Nox subgraph indexing delay | Medium | Bounded retries and explicit waiting status |
| Faucet cooldown blocks repeated demo | Medium | Pre-fund demo wallet and show remaining public balance |
| Production wallet write flow not manually confirmed | Medium | Run MetaMask happy path on the public URL before recording the demo |
| Docker-backed Nox workflow has not yet completed on GitHub | Low | Run the manual workflow, inspect service logs on failure, then decide whether it is stable enough for required PR CI |

## 8. Scope decisions

The user approved a new extension after remediation. Encrypted `minOut`/deadline, limit orders, and cWBTC/cSOL pools are now active build scope. LP shares/removal, a verifiable AI model, raw hardware telemetry, and fixed MEV-savings claims remain outside implementation until their trust and data dependencies are satisfied.
