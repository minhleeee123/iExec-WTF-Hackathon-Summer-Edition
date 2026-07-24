# iExec Nox Protocol and Developer Tooling Feedback

> **Project:** NoxSwap — protected AMM swaps, confidential limit orders, and
> Safe-owned ERC-7984 treasury operations
>
> **Network:** Ethereum Sepolia (`11155111`)
>
> **Hackathon:** iExec WTF Hackathon Summer Edition 2026
>
> **Validation date:** 2026-07-24

## 1. Executive summary

NoxSwap uses iExec Nox in the settlement path rather than as a presentation
layer. Swap inputs, minimum outputs, pool reserves, order terms, account
balances, refunds, and settlement outputs are represented by Nox handles. The
contracts use official Nox encrypted types and arithmetic, while the web client
uses the Handle SDK for input encryption, authorized decryption, ACL reads, and
public-decryption proofs.

The strongest parts of the developer experience were:

- A compact Handle SDK surface spanning encryption, private reveal, ACL
  inspection, and public decryption.
- Typed Solidity primitives that made confidential arithmetic readable.
- Official ERC-7984 wrappers with decimals-preserving 1:1 wrap/unwrap flows.
- A clean separation between private reveal and publicly verifiable decryption.
- Composability primitives that allowed a restricted Safe module to operate
  Safe-owned confidential balances without giving the browser custody.

The largest sources of engineering friction were:

1. Docker-dependent local runtime testing.
2. An unclear Node/Hardhat/Nox version compatibility matrix.
3. Insufficiently explicit handle ACL ownership and lifecycle documentation.
4. Indexer delay after mined ACL or balance-changing transactions.
5. The lack of a documented smart-account input-proof pattern.
6. No protocol-level helper for translating a public reference quote into a
   safe encrypted `minOut`.

The recommendations below are based on implementation and live Sepolia
validation, not a documentation-only review.

## 2. Tested environment

### Nox packages

| Package | Installed version |
|---|---:|
| `@iexec-nox/nox-protocol-contracts` | `0.2.4` |
| `@iexec-nox/nox-confidential-contracts` | `0.2.2` |
| `@iexec-nox/handle` | `0.1.0-beta.13` |
| `@iexec-nox/nox-hardhat-plugin` | `0.1.0` |

### Relevant application stack

| Component | Version/context |
|---|---|
| Solidity | `0.8.35` |
| Hardhat | `3.11.0` |
| ethers | `6.17.0` |
| Safe | v1.4.1 Sepolia smart account |
| Client | React 19 and Vite 8 |
| Runtime used for contract commands | Node.js 24 |

### Validation performed

- 22 contract/protocol tests passed; one Docker-backed Nox runtime suite remains
  environment-gated.
- 13 stateless keeper tests passed.
- 3 MCP protocol tests passed.
- 46 frontend and server-endpoint unit tests passed.
- Headless-browser checks covered 1440×1000, 1280×900, and 390×844 layouts.
- Live Sepolia tests covered normal swap settlement, encrypted `minOut`
  rejection with exact refund, three pools, order execute/cancel/expiry,
  selective ACL access, receipt ownership, personal unwrap, Safe module
  revoke/re-enable, Safe order create/cancel, and Safe unwrap finalization.

Repeatable commands and transaction evidence are recorded in
[`docs/verification.md`](docs/verification.md) and
[`packages/contracts/deployment-sepolia.json`](packages/contracts/deployment-sepolia.json).

## 3. Integration architecture tested

### Personal wallet flow

1. The user wraps a public faucet-backed n-asset into the corresponding official
   ERC-7984 wrapper.
2. `encryptInput(value, "uint256", target)` returns an external handle and input
   proof through the Nox Handle/Gateway flow.
3. The target contract imports the input with `Nox.fromExternal`.
4. The router uses `Nox.mul`, `Nox.div`, `Nox.add`, `Nox.sub`, `Nox.ge`, and
   `Nox.select` over encrypted values.
5. ERC-7984 transfers settle either the encrypted output or the encrypted full
   refund.
6. The authorized user can decrypt the resulting balance/output handle.

### Safe smart-account flow

The deployed 1-of-1 Safe owns the ERC-7984 balance. Because the input proof is
created by an EOA owner rather than by the Safe contract itself, an allowlisted
module imports the owner's external input, persists ACL permission for the
intended consumer, and gives the Safe access to the handle. Settlement still
requires a Safe-authorized call. Preparing a handle alone cannot spend Safe
funds.

The module restricts consumers and tokens, supports only reviewed operations,
and can be revoked by the Safe owner without changing owners, threshold, or
balances. The implementation is in
[`packages/contracts/contracts/NoxSafeModule.sol`](packages/contracts/contracts/NoxSafeModule.sol).

## 4. What worked well

### 4.1 One client API covers the full handle lifecycle

`createEthersHandleClient`, `encryptInput`, `decrypt`, `publicDecrypt`, and
`viewACL` were sufficient for all browser and MCP handle operations.

This API shape allowed NoxSwap to use one consistent mental model:

- `encryptInput` for user-supplied confidential terms.
- `decrypt` for authorized, session-only plaintext display.
- `viewACL` for inspecting indexed handle permissions.
- `publicDecrypt` for generating a value and verification proof when disclosure
  is required by an on-chain exit.

The distinction between private and public decryption is particularly valuable.
It enabled a recoverable two-step unwrap rather than requiring a trusted backend
to release underlying assets.

### 4.2 Solidity encrypted types are readable

The `euint256` and `ebool` types kept confidential logic close to ordinary
Solidity. The protected swap path can express:

```solidity
euint256 quotedAmountOut = Nox.div(
    Nox.mul(feeAdjusted, reserveOut),
    Nox.add(reserveIn, feeAdjusted)
);
ebool meetsMinimum = Nox.ge(quotedAmountOut, minimumAmountOut);
euint256 selectedOutput = Nox.select(meetsMinimum, quotedAmountOut, zero);
euint256 selectedRefund = Nox.select(meetsMinimum, zero, receivedAmountIn);
```

This is easier to audit than an untyped handle-only interface. It also made it
possible to test exact settlement invariants without adding a plaintext shadow
ledger to the production contracts.

### 4.3 Official ERC-7984 wrappers compose cleanly

`ERC20ToERC7984Wrapper` preserved the underlying token decimals and provided the
required confidential balance, transfer, operator, wrap, and unwrap behavior.
The same wrapper model worked for 6-decimal USDC, 18-decimal WETH, 8-decimal
WBTC, and 9-decimal SOL test assets.

Token-scoped `setOperator` authorization was useful for limit-order escrow:

- The owner explicitly authorizes the OrderBook for a selected input token.
- The OrderBook escrows the confidential input.
- Execution and expiry can remain permissionless.
- Cancellation and reveal remain owner-only.

### 4.4 ACL primitives enabled practical selective disclosure

Per-handle viewer access is a useful privacy boundary. NoxSwap can grant an
auditor access to a current balance without granting token operator rights,
wallet signing authority, or access to every future balance handle.

That narrow scope is a product advantage: permission can follow the data object
rather than becoming a broad account role.

### 4.5 Nox remained composable with Safe

Nox primitives were flexible enough to build a restricted module rather than
requiring custody in an EOA or application contract. The Safe remained the
balance owner and transaction authority, while prepared handles allowed the
router and order book to consume only reviewed confidential inputs.

This was the most useful evidence that confidential state can be integrated on
top of an existing open-source protocol without modifying Safe itself.

## 5. Friction, evidence, and recommendations

### 5.1 Docker is a hard prerequisite for local Nox runtime tests

**Impact:** High for CI onboarding; low for the live deployed application.

**Observed behavior**

The Hardhat plugin's off-chain Nox services require Docker. In environments
without a Docker daemon, the official local runtime suite cannot initialize,
even though Solidity compilation, deterministic contract tests, and live
Sepolia calls remain possible.

**Project workaround**

- Keep the Docker-backed suite in a separate nightly/manual workflow.
- Run ABI/source invariants and deterministic settlement tests in required CI.
- Use funded-wallet Sepolia E2E tests for final protocol acceptance.
- Mark the local runtime suite as explicitly skipped rather than reporting a
  false pass.

**Recommendation**

Provide:

1. A preflight command such as `nox doctor` that checks Docker, ports, images,
   Node version, RPC configuration, and expected services.
2. A documented Docker-less remote development mode for testnet.
3. A lightweight deterministic adapter for contract/client CI that is clearly
   labelled as non-confidential and non-attested.
4. Structured startup errors containing the missing service and remediation
   command.

### 5.2 The supported version matrix is not explicit enough

**Impact:** High during initial setup.

**Observed behavior**

The machine's default Node.js 20 runtime produced compatibility failures or
warnings across the Hardhat 3/EDR and current frontend toolchain. Executing
contract tasks with Node.js 24 made compilation and tests repeatable.

**Project workaround**

Workspace scripts invoke:

```bash
npx --yes node@24 node_modules/hardhat/dist/src/cli.js
```

Package and lockfile versions are committed so CI and local runs resolve the
same Nox dependencies.

**Recommendation**

Publish and test a version table covering:

- Node.js
- Hardhat
- Solidity
- ethers
- `@iexec-nox/handle`
- `@iexec-nox/nox-protocol-contracts`
- `@iexec-nox/nox-confidential-contracts`
- `@iexec-nox/nox-hardhat-plugin`

The starter repository should enforce the supported Node range through
`engines`, a preinstall check, or both.

### 5.3 Handle ownership and ACL transitions need a canonical reference

**Impact:** High for contract correctness.

**Observed behavior**

During early Router V2 work, using a handle returned from an ERC-7984 transfer
in subsequent router arithmetic reverted with:

```text
INoxCompute.NotAllowed(handle, router)
```

The important missing information was not the transfer API signature; it was
the post-call ACL state of:

- The input handle.
- The returned transfer handle.
- Sender and receiver balance handles.
- The calling contract.
- The final user.

**Project workaround**

The router explicitly uses `Nox.allowTransient` before wrapper consumption,
performs reserve arithmetic with handles authorized in its own context, and
persists the required pool permissions. Tests assert that no plaintext reserve
ledger exists.

**Recommendation**

Add an ACL transition table to every handle-producing API:

| Operation | Input consumed by | New handle admin | Default viewers | Required follow-up |
|---|---|---|---|---|
| `Nox.fromExternal` | Target contract | Document explicitly | Document explicitly | `allow`/`allowTransient` examples |
| `confidentialTransfer` | Token wrapper | Document explicitly | Sender/receiver rules | Arithmetic reuse example |
| `confidentialTransferFrom` | Token wrapper/operator | Document explicitly | Payer/recipient rules | Operator example |
| Balance update | Token wrapper | Document explicitly | Account/token rules | Indexing/decrypt example |

Include at least one multi-contract example where a router consumes an external
input, transfers through an ERC-7984 wrapper, performs additional arithmetic,
and authorizes the final recipient.

### 5.4 Indexed ACL state is eventually consistent

**Impact:** Medium; primarily user experience and test reliability.

**Observed behavior**

Immediately after an ACL grant or balance-changing transaction was mined,
`viewACL` or `decrypt` could still observe the previous indexed state. Retrying
the same request after indexing caught up succeeded.

**Project workaround**

NoxSwap uses bounded retries in
[`apps/web/src/lib/nox.js`](apps/web/src/lib/nox.js) and shows an explicit
waiting/recovery state instead of treating a mined transaction as failed.
Balance-changing operations reload the new handle before requesting decryption.

**Recommendation**

Add an SDK primitive similar to:

```ts
await client.waitForHandleIndexing(handle, {
  minBlock,
  timeoutMs,
  signal,
});
```

It should return structured progress or timeout information and distinguish:

- Handle not indexed yet.
- Signer not authorized.
- Gateway unavailable.
- Invalid/unknown handle.

SDK responses would be even easier to integrate if they exposed the indexed
block number used for the result.

### 5.5 Smart-account input proofs need an official pattern

**Impact:** High for Safe and account-abstraction integrations.

**Observed behavior**

The browser owner can create a Handle SDK input proof, but a Safe contract
cannot produce the same EOA-style authorization signature. Binding the input
directly to the Safe as though it were an EOA was therefore not a viable browser
flow.

**Project workaround**

The owner encrypts against the restricted Nox module. The module imports the
external input and persistently allows only an approved consumer. A separate
Safe-authorized call is still required to spend the Safe balance.

This preserves two independent controls:

1. Preparing confidential input data.
2. Authorizing asset movement through the Safe threshold.

**Recommendation**

Document one supported smart-account architecture and its threat model. Useful
options include:

- ERC-1271-aware Handle authorization.
- An SDK-supported owner-to-smart-account delegation proof.
- A canonical restricted-module pattern with explicit ACL lifetime guidance.

The documentation should state which address becomes the handle owner/viewer,
whether prepared inputs expire, how unused inputs can be invalidated, and why
input preparation alone cannot move smart-account assets.

### 5.6 Public decryption is powerful but needs a complete recovery example

**Impact:** Medium.

**Observed behavior**

`publicDecrypt` made a verifiable 1:1 unwrap possible, but the production flow
must handle a transaction being mined before the public-decryption service can
return a proof.

**Project workaround**

Unwrap is split into:

1. A confirmed `UnwrapRequested` operation.
2. Public decryption of the request handle.
3. Permissionless `finalizeUnwrap` with value and proof.

The UI persists the public request identifier in Activity so finalization can be
retried without creating or signing a second request.

**Recommendation**

Provide an official sample that covers:

- Request creation.
- Proof pending/indexing delay.
- Safe retry after page reload.
- Proof verification and replay protection.
- Exact underlying-token delta assertion.
- Failure states for an incorrect value, proof, token, or recipient.

### 5.7 Encrypted `minOut` needs quote guidance

**Impact:** Medium for UX; high for first-demo success.

**Observed behavior**

An encrypted minimum output above the router's encrypted quote correctly selects
a full encrypted refund. However, a public oracle reference and an AMM pool
quote are not identical. A naive client default can cause every first swap to be
rejected even though both the contract and encryption are working correctly.

**Project workaround**

NoxSwap derives a suggested `minOut` from the selected pair, Chainlink ETH/USD
reference, router fee, token decimals, and a configurable tolerance. The current
test-pool default is 10%. The contract remains authoritative and atomically
selects settlement or full refund over encrypted values.

After settlement, the client reloads both changed balance handles and requests
fresh authorized decryption rather than displaying stale plaintext.

**Recommendation**

Offer a reference utility or documented formula for:

- Decimal normalization.
- Pair direction.
- Fee adjustment.
- Oracle freshness.
- Public-reference versus private-pool basis risk.
- Tolerance bounds.
- Zero-minOut acknowledgement.

The helper should be described as client protection guidance, not as the source
of the confidential settlement quote.

## 6. Documentation and API improvements

### 6.1 Describe the Gateway boundary precisely

Client examples should explicitly state that `encryptInput` participates in the
Nox Gateway flow over TLS. Calling it “purely local encryption” gives developers
and users the wrong trust model.

An architecture diagram should identify:

- Browser/SDK.
- Gateway.
- NoxCompute.
- On-chain application contract.
- Indexer/subgraph.
- Authorization signer.

### 6.2 Expose structured error categories

Custom errors are actionable only when developers know whether to retry, request
another signature, refresh a handle, or change the contract ACL.

The SDK should normalize common failures into stable categories such as:

- `HANDLE_NOT_INDEXED`
- `SIGNER_NOT_AUTHORIZED`
- `TARGET_NOT_ALLOWED`
- `INPUT_PROOF_INVALID`
- `GATEWAY_UNAVAILABLE`
- `PUBLIC_DECRYPTION_PENDING`

The original error and selector can remain attached for diagnostics.

### 6.3 Publish end-to-end composability examples

A reference repository should include:

1. Faucet-backed underlying token.
2. Official ERC-7984 wrapper.
3. Wrap and balance reveal.
4. Multi-contract operator authorization.
5. Protected swap with encrypted `minOut` and refund.
6. Confidential order escrow and permissionless settlement.
7. Public-decryption unwrap with recovery.
8. A restricted Safe or ERC-1271 smart-account integration.

Each step should document its ACL transition and expected indexed state.

### 6.4 Provide attestation-verification UX primitives

The client can verify Gateway-signed responses, but the installed SDK does not
expose an authoritative high-level API for displaying raw SGX/TDX attestation
evidence. A supported helper could return:

- Attestation type and verification status.
- Enclave identity or measurement.
- Verification timestamp and freshness.
- Verifier/source information.
- A safe user-facing summary.

Without such an API, applications should avoid inventing “TEE verified”
telemetry.

## 7. Prioritized recommendations

| Priority | Recommendation | Expected benefit |
|---:|---|---|
| P0 | Publish the supported Node/Hardhat/Nox version matrix | Prevent setup failures before developers reach Nox APIs |
| P0 | Document handle ACL transitions for every handle-producing operation | Prevent authorization reverts and unsafe assumptions |
| P0 | Document an ERC-1271 or restricted-module smart-account pattern | Unlock Safe/account-abstraction composability |
| P1 | Add `waitForHandleIndexing` with typed status/errors | Remove duplicated retry logic and misleading UI failures |
| P1 | Add a complete recoverable public-decryption unwrap example | Make exits robust across indexing/service delay |
| P1 | Add Docker preflight and a documented remote testnet mode | Improve CI and onboarding |
| P2 | Publish encrypted `minOut` client guidance | Reduce avoidable protected-swap refunds |
| P2 | Expose supported attestation-verification metadata | Enable accurate trust UX without fabricated telemetry |

## 8. Final assessment

The Nox protocol packages were capable of supporting a real confidential DeFi
system on Sepolia:

- Encrypted constant-product arithmetic.
- ERC-7984 account and pool balances.
- Encrypted slippage protection and exact confidential refund.
- Confidential order escrow with public Chainlink triggers.
- Selective per-handle disclosure.
- Verifiable public-decryption exits.
- Safe-owned confidential assets through a restricted module.

The core primitives are strong. The main opportunity is to make their lifecycle
and trust boundaries easier to use correctly: supported versions, explicit ACL
transition tables, typed indexing errors, recoverable examples, and a canonical
smart-account integration pattern would remove most of the custom engineering
NoxSwap required.
