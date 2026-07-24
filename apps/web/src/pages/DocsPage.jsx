import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileKey2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Wallet,
  Workflow,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import deployment from '../deployment.json';

const explorerBase = 'https://sepolia.etherscan.io/address/';

const contractRows = [
  ['NoxSwap Router V2', deployment.contracts.noxSwapRouter],
  ['Confidential OrderBook', deployment.contracts.limitOrderBook],
  ['NoxCompute', deployment.contracts.noxCompute],
  ['Safe Treasury', deployment.safe.address],
  ['Nox Safe Module', deployment.safe.module],
  ['Safe Confidential OrderBook', deployment.safe.orderBook],
  ['cUSDC', deployment.contracts.cUSDC],
  ['cETH', deployment.contracts.cETH],
  ['cWBTC', deployment.contracts.cWBTC],
  ['cSOL', deployment.contracts.cSOL],
  ['Chainlink ETH/USD', deployment.feeds.ethUsd],
];

const tocItems = [
  ['quickstart', '01 / Quickstart'],
  ['wallet', '02 / Wallet & balances'],
  ['swaps', '03 / Protected swaps'],
  ['orders', '04 / Limit orders'],
  ['privacy', '05 / Privacy model'],
  ['safe', '06 / Safe treasury'],
  ['agent', '07 / Strategy Agent'],
  ['troubleshooting', '08 / Troubleshooting'],
  ['contracts', '09 / Contracts'],
];

function ContractAddress({ address }) {
  return (
    <a className="docs-contract-address" href={`${explorerBase}${address}`} target="_blank" rel="noreferrer">
      <code>{address}</code><ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quickstart');

  useEffect(() => {
    const updateActiveSection = () => {
      const marker = window.scrollY + 132;
      let nextSection = tocItems[0][0];
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && window.scrollY >= maxScroll - 4) {
        nextSection = tocItems[tocItems.length - 1][0];
      } else {
        for (const [id] of tocItems) {
          const section = document.getElementById(id);
          if (section && section.offsetTop <= marker) nextSection = id;
        }
      }
      setActiveSection((current) => current === nextSection ? current : nextSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  return (
    <main className="docs-page">
      <section className="docs-hero">
        <div className="docs-hero-copy">
          <p className="eyebrow"><BookOpen size={14} /> NOXSWAP / DOCUMENTATION</p>
          <h1>Private trading, explained clearly.</h1>
          <p>
            Learn how to fund a Sepolia wallet, reveal encrypted balances, complete a protected swap,
            manage confidential limit orders, and operate Safe-owned confidential assets without exposing private terms on-chain.
          </p>
          <div className="docs-hero-actions">
            <Link className="launch-button" to="/app/wallet">Open the app <ArrowRight size={18} /></Link>
            <Link className="outline-button" to="/app/safe">Open Safe Treasury <ShieldCheck size={18} /></Link>
            <a className="outline-button" href="#quickstart">Start with the guide</a>
          </div>
        </div>
        <aside className="docs-hero-meta" aria-label="Documentation status">
          <span>NETWORK</span><strong>Ethereum Sepolia</strong>
          <span>CHAIN ID</span><strong>11155111</strong>
          <span>ENVIRONMENT</span><strong>Public testnet</strong>
        </aside>
      </section>

      <div className="docs-layout">
        <aside className="docs-toc" aria-label="Documentation sections">
          <p className="eyebrow">ON THIS PAGE</p>
          {tocItems.map(([id, label]) => (
            <a className={activeSection === id ? 'active' : ''} href={`#${id}`} onClick={() => setActiveSection(id)} aria-current={activeSection === id ? 'location' : undefined} key={id}>{label}</a>
          ))}
        </aside>

        <div className="docs-content">
          <section className="docs-section" id="quickstart">
            <p className="eyebrow">01 / QUICKSTART</p>
            <h2>From a fresh wallet to your first private trade.</h2>
            <p className="docs-lead">NoxSwap is a Sepolia testnet application. Keep a small amount of Sepolia ETH for gas and never use a production wallet for testing.</p>
            <ol className="docs-step-list">
              <li><span>01</span><div><strong>Connect the wallet you intend to use.</strong><p>Open the wallet picker and select the provider explicitly. Confirm that the wallet is on Ethereum Sepolia before signing a transaction.</p></div></li>
              <li><span>02</span><div><strong>Claim public demo assets.</strong><p>Use the Wallet page faucets for nUSDC, nWETH, nWBTC, or nSOL. Each faucet has a one-hour per-wallet cooldown.</p></div></li>
              <li><span>03</span><div><strong>Wrap into confidential assets.</strong><p>Wrap a public n-asset 1:1 into its c-asset. Wrapping is an on-chain transaction and requires Sepolia ETH.</p></div></li>
              <li><span>04</span><div><strong>Reveal only when you need a private amount.</strong><p>The eye control requests an authorization signature for the current account, network, and encrypted balance handle. This signature is not a transaction.</p></div></li>
              <li><span>05</span><div><strong>Choose the correct custody workspace.</strong><p>Trade and Wallet operate assets owned by your connected EOA. Safe Treasury operates assets owned by the configured Safe while the connected Safe owner reviews and signs.</p></div></li>
              <li><span>06</span><div><strong>Review every write in your wallet.</strong><p>NoxSwap encrypts private terms locally, but MetaMask remains the final authority for swaps, orders, access grants, wrapping, and unwrapping.</p></div></li>
            </ol>
          </section>

          <section className="docs-section docs-section-soft" id="wallet">
            <p className="eyebrow">02 / WALLET &amp; BALANCES</p>
            <h2>Public assets and encrypted balances are different states.</h2>
            <div className="docs-card-grid">
              <article className="docs-card"><Wallet size={22} /><h3>Connect</h3><p>Connecting exposes the selected wallet address for public reads and transaction signing. It does not reveal balances.</p></article>
              <article className="docs-card"><FileKey2 size={22} /><h3>Reveal</h3><p>Reveal uses the Nox Gateway authorization flow to decrypt the current handle in the browser session. No gas is charged for the signature.</p></article>
              <article className="docs-card"><Workflow size={22} /><h3>Wrap / unwrap</h3><p>Wrap moves public n-assets into ERC-7984 confidential assets. Unwrap returns public n-assets after the confidential operation completes.</p></article>
            </div>
            <div className="docs-callout docs-callout-warning"><CircleAlert size={18} /><p><strong>Reveal is session state.</strong> After a balance-changing operation, account change, network change, or handle change, reveal the refreshed balance again. NoxSwap does not persist plaintext balances.</p></div>
          </section>

          <section className="docs-section" id="swaps">
            <p className="eyebrow">03 / PROTECTED SWAPS</p>
            <h2>Use the default protection first, then tune it with intent.</h2>
            <p className="docs-lead">The swap form derives a suggested encrypted minimum received from the Chainlink ETH/USD reference, the selected pair, router fee, and the chosen tolerance. The default tolerance is 10% to absorb the current Sepolia pool/reference basis and normal price impact.</p>
            <div className="docs-rule-list">
              <div><CheckCircle2 size={18} /><p><strong>Positive protection is the default.</strong> The suggested minimum is encrypted before settlement and prevents an output below the accepted threshold.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>It is not a confidential pool quote.</strong> Pool reserves and price impact remain encrypted, so the Chainlink-derived suggestion can still be stricter than the executable pool result.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>A failed minimum refunds the input.</strong> If encrypted minOut rejects settlement, the router performs the protected refund path. The receipt records the attempt and the returned refund handle.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Zero protection is explicit.</strong> Entering zero requires the separate confirmation control. Use it only when accepting any positive output is intentional.</p></div>
            </div>
            <div className="docs-callout docs-callout-info"><ShieldCheck size={18} /><p><strong>Recommended test flow:</strong> reveal the input balance, leave the suggested minOut and 10% tolerance unchanged, review the encrypted swap in MetaMask, then reveal the refreshed balance after settlement.</p></div>
          </section>

          <section className="docs-section docs-section-soft" id="orders">
            <p className="eyebrow">04 / CONFIDENTIAL LIMIT ORDERS</p>
            <h2>Private amount, public trigger, permissionless settlement.</h2>
            <div className="docs-order-grid">
              <div><span className="docs-index">CREATE</span><p>Reveal the input balance, choose Buy ETH or Sell ETH, set encrypted amount and minOut, choose an ETH/USD trigger and expiry, then authorize the OrderBook for the input token if needed.</p></div>
              <div><span className="docs-index">MANAGE</span><p>The owner can cancel an open order to refund escrow. Revoking OrderBook authorization blocks new escrow transfers for that input token; it does not cancel existing orders.</p></div>
              <div><span className="docs-index">SETTLE</span><p>Any Sepolia wallet can execute a trigger-ready order or process an expired-order refund when the readiness checks pass. The optional keeper never needs private terms.</p></div>
            </div>
            <div className="docs-callout docs-callout-warning"><KeyRound size={18} /><p><strong>Authorization is per input token.</strong> If you revoke it, authorize again before creating another order. Always review the token, amount, trigger, expiry, and transaction target in your wallet.</p></div>
          </section>

          <section className="docs-section" id="privacy">
            <p className="eyebrow">05 / PRIVACY MODEL</p>
            <h2>Public coordination, encrypted financial terms.</h2>
            <div className="docs-privacy-grid">
              <div><span className="docs-privacy-label docs-privacy-public">PUBLIC</span><ul><li>Wallet and order owner addresses</li><li>Trading pair, trigger price, expiry, and status</li><li>Transaction hashes and encrypted handle identifiers</li><li>Chainlink reference price and readiness actions</li></ul></div>
              <div><span className="docs-privacy-label docs-privacy-private">ENCRYPTED</span><ul><li>ERC-7984 account balances</li><li>Swap and order input amounts</li><li>Encrypted minimum output</li><li>Settlement output, refunds, and pool reserves</li></ul></div>
            </div>
            <p className="docs-footnote">Privacy here means sensitive values are represented by encrypted handles and processed through the Nox confidential execution flow. Wallet addresses, transaction metadata, and the public coordination state remain visible on Sepolia.</p>
          </section>

          <section className="docs-section docs-section-soft" id="safe">
            <p className="eyebrow">06 / SAFE TREASURY</p>
            <h2>Safe custody controls settlement; Nox protects the terms.</h2>
            <p className="docs-lead">The Sepolia demo composes a Safe v1.4.1 smart account with an allowlisted NoxSafeModule. The module cannot execute arbitrary calls or delegatecalls: it can only prepare Nox inputs, route supported swaps and orders, request approved unwraps, manage the router/orderbook operator, grant handle viewers, and revoke itself.</p>
            <div className="docs-order-grid">
              <div><span className="docs-index">OVERVIEW</span><p>Safe identity, owner threshold, connected signer, module status, encrypted balances, wrap-to-Safe funding, pending work, and quick links.</p></div>
              <div><span className="docs-index">OPERATE</span><p>Swap &amp; Unwrap contains protected treasury movement. Orders &amp; Agent contains confidential order creation, reviewable AI drafts, open orders, and owner cancellation.</p></div>
              <div><span className="docs-index">CONTROL</span><p>Activity reconstructs confirmed public lifecycle metadata. Access &amp; Security contains viewers, token operators, recovery, and emergency revoke.</p></div>
            </div>
            <div className="docs-rule-list">
              <div><CheckCircle2 size={18} /><p><strong>Fund the Safe.</strong> The compact Safe Treasury header can wrap public test assets directly to the Safe address. The resulting ERC-7984 balance is owned by the Safe, not by the connected EOA.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Protect each swap.</strong> The Safe form derives encrypted minOut from the Chainlink reference and a configurable 0.5%–10% tolerance, with 10% recommended for the current test pools. Its public deadline is configurable from 1 minute to 24 hours.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Prepare, then settle.</strong> A Safe owner validates encrypted amount and minOut proofs for the module. This preparation cannot move funds. Spending occurs only when the Safe executes the module transaction under its configured threshold.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Draft, never delegate authority.</strong> Strategy Agent receives only intent and public market context, then fills the Safe order form for owner review. It cannot reveal a Safe balance, sign, or submit a transaction.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Reveal selectively.</strong> The Safe grants the connected owner or an auditor viewer access to a specific Nox handle. Viewer access permits decryption only; it does not grant spend or Safe signing authority.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Exit through a recoverable unwrap.</strong> The Safe can burn a c-asset and release its public n-asset only to itself or an owner. The amount becomes public at finalization. If the Gateway proof is delayed, Safe Activity preserves the request ID for a permissionless retry.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Audit public lifecycle metadata.</strong> Safe Activity is reconstructed from confirmed Sepolia events. It shows operation type, token/pair, recipient where public, timestamp, and transaction link without decrypting confidential amounts or minOut.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Receipts remain deliverable.</strong> Confidential assets and refunds return to the Safe, while the non-fungible swap receipt is minted to an approved Safe owner because a standard Safe does not implement the ERC-721 receiver callback.</p></div>
              <div><CheckCircle2 size={18} /><p><strong>Emergency revoke is recoverable.</strong> Revoke removes the module from the Safe linked list without changing owners, threshold, or balances. Safe owners can later review and enable an approved module again.</p></div>
            </div>
            <div className="docs-callout docs-callout-info"><ShieldCheck size={18} /><p><strong>Signer is not custody.</strong> The connected MetaMask account authorizes the Safe transaction, but the Safe address remains the confidential asset and order owner. The module can act only through its immutable operation and token allowlists.</p></div>
            <div className="docs-callout docs-callout-warning"><ShieldCheck size={18} /><p>The built-in browser transaction flow is intentionally limited to the deployed 1-of-1 demo Safe. A higher-threshold Safe must collect its signatures through the Safe Wallet interface before execution. Faucet-to-Safe, owner-only order execution, and browser multisig collection are not part of this demo.</p></div>
          </section>

          <section className="docs-section" id="agent">
            <p className="eyebrow">07 / STRATEGY AGENT</p>
            <h2>A planning assistant, never an autonomous signer.</h2>
            <p className="docs-lead">The Strategy Agent converts an intent into a strict, reviewable limit-order draft for either the personal Trade flow or Safe Treasury Orders. It does not hold keys, submit transactions, reveal balances, or receive private handles.</p>
            <div className="docs-agent-flow"><span>Intent text</span><ArrowRight size={17} /><span>Public market context</span><ArrowRight size={17} /><span>Draft fields</span><ArrowRight size={17} /><span>Local review + MetaMask</span></div>
            <div className="docs-callout docs-callout-info"><LockKeyhole size={18} /><p>The planner receives only the intent and public ETH price, oracle timestamp, and block timestamp. Wallet address, balance, handle, proof, and signature are not part of the planner request.</p></div>
          </section>

          <section className="docs-section" id="troubleshooting">
            <p className="eyebrow">08 / TROUBLESHOOTING</p>
            <h2>Common issues and the safest next step.</h2>
            <div className="docs-faq-list">
              <details><summary>The wrong wallet provider appears.</summary><p>Disconnect or close competing injected wallets, reopen the wallet picker, and select the intended provider explicitly. NoxSwap remembers your provider preference for the browser.</p></details>
              <details><summary>The app says the network is wrong.</summary><p>Switch the selected wallet to Ethereum Sepolia (chain ID 11155111). Read-only public data can load without a wallet, but writes require the correct network.</p></details>
              <details><summary>A swap is refunded by encrypted minOut.</summary><p>That is the protection path, not a lost transaction. Increase the oracle tolerance, use a lower manual minimum, or retry after the pool/reference price changes. Never disable protection without understanding the trade-off.</p></details>
              <details><summary>The balance looks hidden after a swap.</summary><p>Settlement changes the encrypted handle. Use the eye control to request a fresh reveal for the new handle; the previous plaintext is intentionally not reused.</p></details>
              <details><summary>The orderbook or Chainlink status is unavailable.</summary><p>Wait for the public RPC and oracle reads to recover, then use Refresh. The orderbook is read-only without a wallet, and manual settlement remains available whenever readiness checks pass.</p></details>
              <details><summary>The Safe module is revoked.</summary><p>Safe balances, owners, and threshold remain unchanged, but Nox operations pause. Connect the configured Safe owner, open Safe Treasury, review the canonical module address, and use Enable Nox module.</p></details>
              <details><summary>A Safe unwrap request is waiting for finalization.</summary><p>Open Safe Treasury → Swap &amp; Unwrap. The confirmed request ID appears under pending proof finalization and can be retried without creating or signing a second unwrap request.</p></details>
            </div>
          </section>

          <section className="docs-section docs-section-dark" id="contracts">
            <p className="eyebrow">09 / CONTRACTS</p>
            <h2>Live deployment references.</h2>
            <p className="docs-lead">These addresses are the canonical NoxSwap Sepolia deployment used by the frontend. Every link opens the public Sepolia explorer.</p>
            <div className="docs-contract-table" role="table" aria-label="NoxSwap Sepolia contracts">
              {contractRows.map(([label, address]) => <div className="docs-contract-row" role="row" key={label}><strong role="cell">{label}</strong><ContractAddress address={address} /></div>)}
            </div>
            <div className="docs-dark-actions"><a className="outline-button" href={deployment.explorerUrl} target="_blank" rel="noreferrer">Open router on Etherscan <ExternalLink size={17} /></a><Link className="launch-button" to="/app/wallet">Launch NoxSwap <ArrowRight size={17} /></Link></div>
          </section>
        </div>
      </div>
    </main>
  );
}
