# NoxSwap User Guide

NoxSwap is a testnet confidential DeFi application. It uses Ethereum Sepolia,
iExec Nox encrypted handles, and faucet-backed assets with no monetary value.

Live application: [https://noxswap-iexec.vercel.app](https://noxswap-iexec.vercel.app)

## 1. Before you start

Public pool data, order lifecycle events, Chainlink readiness, and transaction
evidence are available without connecting a wallet.

Write operations require:

1. MetaMask, Coinbase Wallet, or Rabby.
2. Ethereum Sepolia selected in the wallet (`chainId` `11155111`).
3. A small amount of Sepolia ETH for gas.
4. Explicit confirmation for every signature and transaction.

Never use a valuable mainnet wallet or paste a private key into the browser.
Revealed confidential values remain in the current browser session and are
cleared when the account or network changes.

## 2. Personal confidential swap

1. Open **Wallet** and connect the intended wallet provider.
2. Claim one of the faucet-backed assets: nUSDC, nWETH, nWBTC, or nSOL.
   Each faucet has a one-hour per-wallet cooldown.
3. Wrap the public test asset 1:1 into its confidential ERC-7984 form.
4. Use **Reveal** when you want to decrypt an authorized balance. The wallet
   signs an EIP-712 authorization; revealing does not submit a transaction.
5. Open **Trade → Swap** and choose one of the three deployed pools:
   cUSDC/cETH, cWBTC/cUSDC, or cSOL/cUSDC.
6. Enter the exact input and review the positive encrypted `minOut`, deadline,
   and Chainlink-reference warning.
7. Confirm input encryption and the Sepolia transaction in the selected wallet.
8. After confirmation, inspect the result, refreshed balance, settlement
   receipt, and transaction evidence in **Activity**.

The router calculates the output from encrypted reserves. If the encrypted quote
does not satisfy `minOut`, it selects zero output and a full encrypted input
refund. Chainlink is a public reference and limit-order trigger, not the AMM
settlement price.

## 3. Confidential limit orders

Open **Trade → Orders** to browse the public lifecycle without a wallet.

To create an order:

1. Connect the owner wallet and ensure it holds wrapped cUSDC or cETH.
2. Select the direction, public trigger price, expiry, confidential amount, and
   encrypted minimum output.
3. Authorize the OrderBook operator when the selected input token requires it.
4. Confirm the encrypted order transaction.

Execution and expiry are permissionless. The owner alone can cancel an open
personal order or reveal its confidential terms. Trigger, expiry, token pair,
owner, status, timing, and transaction hashes remain public.

## 4. Selective viewer access

Under **Wallet → Grant a viewer**, the balance holder can grant another address
access to the current encrypted balance handle. This does not grant spending,
operator, or signing authority.

The recipient opens **Shared with me**, enters the source holder address or uses
the share link, and connects the granted viewer wallet. NoxSwap rereads the
current handle and ACL before requesting decryption.

Viewer grants are handle-specific. A later balance update can rotate the handle,
so a new grant may be required. The installed Nox interface does not provide a
historical `removeViewer` operation.

## 5. Safe Treasury

Open **Safe Treasury** with a connected Sepolia wallet.

- If the owner already has a registered treasury, NoxSwap resolves it on-chain.
- Otherwise, the owner can create one official Safe v1.4.1 proxy and one
  constructor-bound restricted Nox module in a single transaction.
- Each owner receives a different Safe and module; there is no shared global
  custody account.

The current browser flow supports factory-created 1-of-1 Safes. Higher-threshold
signature collection remains available through Safe Wallet rather than the
NoxSwap browser.

### Fund and reveal

1. Use the personal wallet faucet and wrap flow.
2. Fund the Safe with the selected confidential asset.
3. Grant the Safe owner viewer access when required.
4. Reveal only balances for which the connected account has current-handle ACL
   access.

### Swap, orders, and unwrap

- **Swap & unwrap** prepares owner-bound ciphertext inputs and completes the
  protected swap inside one Safe-approved transaction through Module V6.
- **Orders & Agent** creates Safe-owned confidential orders. Anyone can execute
  or expire an eligible order; cancellation remains owner/module controlled.
- **Access & security** manages viewers, router/OrderBook operators, and module
  revoke/re-enable controls.
- Safe unwrap uses a recoverable request followed by Nox public-decryption proof
  finalization. A confirmed request can be retried without creating a second
  unwrap.

Input preparation or viewer access alone cannot spend Safe funds. The Safe
transaction remains the spending authority.

## 6. Strategy Agent

The Strategy Agent converts user-entered intent plus public Chainlink context
into a reviewable draft. It cannot sign, decrypt, submit transactions, or decide
settlement.

Do not type a secret or confidential plaintext amount into the prompt. Prompt
text is intentionally sent to Groq. Percentage calculations use a balance only
after it has been revealed locally in the browser session.

## 7. Unwrap

Personal and Safe unwraps use two protocol stages:

1. Submit an encrypted unwrap request.
2. Obtain the Nox public-decryption proof and finalize release of the underlying
   faucet asset.

If the Gateway proof is temporarily pending after the request is confirmed, use
the recovery/finalize action instead of submitting the unwrap again.

## 8. Troubleshooting

| Symptom | What to check |
|---|---|
| Write control is disabled | Connect a supported wallet and switch to Ethereum Sepolia |
| Faucet is unavailable | Check the displayed one-hour cooldown |
| Balance cannot be revealed | Confirm the connected account owns or can view the current handle |
| Viewer previously worked but now fails | The balance handle may have rotated; request a new grant |
| Swap returns zero output | The encrypted AMM quote did not satisfy `minOut`; inspect the full encrypted refund and receipt |
| Order is not executable | Check public trigger direction, Chainlink freshness, expiry, status, and operator readiness |
| Confirmed operation still waits for a result | Allow for Nox indexing, then use the displayed recovery action |
| Safe write controls are unavailable | Confirm the connected account is the registered Safe owner and the bound module is enabled |

For the precise confidentiality and compromise boundaries, read the
[threat model](./threat-model.md). For transaction and test evidence, read the
[verification record](./verification.md).
