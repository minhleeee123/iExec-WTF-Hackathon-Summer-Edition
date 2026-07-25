# Product Plan

> Status: Approved — extended feature scope approved by the user on 2026-07-22

## 1. Approval Input

- User-selected idea: **Option 1: NoxSwap — Confidential Liquidity & Swap Router**
- Confirmation date: 2026-07-22
- User-requested condition or change: Optimize for a React + Vite + Ethers web client that works end to end on Ethereum Sepolia without mock data.

## 2. Product Name

- Name: **NoxSwap**
- Tagline: Confidential Liquidity & DEX Swap Router powered by iExec Nox & ERC-7984
- Client type: Web Application (PWA / mobile-responsive)

## 3. Problem Statement

- Problem: Transactions on public AMMs/DEXs such as Uniswap and Curve are fully transparent, exposing swap amounts, slippage, and balance history on-chain.
- Affected users: Institutional traders, DeFi whales, Web3 companies, and users seeking to protect their trading positions.
- Importance: Information leakage exposes users to MEV attacks such as sandwich attacks and front-running, copy trading, and loss of commercial confidentiality.
- Weakness of existing solutions: ZK shielded pools such as Railgun and ZK rollups such as Aztec may isolate liquidity and reduce Ethereum **DeFi composability**.
- Evidence IDs: RES-001, RES-004, RES-005.

## 4. Target Users

### Primary Users

- Description: DeFi traders and Web3 institutions.
- Goal: Execute large token swaps or keep asset positions private without being front-run.
- Pain points: Public wallet balances and MEV-driven price pressure on large public-DEX swaps.

### Secondary Users

- Description: DeFi developers and iExec Nox community judges.
- Goal: Evaluate a practical ERC-7984 and Nox TEE integration.
- Pain points: They want a real end-to-end Sepolia application rather than a theoretical model.

## 5. Value Proposition

> **NoxSwap** enables **DeFi traders and institutions** to execute swaps while **amounts, balances, and pool reserves do not appear as plaintext on-chain**, by integrating iExec Nox and ERC-7984 directly on Ethereum Sepolia.

## 6. Assumptions, Constraints, and Dependencies

| Item | Type | Basis | Verification | Impact If Wrong |
|---|---|---|---|---|
| iExec Nox supports deployment and TEE runner execution on Ethereum Sepolia | Dependency | Sponsor technical brief | Check Sepolia RPC and `NoxCompute` | Medium |
| ERC-7984 supports wrap/unwrap from Sepolia ERC-20 assets | Constraint | `@iexec-nox/nox-confidential-contracts` | Compile and test contracts locally | Low |
| Ten development days remained before the 2026-08-02 deadline | Constraint | User-provided timeline | Keep a disciplined MVP scope | High |

## 7. Core User Flow

1. **Launch App:** The landing page presents deployment evidence; the user deliberately opens the application shell.
2. **Connect Wallet:** The user connects MetaMask on Ethereum Sepolia from the sidebar or mobile wallet drawer.
3. **Wrap to Confidential (ERC-7984):** In Wallet, the user converts public ERC-20 assets into confidential `cUSDC` ERC-7984 assets.
4. **Configure Encrypted Trade:** In Trade, the user selects a protected swap or private limit order. The client SDK (`@iexec-nox/handle`) encrypts sensitive values.
5. **Execute with Nox:** The user submits an on-chain transaction. Contracts call Nox encrypted primitives and update reserve/balance handles on Sepolia.
6. **Private Balance Decryption:** The user signs through the shared private-wallet control to reveal session-only balances; forms retain local reveal actions when needed.

## 8. MVP

### Must-Have

- [x] Responsive Swap dApp UI using an operational neo-brutalist design.
- [x] Real Ethereum Sepolia wallet connection through Ethers v6 `BrowserProvider`.
- [x] ERC-7984 and NoxSwap smart contracts deployed on Sepolia.
- [x] Swap-parameter encryption through `@iexec-nox/handle` and Nox encrypted-compute primitives.
- [x] Private-balance decryption in the UI with local authorization.
- [x] Repository-root `feedback.md` with actionable feedback for iExec developer tools.

### Should-Have

- [x] Recent transaction history with encrypted-state indicators.
- [x] Smooth Sepolia test-token faucet flow in the UI.

### Nice-to-Have

- [ ] TradingView price chart for supported pairs.

### Approved Extensions

- [x] Encrypted minimum output and public deadline protection for every swap.
- [x] Real confidential limit orders with encrypted amount/minimum output, Chainlink trigger, expiry, cancellation, and permissionless execution.
- [x] Real Sepolia nWBTC/cWBTC and nSOL/cSOL assets with encrypted liquidity pools.
- [x] Gateway-response attestation evidence derived from successful Nox SDK verification.
- [x] Measured execution-versus-oracle comparison without unsupported counterfactual MEV-savings claims.
- [x] Groq Strategy Agent converts natural-language ETH/USDC intents and public Chainlink context into strict, reviewable order drafts; private balance math, Nox encryption, and transaction approval remain local.
- [x] Safe Treasury adds configurable swap tolerance/deadline, event-derived Activity, a draft-only Strategy Agent, and recoverable Safe-to-owner/Safe unwrap without granting the module arbitrary execution.

## 9. Non-Goals

Not included in the hackathon version:

- [ ] A separate native mobile application for iOS/Android; the product is a responsive/PWA web app.
- [ ] A cross-chain bridge to L1 networks beyond Sepolia.
- [ ] Cross-chain settlement or native Solana custody; nSOL remains an explicitly labeled Sepolia test asset.
- [ ] AI price prediction, autonomous AI custody, or AI-gated settlement; Chainlink and contract rules remain authoritative.
- [ ] Direct Safe faucet, owner-only execute-order UI, or browser multi-owner signature orchestration; Safe funding reuses the personal faucet/wrap path, order execution remains permissionless, and multi-owner signing remains in Safe Wallet.

## 10. Sponsor Technology

- Technology: **iExec Nox Protocol (`NoxCompute`, ERC-7984 standard, and TEE runners)**.
- Role in the core flow: The central computation layer for encryption/decryption and private asset-state updates without plaintext on-chain values.
- Why it is substantive: Without Nox, the product becomes a public DEX that exposes balances. Nox processes the core transaction flow.
- Required demo evidence: Sepolia Etherscan transaction hashes show encrypted handles rather than plaintext amounts, followed by authorized decryption in the UI.

## 11. Data, Privacy, and Security

- Required data: Encrypted ERC-7984 token balances and Sepolia wallet addresses.
- Source and permission: Direct authorization from the EIP-1193 connected wallet.
- Sensitive data: Actual swap amounts and personal balances, represented on-chain by Nox handles.
- Minimum protection: Never store private keys in source or server code; plaintext input travels over TLS to the Nox Gateway under the Handle SDK security model and is not sent to the public RPC/mempool.

## 12. Acceptance Criteria

| Feature | Completion Condition | Verification | Rubric Evidence |
|---|---|---|---|
| Wallet Connection | MetaMask connects smoothly on Sepolia | Browser smoke test | JUD-002 (End-to-end) |
| ERC-7984 Wrap/Unwrap | ERC-20 converts successfully to and from confidential assets | Inspect Sepolia transaction | JUD-006 (Technical) |
| Confidential Swap | Swap succeeds between two confidential assets using encrypted input | Inspect executed Nox transaction log | JUD-001 (Creativity), JUD-003 |
| Local Decryption | Private balance renders after local authorization | Inspect UI state | JUD-007 (UX) |
| Developer Feedback | `feedback.md` exists in the repository | Inspect GitHub file | JUD-004 (`feedback.md`) |

## 13. Demo Success Metrics

| Metric | Target | Demo Measurement |
|---|---|---|
| Swap completion time | Complete within 120 seconds on Sepolia | Screen-record the demo |
| Balance confidentiality | Etherscan does not expose the real balance value | Inspect the transaction in the video |
| Demo video duration | No longer than 4 minutes | Keep the video concise |

## 14. Demo Scenario

- Demo user: A trader wants to swap 1,000 cUSDC to cETH on Sepolia without exposing the balance.
- Step 1: Connect MetaMask and claim 1,000 Sepolia USDC from the faucet.
- Step 2: Select Wrap and receive 1,000 cUSDC (ERC-7984).
- Step 3: Enter a 500 cUSDC-to-cETH swap; the UI encrypts the amount into a handle and submits the transaction.
- Step 4: NoxSwap performs AMM math through Nox primitives and updates encrypted reserve/balance handles.
- Step 5: Select Decrypt Balance; the UI shows the updated cETH and cUSDC balances.
- Final result: The transaction succeeds, Sepolia Etherscan shows only encrypted handles, and the user owns the new asset.

## 15. Landing Page Brief

> Build the landing page after the core product is complete.

- Primary experience: A standalone landing page that shows neither wallet state nor application navigation before the user selects **Launch App**.
- App information architecture: Four top-level workspaces—`Trade`, `Wallet`, `Safe Treasury`, and `Activity`. Personal and Safe custody never share one tab. Safe uses a compact custody header for identity, module state, balances, reveal, and funding, followed by four URL-addressable sections: Swap & Unwrap, Orders & Agent, Activity, and Access & Security.
- Shared controls: Account, network, refresh, gas, and private-balance reveal in the desktop sidebar or mobile wallet drawer.
- Secondary CTA: Sepolia explorer for the router.
- Hero message: “Confidential execution for swaps, limit orders, and ERC-7984 assets.”

## 16. Rubric Mapping

| Rubric ID | Corresponding Feature/Evidence | Presentation |
|---|---|---|
| JUD-001 (Creativity ⭐⭐⭐) | Confidential Liquidity & Swap Router through Nox | Demo in video and explain reduced amount leakage without claiming immunity to all MEV |
| JUD-002 (End-to-End ⭐⭐⭐) | Fully operational Sepolia dApp without mocks | Walk through the live product |
| JUD-003 (Sepolia Deploy ⭐⭐) | Live smart contracts and frontend | Provide demo URL and Sepolia addresses |
| JUD-004 (`feedback.md` ⭐⭐) | Repository feedback for iExec tools | Include the file directly in the repository |
| JUD-005 (Video ≤4 min ⭐⭐) | Concise demo video under four minutes | Publish the submission video |
| JUD-006 (Technical ⭐) | iExec Nox TEE and ERC-7984 integration | Explain contract and handle architecture |
| JUD-007 (UX ⭐) | Modern, easy-to-use interface | Demonstrate a low-friction user journey |

## 17. Approval Gate

- [x] The user selected the idea.
- [x] MVP and non-goals are clearly defined.
- [x] The Product Plan is ready for user review and approval.
