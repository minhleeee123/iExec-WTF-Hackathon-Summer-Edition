# Comprehensive iExec Developer Tools Feedback — WTF Hackathon Summer Edition

> **Project:** NoxSwap — Confidential Liquidity & Swap Router  
> **Target Technology:** iExec Nox Protocol, ERC-7984 Confidential Tokens, `@iexec-nox/handle`, `nox-hardhat-plugin`  
> **Repository:** [minhleeee123/iExec-WTF-Hackathon-Summer-Edition](https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition)

---

## 1. Executive Summary & Project Context
During the **iExec WTF Hackathon Summer Edition**, our team built **NoxSwap**, a confidential DEX swap router that leverages the **iExec Nox Protocol** to execute confidential token swaps on **Ethereum Sepolia Testnet**. 

NoxSwap addresses one of the most critical challenges in decentralized finance: **maintaining commercial transaction privacy and eliminating MEV sandwich attacks without breaking EVM composability**. By combining on-chain smart contracts implementing the **ERC-7984 Confidential Token Standard** with off-chain **Intel TDX Trusted Execution Environment (TEE)** compute enclaves, Nox enables true privacy-preserving swaps.

Overall, building on the iExec Nox ecosystem was an empowering developer experience. Below is our comprehensive, structured feedback on what worked exceptionally well, technical friction points we encountered, and strategic recommendations for the iExec dev tools core team.

---

## 2. Key Developer Highlights (What Worked Exceptionally Well)

### 2.1 Standardized ERC-7984 Confidential Token Architecture
* **Interface Simplicity**: The `@iexec-nox/nox-confidential-contracts` package provides a clean, standardized interface (`IERC7984`) for confidential tokens (`cUSDC`, `cETH`). The concept of replacing public `uint256` balances with deterministic encrypted handles (`bytes32`) is elegant and avoids complex Zero-Knowledge circuit development.
* **Wrap/Unwrap Ergonomics**: The seamless mechanism to wrap standard ERC-20 tokens into confidential ERC-7984 tokens allows existing DeFi assets to gain privacy without requiring token issuers to rewrite underlying smart contracts.

### 2.2 Client-Side Encryption SDK (`@iexec-nox/handle`)
* **WASM-Free Frontend Integration**: Integrating client-side handle generation directly into our React 18 / Vite Web DApp was smooth. Developers can produce valid `einput` ciphertext handles without needing heavy local WASM cryptographic binaries.
* **Security Model**: Encrypting swap parameters (`amountIn`, slippage bounds) directly in the browser ensures that plaintext data never touches public RPC nodes or mempools.

### 2.3 Hardhat Starter & Plugin Ecosystem
* **Quick Onboarding**: The `nox-hardhat-starter` repository and `nox-hardhat-plugin` provided a solid foundation. Setting up compilation targets and writing custom contracts (`NoxSwap.sol`) worked seamlessly within standard Hardhat workflows.

---

## 3. In-Depth Technical Friction Points & Opportunities for Improvement

### 3.1 TEE Execution State Visibility & Polling Overhead
* **Current State**: Submitting a transaction on-chain triggers a `NoxCompute` event for off-chain TEE runners. However, tracking the transition from `TX_SUBMITTED` -> `TEE_ENCLAVE_PROCESSING` -> `SETTLED_ON_CHAIN` requires manual contract event polling in the frontend.
* **Impact**: In user-facing dApps, polling creates UI latency uncertainty. Users cannot distinguish between network RPC delays and TEE enclave execution.

### 3.2 Error Diagnosis Inside TEE Enclaves
* **Current State**: When an off-chain TEE runner encounters a state revert (e.g., insufficient pool liquidity inside the enclave), the on-chain transaction logs generic revert strings.
* **Impact**: Debugging encrypted state mismatches during contract development requires trial and error since internal TEE execution traces are protected.

### 3.3 Block Explorer (Etherscan) Transparency Visualization
* **Current State**: On Sepolia Etherscan, transactions display raw `bytes32` ciphertext handles. While this fulfills privacy guarantees, users and auditors cannot visually confirm that TEE hardware verification occurred without inspecting raw log topics.

---

## 4. Strategic Recommendations for the iExec Core Team

1. **Native WebSocket Event Subscription SDK**:
   * *Feature Proposal*: Add a high-level WebSocket event listener in `@iexec-nox/handle` (e.g., `noxSDK.onTEEStateChange(txHash, (status) => ...)`). This will allow frontends to display real-time animated TEE progress bars without custom polling.

2. **Specialized iExec Nox Explorer / Etherscan Extension**:
   * *Feature Proposal*: Build an official web explorer or Etherscan chrome extension that parses ERC-7984 handles and displays Intel TDX hardware attestation proofs directly next to transaction hashes.

3. **Expanded Frontend Framework Starters**:
   * *Feature Proposal*: Provide official Next.js and React + Viem/Wagmi starter kits pre-configured with `@iexec-nox/handle` hooks and viewing-key decryption providers.

4. **Local Mock TEE Simulator Node**:
   * *Feature Proposal*: Provide an optional local Hardhat node module that simulates off-chain Nox TEE compute instantly for unit testing without relying on Sepolia testnet execution delays.

---

## 5. Summary & Conclusion
The **iExec Nox Protocol** represents a major leap forward for privacy-preserving Web3 applications. By eliminating MEV front-running while keeping standard EVM liquidity pools composable, Nox opens the door for institutional DeFi adoption.

We thoroughly enjoyed building **NoxSwap** during this hackathon and hope this feedback helps shape the future roadmap of iExec developer tools!
