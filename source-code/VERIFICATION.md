# NoxSwap Remediation and Verification

Date: 2026-07-22

## Converted to Real Features

| Feature | Implementation evidence | Test result |
|---|---|---|
| Client input encryption | `@iexec-nox/handle.encryptInput` returns a 32-byte handle and 137-byte proof for the Sepolia router | PASS |
| ERC-7984 balances | Official `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts` | PASS |
| Confidential liquidity | Router accepts external handles/proofs and stores Nox reserve handles | PASS, tx `0xd89f67ed643bf04c14c7e2e8df552ecd816b7f626b6c0c0bcba5c32a3bed0e24` |
| Confidential swap | Input is debited through `confidentialTransferFrom`; output uses the wrapper's actual transferred handle and encrypted pool liquidity | PASS, latest test tx `0x22181e310a90ae69a01cb3f63e1952cab87a7b30c97d4419143ee267e7f163d1` |
| Authorized decryption | Handle SDK decrypts output and balance handles after EIP-712 authorization | PASS |
| Faucet and wrap | Faucet mints public test assets; wrapper escrows them and creates encrypted balances | PASS |
| Unwrap | Encrypted request, public decryption proof, contract finalization, and underlying release | PASS, `0.01 nWETH` verified |
| Selective ACL | Wrapper grants a viewer on the current balance handle; Nox subgraph confirms the account | PASS |
| Receipt NFT | Router mints ERC-721 receipt and returns on-chain base64 JSON/SVG metadata | PASS, receipt `#2` verified on the current deployment |
| Swap history | Frontend reads actual `SwapExecuted` logs from the router deployment block | PASS |
| Proof inspector | Frontend displays actual tx hash, calldata, input/output handles, proof byte length, and block | PASS by build and source test |
| Price reference | Sepolia Chainlink ETH/USD `latestRoundData` replaces the simulated AI price | PASS |
| MCP tools | MCP v2 performs real SDK balance decrypt and exposes real swap/pool/ACL operations over stdio | PASS |
| Responsive UI | Production build plus headless Chrome at `1440x1000` and `390x844` | PASS |
| Public source verification | Sourcify API v2 Standard JSON verification | PASS, exact creation/runtime match for all five contracts |

The final live E2E run decrypted `100 cUSDC` swap output as `0.049835078385310542 cETH`, verified the actual transferred output handle ACL, verified receipt ownership, granted a selective viewer, and released exactly `0.01 nWETH` during unwrap.

## Removed or Not Implemented

| Previous claim | Current status | Reason |
|---|---|---|
| Confidential limit orders | Removed from UI and MCP | No on-chain order book, price trigger, keeper, or settlement path existed. Building one is a separate approved product feature, not a repair. |
| cWBTC and cSOL | Removed from selectors and balances | The old addresses and balances were invalid placeholders. Only cUSDC/cETH have deployed wrappers and liquidity. |
| AI price guard | Replaced with Chainlink reference price | No AI service, model, endpoint, or verifiable inference existed. |
| Real-time Intel TDX terminal | Replaced with client transaction evidence log | The app has no official enclave telemetry or attestation API to support those state claims. |
| Fixed MEV-savings calculator | Removed | The 2.4% number was an unsupported constant and could not be attributed to an observed trade. |
| Zero-MEV guarantee | Not claimed | Private amounts reduce public information leakage, but the router has no encrypted `minOut`/deadline and cannot guarantee immunity from all price manipulation. |
| Permissionless LP lifecycle | Not implemented | Initial liquidity is real but deployer-funded; there are no LP shares or remove-liquidity operations. |
| Local Nox integration test | Not available in this environment | The Nox Hardhat off-chain services require Docker, which is not installed. Live Sepolia E2E is used instead. |

## Current Rubric Assessment

| Criterion | Current estimate | Assessment |
|---|---:|---|
| Creativity, 3 stars | 2.2-2.6 | Confidential AMM and selective disclosure are differentiated, but economic controls and LP lifecycle remain narrow. |
| End-to-end accessible, 3 stars | 1.5-2.3 | Real Sepolia E2E is proven by tests; a public frontend URL and production MetaMask smoke test are still missing. |
| ETH Sepolia deployment, 2 stars | 2.0 | Five live contracts, encrypted pool, transactions and exact Sourcify matches. |
| `feedback.md`, 2 stars | 1.8-2.0 | Specific feedback based on actual ACL, indexing, Docker and version issues. |
| Demo video, 2 stars | 0.0 | No final video exists yet. |
| Technical implementation, 1 star | 0.8-1.0 | Nox is in the core arithmetic/transfer path, with SDK encryption/decryption and ACL. |
| UX, 1 star | 0.7-0.9 | Responsive operational UI passes automated checks; wallet workflow still needs production manual smoke test. |

Strict current estimate: **9.0-10.8 / 14**. After public deployment, manual wallet validation and a strong sub-four-minute video, a realistic target is **12.0-13.4 / 14**. The largest remaining scoring risk is accessibility, not the Nox contract integration.

## Repeatable Commands

```bash
cd source-code/backend
npm run compile
npm test
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:sepolia
PRIVATE_KEY="YOUR_TEST_WALLET_PRIVATE_KEY" npm run test:mcp

cd ../frontend
npm run build
npm run lint
npm run test:ui
```

## Security Notes

- Runtime files contain no embedded private key or fallback signing key.
- `.env` files are ignored by git.
- This remains hackathon/testnet software and has not received an external smart-contract security audit.
- Test faucet assets have no monetary value.
- Frontend `npm audit` reports 0 vulnerabilities after the Vite 8 upgrade.
- Backend audit retains four high advisories in the dev-only Hardhat/Nox plugin chain (`adm-zip`) with no compatible upstream fix, plus two moderate advisories through the MCP SDK HTTP adapter. NoxSwap uses MCP over stdio and does not expose the affected static HTTP server.
