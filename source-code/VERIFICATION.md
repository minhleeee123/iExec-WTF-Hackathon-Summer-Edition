# NoxSwap Remediation and Verification

Date: 2026-07-22

Production frontend: [https://frontend-dusky-five-56.vercel.app](https://frontend-dusky-five-56.vercel.app)

## Converted to Real Features

| Feature | Implementation evidence | Test result |
|---|---|---|
| Client input encryption | `@iexec-nox/handle.encryptInput` returns a 32-byte handle and 137-byte proof for the Sepolia router | PASS |
| ERC-7984 balances | Official `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts` | PASS |
| Confidential liquidity | Router stores Nox reserve handles for cUSDC/cETH, cWBTC/cUSDC, and cSOL/cUSDC | PASS, three initialized live pools |
| Protected confidential swap | Input/minOut are encrypted; Router V2 settles output or selects a full encrypted refund | PASS, settle tx `0xb3e661...`; forced rejection/refund tx `0x8ca995...` |
| Additional assets | nWBTC/cWBTC and nSOL/cSOL use deployed faucets, official wrappers, and encrypted liquidity | PASS, live swaps decrypted as `598.140365 cUSDC` and `149.547018 cUSDC` |
| Confidential limit orders | Amount/minOut escrowed as handles; Chainlink trigger, permissionless execution, cancel, and expiry refund are on-chain | PASS, order #1 executed and order #2 cancelled with exact `2 cUSDC` refund |
| Public confidential orderbook | `nextOrderId`, `getOrder`, lifecycle events, `canExecute`, block timestamp, and Chainlink feed drive wallet-free status/filter/detail views | PASS, four real orders including executable order #4 ([creation tx](https://sepolia.etherscan.io/tx/0x2c44ff3e96c2598bd2e764553aff88ff93e3272245b13875f5fcfe0920784114)); URL reload/back/forward and isolated RPC failure paths tested |
| Stateless order keeper | Pure decision engine plus sequential Sepolia scanner, dry-run, health endpoint, structured logs, optional webhook, and stale-race handling | PASS, keeper executed order #3 permissionlessly ([settlement tx](https://sepolia.etherscan.io/tx/0x58f5918517ac0e0a821511379f2605a25a9931ed1db7579a0a1c09c324f1f3f5)); no decrypt path was invoked |
| Authorized decryption | Handle SDK decrypts output and balance handles after EIP-712 authorization | PASS |
| Faucet and wrap | Faucet mints public test assets; wrapper escrows them and creates encrypted balances | PASS |
| Unwrap | Encrypted request, public decryption proof, contract finalization, and underlying release | PASS, `0.01 nWETH` verified |
| Selective ACL | Wrapper grants a viewer on the current balance handle; Nox subgraph confirms the account | PASS |
| Receipt NFT | Router mints ERC-721 receipt and returns on-chain base64 JSON/SVG metadata | PASS, receipt `#2` verified on the current deployment |
| Swap history | Frontend reads actual `SwapExecuted` logs from the router deployment block | PASS |
| Proof inspector | Frontend displays actual tx hash, calldata, input/output handles, proof byte length, and block | PASS by build and source test |
| Price reference | Sepolia Chainlink ETH/USD `latestRoundData` replaces the simulated AI price | PASS |
| MCP tools | MCP v3 exposes seven real protected-swap, decrypt, pool, ACL, and limit-order tools over stdio | PASS |
| Responsive UI | Production build plus headless Chrome at `1440x1000` and `390x844`; validates public orderbook/detail, URL persistence, owner/non-owner controls, landing/app separation, desktop sidebar, mobile wallet drawer, and bottom navigation | PASS |
| Public source verification | Sourcify API v2 Standard JSON verification | PASS, exact creation/runtime match for all ten project contracts |

The Router V2 live E2E run verified normal settlement, an intentionally impossible minOut with exact confidential refund, both new pools, order execution/cancellation, ACL sharing, receipt ownership, and release of exactly `0.01 nWETH` during unwrap.

## Remaining Unsupported Features

| Previous claim | Current status | Reason |
|---|---|---|
| AI price guard | Replaced with Chainlink reference price | No AI service, model, endpoint, or verifiable inference existed. |
| Real-time Intel TDX terminal | Not implemented | The SDK verifies Gateway-signed responses but exposes no authoritative raw hardware telemetry API. |
| Historical ACL revoke | Not implemented | Installed Nox SDK/contract interface exposes `addViewer` but no `removeViewer`; a new balance handle does not inherit the prior grant. |
| Fixed MEV-savings calculator | Replaced | UI measures actual execution deviation against Chainlink only for supported ETH/USDC swaps. |
| Zero-MEV guarantee | Not claimed | Encrypted amount/minOut and deadline reduce leakage and bound settlement, but cannot prove immunity from every MEV strategy. |
| Permissionless LP lifecycle | Not implemented | Initial liquidity is real but deployer-funded; there are no LP shares or remove-liquidity operations. |
| Local Nox integration test | Not available in this environment | The Nox Hardhat off-chain services require Docker, which is not installed. Live Sepolia E2E is used instead. |

## Current Rubric Assessment

| Criterion | Current estimate | Assessment |
|---|---:|---|
| Creativity, 3 stars | 2.6-2.9 | Confidential AMM, encrypted slippage protection, limit-order escrow, and selective disclosure are differentiated. |
| End-to-end accessible, 3 stars | 2.6-2.9 | Real Sepolia E2E and public wallet-free orderbook are proven; production MetaMask write confirmation remains. |
| ETH Sepolia deployment, 2 stars | 2.0 | Ten live contracts, three encrypted pools, order book, and exact Sourcify matches. |
| `feedback.md`, 2 stars | 1.8-2.0 | Specific feedback based on actual ACL, indexing, Docker and version issues. |
| Demo video, 2 stars | 0.0 | No final video exists yet. |
| Technical implementation, 1 star | 0.8-1.0 | Nox is in the core arithmetic/transfer path, with SDK encryption/decryption and ACL. |
| UX, 1 star | 0.7-0.9 | Responsive operational UI passes automated checks; wallet workflow still needs production manual smoke test. |

Strict current estimate: **10.4-11.7 / 14**. After manual wallet validation and a strong sub-four-minute video, a realistic target is **12.4-13.6 / 14**. The largest remaining scoring risk is the missing demo video, not the Nox contract integration.

## Repeatable Commands

```bash
cd source-code/backend
npm run compile
npm test
npm run keeper:dry
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:mcp

cd ../frontend
npm run test:unit
npm run build
npm run lint
npm run test:ui
```

## Security Notes

- Runtime files contain no embedded private key or fallback signing key.
- Keeper logs, webhook payloads, and health responses exclude private keys, plaintext order terms, decryption output, and encrypted handles.
- `.env` files are ignored by git.
- This remains hackathon/testnet software and has not received an external smart-contract security audit.
- Test faucet assets have no monetary value.
- Frontend `npm audit` reports 0 vulnerabilities after the Vite 8 upgrade.
- Backend audit retains four high advisories in the dev-only Hardhat/Nox plugin chain (`adm-zip`) with no compatible upstream fix, plus two moderate advisories through the MCP SDK HTTP adapter. NoxSwap uses MCP over stdio and does not expose the affected static HTTP server.
