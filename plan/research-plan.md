# Research Plan

> Status: Ready for the research agent
> Every finding must include a source or be marked as an inference.

## 1. Required Input

- `docs/competition-summary.md`
- `docs/requirements.md`
- `docs/judging-criteria.md`
- `docs/important-notes.md`

## 2. Research Objectives

- Understand the challenge's users and problem.
- Verify that a web/mobile application can provide core value.
- Find comparable solutions and exploitable gaps.
- Assess the feasibility of data, APIs, and sponsor technology.
- Produce evidence for brainstorming and rubric mapping.

## 3. Questions and Keywords

- Main problem: Add privacy to public DeFi/open-source infrastructure without breaking composability.
- Target users: Builders, DeFi users, and teams that need confidential workflows.
- Domain: Confidential DeFi and privacy-preserving smart contracts.
- Mandatory technology: iExec Nox and Ethereum Sepolia deployment.
- Sponsor technology: iExec Nox protocol, docs, wizard, Hardhat plugin/starter.
- Comparable-product keywords: confidential DeFi, privacy-preserving swap, private treasury, encrypted smart contract, Nox integration.
- Hypothesis: An end-to-end front end can demonstrate Nox's value more clearly than a protocol-only demo.

## 4. Research Scope

Priority order:

1. Official sources and sponsor technical documentation.
2. User needs, workflows, and pain points.
3. Products directly or indirectly related to the challenge and rubric.
4. Credible hackathon projects, open-source projects, or case studies.
5. Data, API, access, and demo-feasibility risks.

The number of comparable products depends on the challenge. Usually select two to five genuinely relevant products; do not add competitors merely to increase the count or because they are well known.

Prioritize products that meet at least one condition:

- Solve the same problem or serve the same users.
- Have a similar web/mobile core flow.
- Demonstrate a competition rubric criterion well.
- Are award-winning projects or case studies with relevant evidence.

## 5. Evidence Log

| ID | Finding | Fact/Inference | Source or URL | Accessed | Confidence | Rubric Relevance |
|---|---|---|---|---|---|---|
| RES-001 | iExec Nox uses ERC-7984 for confidential tokens, equivalent to confidential ERC-20, based on encrypted handles such as `einput` and `euint64`. | Fact | https://github.com/iExec-Nox/nox-confidential-contracts | 2026-07-22 | High | JUD-006 (Technical) |
| RES-002 | Nox combines on-chain contracts with off-chain TEE execution (Intel TDX runners) and a distributed KMS to compute encrypted values without exposing plaintext on-chain. | Fact | https://docs.iex.ec/nox-protocol | 2026-07-22 | High | JUD-006 (Technical) |
| RES-003 | The official toolkit includes `nox-confidential-contracts`, `nox-protocol-contracts`, `nox-hardhat-starter`, the Hardhat plugin, and Confidential Wizard. | Fact | https://github.com/iExec-Nox | 2026-07-22 | High | JUD-003 (Sepolia), JUD-004 (`feedback.md`) |
| RES-004 | ERC-7984 supports access-control lists for selective viewing, including auditing/compliance use cases, while keeping values confidential from the public. | Fact | https://github.com/iExec-Nox/nox-confidential-contracts | 2026-07-22 | High | JUD-001 (Creativity), JUD-007 (UX) |

## 6. Comparable Product or Project Analysis

| Product/Project | Challenge Relevance | Users and Core Flow | Strengths | Weaknesses/Gaps | Related Rubric IDs | Evidence ID |
|---|---|---|---|---|---|---|
| Zama fhEVM / Fhenix | Indirect; uses FHE rather than TEE | Developers building confidential dApps | Fully encrypted mathematical model through FHE | FHE computation remains slow and has limited smooth EVM commercialization | JUD-001, JUD-006 | RES-001 |
| Oasis Sapphire / Secret Network | Similar TEE/confidential EVM model | Privacy-focused DeFi users | Independent private execution environment | Requires a different chain/L1/L2 rather than adding Nox directly to Ethereum Sepolia | JUD-001, JUD-003 | RES-002 |
| Standard ERC-20 swaps (Uniswap v3/v4) | Existing infrastructure suitable for integration | Traders and liquidity providers | Deep liquidity and strong composability | Token amounts, positions, and addresses are fully public | JUD-001, JUD-002 | RES-001, RES-004 |

## 7. Competitor/Rubric Benchmark

For every official criterion, identify a relevant product, project, or case study to understand what evidence may persuade judges.

| Rubric ID | Reference Product/Project | What It Demonstrates Well | Observable Evidence | Exploitable Gap | Evidence ID |
|---|---|---|---|---|---|
| JUD-001 (Creativity) | Encrypted orderbook / dark pool | Hides order quantities | Positions are not exposed before matching | Integrate ERC-7984 confidential swaps directly through Nox | RES-001, RES-004 |
| JUD-002 (End-to-End) | Live Sepolia dApps | Real WalletConnect/Viem connection without mocks | Confirmed transactions on Sepolia Etherscan | Build a polished UI that exposes Nox encryption/decryption progress | RES-003 |
| JUD-006 (Technical) | iExec Nox Hardhat Starter | Standard ERC-7984 and `NoxCompute` deployment | Contracts inherit from official Nox libraries | Combine ERC-7984 with application-specific business logic | RES-001, RES-002 |
| JUD-007 (UX) | Uniswap / Sablier App | Simple, intuitive interface | One-click approval and execution | Integrate private-wallet decryption without making the UX confusing | RES-004 |

Do not copy features or claim that a product scored highly without a source. Extract only evidence-backed patterns, quality standards, and differentiation opportunities.

## 8. Feasibility

| Topic | Question | Result | Evidence ID | Risk |
|---|---|---|---|---|
| Data | Is there enough demo data to avoid mocking the core flow? | Verified: Sepolia faucet and ERC-7984 test tokens | RES-003 | Low |
| API/SDK | Are Nox packages, wizard, and Hardhat plugin/starter sufficient? | Verified: `nox-confidential-contracts` is available | RES-001, RES-003 | Low |
| Sponsor technology | Where does Nox have a real role in the core flow? | Verified: ERC-7984 confidential balances and Nox compute | RES-001, RES-002 | Low |
| Web/mobile demo | Which UI flow demonstrates value most quickly? | Verified: React/Vite web dApp with Wagmi/Viem | RES-004 | Low |
| Delivery time | Can it be completed before 2026-08-02? | Verified: ten days remained and the MVP scope was clear and feasible | RES-003 | Low |

## 9. Gaps and Opportunities

- Unmet need: confidential workflows for public protocols.
- Inefficient workflow: privacy often sacrifices composability or requires modifying the underlying protocol.
- Poor experience: privacy demos often stop at proof of concept rather than becoming functional apps.
- Underused technology: Nox can process encrypted data within the core flow.
- Buildable differentiator: route a DeFi action through Nox while preserving a complete product UI.

## 10. Rubric Mapping

Every important finding must answer:

- Which criterion does it support?
- Can it become evidence or a demo?
- Is it feasible before the deadline?
- Does it depend on data or services that are difficult to control?

## 11. Brainstorm Handoff

- Important evidence IDs: RES-001, RES-002, RES-003, RES-004.
- Notable competitor/rubric benchmarks: encrypted orderbook/dark pool (JUD-001), live Sepolia dApps (JUD-002), and iExec Nox Starter (JUD-006).
- Opportunities to brainstorm:
  1. Private Swap / Liquidity Router (Uniswap/Curve + Nox ERC-7984).
  2. Confidential Payroll & Streaming Payouts (Sablier/Superfluid + Nox ACLs).
  3. Private Treasury Manager (Gnosis Safe + encrypted balances).
- Directions to avoid: a superficial wallet wrapper without real confidential contract processing, or a Nox integration confined to the backend whose privacy value is invisible in the UI.
- Unresolved risk: an additional submission portal beyond X may exist. The 2026-08-02 deadline and star weights were already resolved.
