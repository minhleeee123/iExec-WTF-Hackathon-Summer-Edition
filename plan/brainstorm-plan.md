# Brainstorm and Idea Selection Plan

> Status: Complete; the user selected the idea

## 1. Required Input

- Requirements and disqualification conditions (`docs/requirements.md`).
- Official rubric (`docs/judging-criteria.md`).
- Participation Fit Gate (`docs/competition-summary.md`).
- Research Evidence Log (RES-001 through RES-008 in `plan/research-plan.md`).
- Deadline: 2026-08-02 04:59; ten days remained at selection time.

## 2. Brainstormed Ideas

### Idea 1: NoxSwap — Confidential Liquidity & Swap Router (Selected)

- **Description:** Route confidential ERC-7984 token swaps through Uniswap/Curve pools without exposing swap amounts or order positions on-chain.
- **Target users:** Institutional traders, DeFi whales, and individuals seeking to avoid MEV sandwich attacks.
- **Core flow:** Connect wallet -> Select tokens -> Encrypt swap amount (`einput`) -> Nox TEE computes execution -> Settle with ERC-7984 tokens on Sepolia.
- **Differentiated value:** Preserve privacy and EVM composability on Sepolia without modifying the underlying protocol.
- **Sponsor technology:** `@iexec-nox/nox-confidential-contracts` (ERC-7984), `NoxCompute` TEE, and the Hardhat starter.
- **Evidence IDs:** RES-001, RES-002, RES-004, RES-005.

### Idea 2: NoxPay — Confidential Payroll & Automated Streaming

- **Description:** Confidential automated salary payments and payment streams for Web3 DAOs/startups.
- **Core flow:** Manager creates a stream -> Enters an encrypted balance -> Contributor privately decrypts and claims funds.
- **Sponsor technology:** Nox ERC-7984 plus Nox ACLs that let an auditor view tax reports.
- **Evidence IDs:** RES-001, RES-004.

### Idea 3: NoxVault — Private Treasury & Portfolio Manager

- **Description:** Confidential corporate treasury management through a private Gnosis Safe/treasury vault.
- **Core flow:** Create vault -> Deposit encrypted tokens -> Propose private internal transfers.
- **Sponsor technology:** Nox ERC-7984 plus Nox TEE state computation.
- **Evidence IDs:** RES-002, RES-003.

### Idea 4: NoxDarkPool — Confidential Off-Chain Order Matching

- **Description:** A TEE-based dark pool that hides buy/sell positions.
- **Risk:** The orderbook is complex and the ten-day implementation period was too short.

## 3. Hard Gate Evaluation

| Idea | Eligible | Matches Challenge | Web/Mobile Is Core | Mandatory Technology | Feasible Before Deadline | Demoable | Result |
|---|---|---|---|---|---|---|---|
| 1. NoxSwap | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 2. NoxPay | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 3. NoxVault | Pass | Pass | Pass | Pass | Pass | Pass | **PASS** |
| 4. NoxDarkPool | Pass | Pass | Pass | Pass | Fail; too complex | Pass | **FAIL** |

## 4. Official Rubric Scoring (1–5 Scale, Star-Weighted)

| Idea | Creativity (⭐⭐⭐) | End-to-End (⭐⭐⭐) | Sepolia Deploy (⭐⭐) | `feedback.md` (⭐⭐) | Video (⭐⭐) | Technical (⭐) | UX (⭐) | Weighted Total /14 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **1. NoxSwap** | 5/5 (3 stars) | 5/5 (3 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 5/5 (1 star) | 4/5 (0.8 stars) | **13.8 / 14** |
| **2. NoxPay** | 4/5 (2.4 stars) | 5/5 (3 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 4/5 (0.8 stars) | 4/5 (0.8 stars) | **13.0 / 14** |
| **3. NoxVault** | 3.5/5 (2.1 stars) | 5/5 (3 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 5/5 (2 stars) | 4/5 (0.8 stars) | 4/5 (0.8 stars) | **12.7 / 14** |

## 5. Shortlist Presented to the User

1. **Option 1 (Recommended): NoxSwap — Confidential Liquidity & Swap Router**
2. **Option 2: NoxPay — Confidential Payroll & Automated Streaming**
3. **Option 3: NoxVault — Private Treasury & Portfolio Manager**

## 6. Official User Selection

- **Selected idea:** **Option 1: NoxSwap — Confidential Liquidity & Swap Router**
- **Selected at:** 2026-07-22T10:46:53+07:00
- **Status:** Confirmed and approved. Proceed to complete `plan/product-plan.md`.
