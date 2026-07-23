# iExec Nox Developer Tools & Protocol Feedback

> **Project**: NoxSwap — Confidential AMM Router V2 & Limit OrderBook on Ethereum Sepolia
> **Hackathon**: iExec WTF Hackathon Summer Edition 2026
> **Packages Tested**:
> - `@iexec-nox/nox-protocol-contracts@0.2.4`
> - `@iexec-nox/nox-confidential-contracts@0.2.2`
> - `@iexec-nox/handle@0.1.0-beta.13`
> - `@iexec-nox/nox-hardhat-plugin@0.1.0`

---

## 1. Context & Architecture Overview

NoxSwap is a confidential DeFi application deployed on Ethereum Sepolia. It leverages official iExec Nox ERC-7984 token wrappers (`cUSDC`, `cETH`, `cWBTC`, `cSOL`), encrypted constant-product pool reserves inside a TEE-backed Router V2, an automated OrderBook executing permissionless limit orders via Chainlink Oracles, and a Groq LLM-powered Intent Strategy Co-Pilot.

During implementation, we conducted extensive unit testing (33 frontend tests, 27 backend tests), Playwright automated UI testing across 4 viewports, and live on-chain Sepolia transaction verification using real EIP-712 signatures.

This feedback document details what worked exceptionally well, technical friction points encountered during development, exact runtime errors, and actionable recommendations for the iExec Nox team.

---

## 2. What Worked Well

### 2.1 Handle SDK & EIP-712 Signature Decryption
* **Compact Client API**: `createEthersHandleClient`, `encryptInput`, `decrypt`, `publicDecrypt`, and `viewACL` provide a seamless interface for encrypted state transitions.
* **Solidity Integration**: `encryptInput(value, "uint256", applicationContract)` generates valid ciphertext handles and input proofs that the on-chain `Nox.fromExternal` contract call accepts without custom cryptographic client boilerplate.
* **Private vs. Public Decryption Separation**: The clear distinction between private `decrypt` (session-only plaintext balance display) and `publicDecrypt` (producing on-chain verification proofs for 1:1 token unwrapping) allowed us to implement verifiable two-step asset exits safely.

### 2.2 Official ERC-7984 Wrappers & Operator Permissions
* **1:1 Confidential Token Wrapping**: `ERC20ToERC7984Wrapper` provided robust confidential balance ledgers while preserving underlying token decimals (e.g., 6 decimals for USDC, 18 for WETH).
* **`setOperator` Authorization**: The wrapper's operator delegation (`setOperator(limitOrderBook, expiry)`) enabled on-chain escrow for limit orders without transferring private ownership upfront, allowing automated keepers to execute swaps permissionlessly when Chainlink oracle prices trigger targets.

### 2.3 Solidity `euint256` Typed Primitives
* **Readable Confidential Logic**: Typed encrypted primitives (`euint256`) simplified implementing constant-product AMM formulas (`x * y = k`). Functions like `Nox.mul`, `Nox.div`, `Nox.add`, and `Nox.sub` kept reserve state encrypted on Sepolia while enforcing constant-product output bounds.

---

## 3. Technical Friction Encountered & Solutions

### 3.1 Docker Stack Prerequisite for Local Integration Tests
* **Problem**: The `@iexec-nox/nox-hardhat-plugin` off-chain execution services require a running Docker daemon. In CI/CD build environments where Docker is unavailable or restricted, local Nox integration testing fails during initialization.
* **Our Solution**: Developed unit mock suites (`src/lib/*.test.mjs`), synthetic handle verification, and live Sepolia E2E test scripts (`scripts/test-sepolia-e2e.js`).
* **Recommendation**: Provide a lightweight mock/deterministic local runner or documented remote testnet gateway for Docker-less CI pipelines. The Hardhat plugin should also detect missing Docker prerequisites early and output actionable setup commands.

### 3.2 Runtime Environment & Version Matrix Pinning
* **Problem**: Hardhat 3's EDR compiler dependency requires Node.js >= 22 (or Node 24). Running standard `npx hardhat` under Node 20.x produced obscure module initialization errors.
* **Our Solution**: Executed Hardhat tasks explicitly via `npx --yes node@24 node_modules/.bin/hardhat`.
* **Recommendation**: Publish an official pinned version compatibility matrix covering Node.js, Hardhat, Solidity compiler, `@iexec-nox/handle`, and `@iexec-nox/nox-confidential-contracts`.

### 3.3 Transfer Handle ACL Ownership Semantics
* **Problem**: During initial Router V2 testing on Sepolia, calling `confidentialTransfer(to, amount)` inside the router reverted with `INoxCompute.NotAllowed(handle, router)`. The transfer function returned a newly generated `transferred` handle that was not automatically authorized for the router's calling context, causing subsequent reserve arithmetic calls to fail.
* **Our Solution**: Refactored the router contract to retain and manage its own internal quoted amount handles (`euint256`) for reserve calculations while delegating the raw transfer to the ERC-7984 wrapper.
* **Recommendation**: Explicitly document ACL handle ownership rules for all `ERC20ToERC7984Wrapper` functions, detailing who becomes the admin/viewer of input handles, returned handles, sender balances, and receiver balances.

### 3.4 Subgraph Indexing Eventual Consistency (`viewACL`)
* **Problem**: Immediately calling `viewACL` or attempting balance decryption right after an ACL authorization transaction mined on Sepolia occasionally returned stale state due to subgraph indexing latency.
* **Our Solution**: Implemented bounded exponential backoff retries with client-side block height tracking in `src/lib/nox.js`.
* **Recommendation**: Add a helper function `waitForHandleIndexing(handle, { minBlock, timeoutMs })` to `@iexec-nox/handle` to eliminate custom retry loops in client dApps.

### 3.5 Protected `minOut` Rejection & Encrypted Refunds
* **Problem**: In encrypted swaps, setting an aggressive `minOut` higher than the TEE enclave's computed output resulted in `Protected swap rejected by encrypted minOut. Refunded 100%`. Users initially found the reason unclear when private balances re-locked.
* **Our Solution**: Integrated Chainlink ETH/USD oracle reference pricing to derive a suggested 0.50% slippage `minOut` (`deriveSwapMinOut`) and preserved revealed balance state in UI state management.
* **Recommendation**: Provide contract helper utilities or client SDK functions for deriving protected minimum output bounds relative to oracle feeds.

---

## 4. Documentation & Developer Experience Recommendations

1. **Explicit Gateway Architecture**: Clarify in client docs that `encryptInput` communicates with the trusted Nox Gateway over TLS for ciphertext generation. Avoid labeling it as "purely local client-side encryption."
2. **Hardware Attestation Verification APIs**: Expose standard SDK helpers to fetch and verify SGX/TDX TEE enclave hardware attestation quotes, enabling frontends to display verifiable attestation badges.
3. **Troubleshooting Guide for Custom Errors**: Include common EVM error selectors (`0x...`) and ACL revert reasons in a dedicated troubleshooting page.
4. **End-to-End Boilerplate Repository**: Provide a complete starter repository demonstrating token deployment, 1:1 wrapping, router operator authorization (`setOperator`), encrypted swap, and public decryption unwrap.

---

## 5. Summary

The iExec Nox Protocol and Handle SDK provide a powerful foundation for confidential DeFi on EVM-compatible chains. The `euint256` primitives and ERC-7984 token wrappers successfully enabled NoxSwap to deliver a confidential AMM and limit orderbook on Ethereum Sepolia. 

Addressing local Docker-less testing support, explicit version compatibility matrixes, and subgraph indexing helpers will further accelerate developer adoption.
