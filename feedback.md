# iExec Nox Developer Tools Feedback

> Project: NoxSwap, a confidential constant-product router on Ethereum Sepolia
> Packages tested: `@iexec-nox/nox-protocol-contracts@0.2.4`, `@iexec-nox/nox-confidential-contracts@0.2.2`, `@iexec-nox/handle@0.1.0-beta.13`, `@iexec-nox/nox-hardhat-plugin@0.1.0`

## Context

NoxSwap uses official ERC-7984 wrappers for cUSDC and cETH, Nox encrypted arithmetic for AMM reserve updates, and the Handle SDK for input encryption and authorized decryption. We deployed the contracts, initialized encrypted liquidity, and tested wrap, swap, decrypt, ACL sharing, public-decryption-based unwrap, and ERC-721 receipts on Ethereum Sepolia.

This feedback is based on the actual remediation and live E2E test, including failures encountered during implementation.

## What Worked Well

### Handle SDK API

`createEthersHandleClient`, `encryptInput`, `decrypt`, `publicDecrypt`, and `viewACL` cover the essential client flow with a compact API. `encryptInput(value, "uint256", applicationContract)` returned a handle and proof that the Solidity `Nox.fromExternal` path accepted on Sepolia without custom cryptography code in the app.

The distinction between private `decrypt` and proof-producing `publicDecrypt` is useful. It allowed NoxSwap to support both private balance display and a verifiable two-step unwrap flow.

### Official ERC-7984 Wrapper

`ERC20ToERC7984Wrapper` provided working 1:1 wrap/unwrap behavior and reused the underlying ERC-20 decimals. Operator authorization, encrypted transfers, balance handles, and supply handling were available without implementing a confidential token ledger from scratch.

### Solidity SDK Primitives

The typed `euint256` API made the encrypted AMM formula readable. The router could express fee adjustment and constant-product output with `Nox.mul`, `Nox.div`, `Nox.add`, and `Nox.sub`, while keeping stored reserves encrypted.

## Friction Encountered

### Local Nox Tests Require a Docker Stack

The Hardhat plugin's off-chain services require Docker. Docker was not installed in our build environment, so the local Nox integration path could not run. We used compilation, source/ABI tests, and live Sepolia E2E tests instead.

Suggested improvement: provide a documented remote-test mode or a lightweight deterministic runner for CI environments where Docker is unavailable. The plugin should detect the missing prerequisite early and print the exact command and expected services.

### Runtime Version Compatibility Is Easy to Miss

Hardhat 3's EDR dependency required a newer Node runtime than the machine's Node 20.12 installation. Compilation succeeded after explicitly running Hardhat with Node 24 through `npx`.

Suggested improvement: publish one tested version matrix covering Node, Hardhat, the Nox Hardhat plugin, Solidity, confidential contracts, protocol contracts, and Handle SDK. A starter repository should pin those versions rather than relying on broad semver ranges.

### Returned Transfer Handle ACL Semantics Need More Documentation

Our first live swap reverted with `INoxCompute.NotAllowed(handle, router)`. In the output-token call, `confidentialTransfer(to, amount)` returned a fresh `transferred` handle. That returned handle was not authorized for the calling router, so reusing it for reserve arithmetic failed. The router instead had to retain and use its own quoted amount handle, which it administered, while the wrapper performed the actual transfer.

Suggested improvement: document, for every ERC-7984 overload, who is admin/viewer of the input handle, returned transfer handle, new sender balance, and new receiver balance. A router-to-token example should demonstrate the correct transient permissions and which handle can safely be reused after the call.

### Subgraph Indexing Is Eventually Consistent

Immediately calling `viewACL` after an ACL transaction can return the pre-transaction state. Decryption and ACL checks therefore need bounded retries. The SDK exposes the underlying operation but no helper for waiting until a transaction's block is indexed.

Suggested improvement: add `waitForHandle(handle, { minBlock, timeout })` or let `viewACL` accept a minimum block number. Typed errors for "not indexed yet" versus "not authorized" would make UI feedback and tests more reliable.

### Deployment Examples Should Cover a Complete Wrapper Flow

A useful production-oriented example needs more than contract deployment: mint or acquire the underlying asset, approve the wrapper, wrap, authorize the router as operator, encrypt liquidity for the router, and submit both handles and proofs. Missing any of these steps can still produce contracts that look deployed but do not have a usable pool.

Suggested improvement: include an official Sepolia example that performs and verifies this entire sequence, then decrypts a test output.

## Documentation Clarifications

- State explicitly that `encryptInput` sends plaintext to the trusted Nox Gateway over TLS for encryption. "Client initiated" should not be described as purely local encryption.
- Explain whether and how applications can obtain hardware-attestation evidence. Without an attestation API, frontends should not display invented enclave progress or "Intel TDX verified" badges.
- Document supported encrypted Solidity types next to each example. The SDK currently implements only a subset of its broader type union.
- Include custom-error selectors and common ACL failure examples in a troubleshooting page.

## Summary

The core Nox abstractions are capable of supporting a real encrypted state transition on Sepolia, and the Handle SDK plus ERC-7984 wrapper significantly reduce implementation effort. The largest opportunities are reproducible local/CI testing, an explicit compatibility matrix, clearer handle-ACL ownership rules, and SDK support for subgraph indexing waits.
