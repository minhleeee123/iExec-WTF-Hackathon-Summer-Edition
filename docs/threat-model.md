# NoxSwap Threat Model

> Scope: the Ethereum Sepolia deployment recorded in
> `source-code/backend/deployment-sepolia.json` and the clients in this repository.
> This is a testnet prototype, not an audited production system.

## 1. Security objectives

NoxSwap uses iExec Nox handles to keep user balances, swap amounts, minimum
outputs, order amounts, order minimum outputs, pool reserves, settlement outputs,
and refunds out of plaintext contract storage and transaction calldata.

The system aims to:

- prevent an ordinary chain observer from learning confidential numeric values;
- allow only the intended holder or an explicitly granted viewer to decrypt a
  user balance;
- preserve exact-input refunds when encrypted slippage checks reject a swap;
- prevent an order from being executed, cancelled, or expired more than once;
- keep keepers and non-owner executors unable to decrypt another owner's terms or
  settlement values;
- keep MCP and CI signing keys outside source code, logs, and evidence artifacts.

## 2. Assets and visibility

| Data or capability | Current visibility | Authorized decryptors or controllers |
|---|---|---|
| ERC-7984 user balance | Encrypted handle is public; value is confidential | Balance holder and viewers explicitly granted by that holder |
| Swap amount and minOut | Encrypted handles are public; values are confidential | Trader, contracts that receive transient ACL while settling, and parties granted by Nox token semantics |
| Swap output and refund | Encrypted handles are public; values are confidential | Trader/recipient |
| Limit-order amount and minOut | Encrypted handles are public; values are confidential | Order owner and the OrderBook/router during settlement |
| Trigger price and expiry | Public plaintext | Everyone |
| Token pair, trader/owner, timing, status, receipt ID and transaction hash | Public plaintext | Everyone |
| Pool reserve values | Encrypted handles are public; values are confidential | Router contract and, in the current Router V2 deployment, router owner |
| Underlying wrapper collateral | ERC-20 balances are public | Everyone can inspect; only wrapper rules can release collateral |
| Keeper decisions and health | Public operational metadata | Everyone with log/health access |

The current implementation does **not** hide order strategy completely: token
pair, direction, trigger, expiry, owner, timing, and lifecycle are public. Repeated
interaction and public pool activity can still enable statistical inference about
otherwise encrypted values.

## 3. Trust boundaries

### Wallet and browser

MetaMask controls transaction authorization. The frontend holds revealed
plaintext only in React session state and clears order terms when the account or
network changes. A compromised browser, wallet extension, or injected script can
observe values after the user authorizes decryption.

### Nox off-chain services

The Handle Gateway, KMS, runner, ingestor, subgraph, and underlying confidential
compute environment are part of the confidentiality trust boundary. The contracts
enforce handle ACLs, but availability and correct confidential evaluation depend
on those services.

### Smart contracts

The Sepolia contracts are the canonical settlement state. `NoxSwap` is the only
component authorized to update encrypted pool reserves; `NoxLimitOrderBook`
escrows order inputs and uses public Chainlink data to determine execution
readiness. The contracts have not received an independent audit.

### RPC, Chainlink, keeper, and MCP

- RPC providers can observe requests, delay responses, omit events, or serve stale
  data, but cannot sign wallet transactions.
- Chainlink ETH/USD is a public execution dependency for limit orders. Invalid or
  stale answers prevent execution.
- Keepers are untrusted permissionless callers. They can execute ready orders or
  expire overdue orders, but cannot cancel or decrypt them.
- The MCP process is a hot-wallet client. Anyone who obtains its environment key
  can spend that test wallet's assets and request decryption as that wallet.

## 4. Threats and mitigations

| Threat | Current mitigation | Residual risk |
|---|---|---|
| Public calldata reveals amount/minOut | Values enter as Nox handles plus proofs | Metadata and timing remain public |
| Unauthorized balance decryption | Nox ACL and wallet EIP-712 authorization | Compromised wallet/browser can authorize disclosure |
| Slippage or bad execution | Encrypted positive minOut and full encrypted refund | Chainlink-derived UI estimate is not an AMM quote and pool price can diverge |
| Replay/double settlement | Canonical order status changes before external settlement; reentrancy guard | Contract correctness is unaudited |
| Malicious keeper | Keeper has only permissionless execute/expire methods | Keeper can choose ordering/timing and spend its own gas |
| Competing keepers | Status is reread and transactions are simulated before sending | Simultaneous submissions can still waste gas |
| Stale/manipulated oracle data | Positive, non-future answer and one-hour maximum age | Chainlink/feed compromise affects public trigger decisions |
| Wrapper insolvency | Underlying collateral remains in the wrapper and unwrap requires a Nox proof | Contract or Nox proof-system failure could violate assumptions |
| Secret leakage in CI/MCP | Environment-only keys, Gitleaks, sanitized evidence schema | Runner compromise or unsafe external logging remains possible |
| Router owner decrypts reserves | This capability is documented; reserve ACL is not exposed in normal UI | Current owner is a privileged reserve viewer until a new router is deployed |

## 5. Compromise impact

- **User wallet compromise:** attacker can transact, authorize operators, decrypt
  that wallet's authorized handles, and transfer its public/confidential assets.
- **Router owner compromise:** attacker can decrypt current encrypted reserve
  handles because Router V2 explicitly grants the owner ACL. Ownership does not
  provide an administrative withdrawal method, but confidentiality is reduced.
- **Keeper compromise:** attacker can spend keeper ETH and call public
  execute/expire methods. It cannot cancel orders or decrypt private values by
  design.
- **MCP signer compromise:** equivalent to compromise of that configured wallet;
  it does not grant access to other users' handles.
- **Gateway/KMS/confidential runtime compromise:** confidentiality and/or
  correctness of encrypted computation may fail for values processed by the
  compromised infrastructure. Contract status and public collateral remain
  independently inspectable, but encrypted results should not be trusted.
- **RPC compromise:** can mislead clients or delay submission. Transaction signing
  remains local, and users should verify chain ID and receipts through an
  independent explorer/provider.
- **Chainlink feed compromise:** can cause limit orders to become executable at an
  incorrect public price; encrypted minOut may still reject and refund settlement.

## 6. Operational requirements

- Use only funded Sepolia test wallets and rotate any key exposed outside a secret
  manager.
- Never emit private keys, authorization signatures, plaintext private balances,
  decrypted order terms, or decrypted settlement values in CI artifacts.
- Keep write-enabled Sepolia and MCP tests manual or scheduled, with bounded token
  amounts.
- Treat Nox runtime integration failures as protocol/infrastructure failures, not
  as permission to substitute mock confidential behavior.
- Verify deployed bytecode hashes, chain ID, transaction receipts, events, and
  lifecycle assertions in each live evidence artifact.

## 7. Out of scope

- Mainnet value, production key custody, economic security, and regulatory review.
- Protection from endpoint malware after plaintext has been deliberately revealed.
- Hiding public order trigger, owner, token pair, expiry, timing, or lifecycle.
- MEV elimination or anonymity guarantees.
- Security guarantees from a formal audit; none has been completed.
