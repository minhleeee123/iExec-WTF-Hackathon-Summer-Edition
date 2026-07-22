# Build Plan

> Trạng thái: Approved; remediation implementation complete, public frontend deployment pending.

## 1. Preconditions

- [x] Participation Fit Gate đã được xác nhận.
- [x] Product Plan đã được người dùng phê duyệt.
- [x] Requirements, rubric và deadline đã được đọc.
- [x] Người dùng đã yêu cầu thay toàn bộ chức năng mô phỏng bằng chức năng thật hoặc báo cáo rõ phần không thể làm.

## 2. Product profile

- Client: React 19 + Vite + responsive CSS.
- Wallet/RPC: Ethers v6 `BrowserProvider`, MetaMask và Ethereum Sepolia.
- Core flow: Connect -> Faucet -> Wrap -> SDK encrypt -> Confidential swap -> SDK decrypt -> Receipt/history.
- Supporting real flows: Unwrap với public decryption proof, ACL viewer, Chainlink reference price, MCP stdio.
- Public frontend deployment: Chưa xác minh; local production build và responsive browser test đã pass.
- Contract deployment: Live on Ethereum Sepolia, addresses canonical trong `source-code/backend/deployment-sepolia.json`.

## 3. Tech stack

| Layer | Technology | Vai trò |
|---|---|---|
| Web client | React 19, Vite 5, Vanilla CSS | Operational swap UI và responsive layout |
| Wallet/contracts | Ethers 6 | EIP-1193 wallet, contract reads/writes và event parsing |
| Client Nox SDK | `@iexec-nox/handle@0.1.0-beta.13` | `encryptInput`, `decrypt`, `publicDecrypt`, `viewACL` |
| Confidential contracts | `@iexec-nox/nox-confidential-contracts@0.2.2` | Official ERC-7984 wrapper |
| Nox Solidity SDK | `@iexec-nox/nox-protocol-contracts@0.2.4` | Encrypted types, ACL và arithmetic primitives |
| Contract tooling | Hardhat 3, Solidity 0.8.35, Node 24 | Compile và artifacts |
| Oracle | Chainlink ETH/USD Sepolia feed | UI reference price, không quyết định settlement |
| Agent integration | MCP SDK stdio server | Real swap/decrypt/pool/ACL tools |

Không có database hoặc authentication server. MCP là một optional local agent adapter và chỉ ký bằng `PRIVATE_KEY` từ environment.

## 4. Kiến trúc

```text
[React / MetaMask]
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
- [ ] Manual MetaMask smoke test in the final public-hosted URL.

### Milestone 5: Submission

- [x] Update README, developer feedback and verification report.
- [ ] Deploy frontend publicly and record its canonical URL.
- [ ] Verify repository public accessibility.
- [ ] Record/publish demo video no longer than four minutes.
- [ ] Publish X post and complete final submission review.

## 6. Verification matrix

| Flow | Test | Evidence | Status |
|---|---|---|---|
| Compile/ABI/security regression | `npm run compile && npm test` | 5 passing Node tests | Pass |
| Live confidential swap | `npm run test:sepolia` | Tx `0x2218...63d1`, decrypted output and receipt `#2` | Pass |
| ACL viewer | Same live E2E | ACL subgraph contains granted viewer | Pass |
| Unwrap | Same live E2E | Exactly `0.01 nWETH` released after proof finalization | Pass |
| MCP protocol | `npm run test:mcp` | Tool discovery, live pool handles and balance decrypt | Pass |
| Frontend static quality | `npm run build && npm run lint` | Production build and zero lint errors | Pass |
| Responsive layout | Headless Chrome 1440x1000 and 390x844 | No observed horizontal overflow/overlap | Pass |
| Public dApp accessibility | Manual external URL test | URL not yet recorded | Pending |
| MetaMask UI happy path | Manual browser wallet test | Requires extension/user confirmation | Pending |

## 7. Remaining risks

| Risk | Impact | Mitigation |
|---|---|---|
| No external smart-contract audit | High for any non-testnet use | Keep testnet-only messaging; do not handle valuable assets |
| Router chưa có encrypted `minOut`/deadline | High for economic safety | Không tuyên bố zero-MEV; bổ sung slippage constraint trước mọi use ngoài demo |
| Chưa có LP shares/remove-liquidity | Medium for completeness | Giữ scope là test pool do deployer cấp vốn; không quảng bá permissionless LP product |
| Public RPC rate limits/timeouts | Medium | Allow configurable RPC and use static network configuration |
| Nox subgraph indexing delay | Medium | Bounded retries and explicit waiting status |
| Faucet cooldown blocks repeated demo | Medium | Pre-fund demo wallet and show remaining public balance |
| Public frontend not yet deployed | Disqualifying if unresolved | Deploy and manually smoke-test before submission freeze |

## 8. Scope decisions

Not implemented in remediation: encrypted `minOut`/deadline, LP shares/removal, limit-order keeper, cWBTC/cSOL pools, AI model, hardware-attestation UI, and fixed MEV-savings claims. These are documented in `source-code/VERIFICATION.md`.
