import { ArrowRight, Bot, BrainCircuit, CheckCircle2, Coins, ExternalLink, Eye, FileKey2, Layers3, LockKeyhole, ShieldCheck, Wallet, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import deployment from '../deployment.json';
import hero from '../assets/hero.png';
import { shorten } from '../lib/format';

const capabilities = [
  {
    icon: LockKeyhole,
    number: '01',
    title: 'Protected swaps',
    text: 'Encrypted amount and minOut settle against encrypted reserves, with a full confidential refund when protection fails.',
    to: '/app/trade',
  },
  {
    icon: Workflow,
    number: '02',
    title: 'Private orders',
    text: 'Escrow encrypted order size and minOut while Chainlink provides the public ETH/USD execution trigger.',
    to: '/app/trade?mode=orders',
  },
  {
    icon: BrainCircuit,
    number: '03',
    title: 'Strategy Agent',
    text: 'Turn natural language and public Chainlink context into a strict, reviewable order draft while private balance math stays local.',
    to: '/app/trade?mode=agent',
  },
  {
    icon: FileKey2,
    number: '04',
    title: 'Selective access',
    text: 'Reveal balances only after wallet authorization or grant an auditor access to a specific current handle.',
    to: '/app/wallet?tab=access',
  },
];

const onboardingSteps = [
  { icon: Wallet, title: 'Connect on Sepolia', text: 'Use MetaMask on Ethereum Sepolia. The public orderbook remains readable before you connect.' },
  { icon: Coins, title: 'Fund test assets', text: 'Claim public nUSDC, nWETH, nWBTC, or nSOL from the demo faucets. Claims have a one-hour cooldown.' },
  { icon: LockKeyhole, title: 'Wrap into c-assets', text: 'Wrap n-assets 1:1 into ERC-7984 c-assets whose balances are represented by encrypted handles.' },
  { icon: FileKey2, title: 'Open private balances', text: 'Sign the Nox Gateway authorization once per current session and balance handle. No transaction or gas is required.' },
  { icon: Workflow, title: 'Trade or automate', text: 'Submit protected swaps or private orders. Owners settle privately; any wallet may execute a ready order.' },
];

const publicData = [
  'Wallet and order owner addresses',
  'Trading pair, trigger price, expiry, and status',
  'Transaction hashes and encrypted handle identifiers',
  'Chainlink reference price and permissionless actions',
];

const privateData = [
  'ERC-7984 account balances',
  'Swap and order input amounts',
  'Encrypted minOut protection',
  'Settlement output, refund, and pool reserve values',
];

const faqs = [
  {
    question: 'Why do I connect my wallet and then sign again to reveal a balance?',
    answer: 'Connecting exposes your address but does not authorize plaintext access. The second EIP-712 signature authorizes the Nox Gateway for the current account, network, and balance handle. NoxSwap keeps the result only in React session state and asks again after those inputs change.',
  },
  {
    question: 'What is the difference between nUSDC and cUSDC?',
    answer: 'n-assets are public faucet-backed Sepolia test tokens. c-assets are ERC-7984 confidential balances created by wrapping the corresponding n-asset 1:1. Unwrap converts a c-asset back to its public n-asset after Nox public-decryption proof verification.',
  },
  {
    question: 'What remains public when I use a confidential order?',
    answer: 'The owner, pair, Chainlink trigger, expiry, status, transaction, and encrypted handle identifiers are public. The amount and minOut values behind those handles remain private and can only be revealed by the owner.',
  },
  {
    question: 'Who can execute, expire, cancel, or reveal an order?',
    answer: 'Any Sepolia wallet can execute a trigger-ready order or refund an expired order. Only the owner can cancel it or request decryption of its amount and minOut. A non-owner executor never receives owner plaintext.',
  },
  {
    question: 'What happens when encrypted minOut protection fails?',
    answer: 'The router selects a full encrypted input refund instead of an output settlement. The transaction can still be confirmed on-chain while the owner receives authorized refund handles.',
  },
  {
    question: 'Why is the faucet unavailable, and why do I need Sepolia ETH?',
    answer: 'Each faucet enforces a one-hour cooldown per wallet. Sepolia ETH is separate from the demo assets and is required to pay gas for wrap, swap, order, access, and unwrap transactions.',
  },
  {
    question: 'What does auditor access grant?',
    answer: 'It adds a viewer to one current encrypted balance handle. The grant does not automatically follow a later balance handle, and the installed Nox interface does not provide historical viewer revocation. Only grant access to an address you trust.',
  },
  {
    question: 'What if the automated keeper is offline?',
    answer: 'Order execution remains permissionless. The public orderbook continues to expose manual execute and expiry-refund actions whenever their readiness checks pass. A keeper never needs to decrypt or store confidential terms.',
  },
  {
    question: 'What does the Strategy Agent send to Groq, and can AI trade for me?',
    answer: 'Groq receives only the intent text you enter and public Chainlink price, oracle time, and block time. NoxSwap does not send your wallet address, balance, handles, proofs, or signature. AI only drafts fields; Nox encryption stays local and MetaMask confirmation is always required.',
  },
];

export default function LandingPage({ ethPrice }) {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="live-label"><span /> LIVE ON ETHEREUM SEPOLIA</p>
          <h1>Nox<span>Swap</span></h1>
          <p className="hero-offer">Confidential execution for swaps, limit orders, and ERC-7984 assets.</p>
          <p className="hero-summary">Trade without publishing amount, balance, minOut, output, or pool reserves as plaintext on-chain.</p>
          <div className="hero-actions">
            <Link className="launch-button" to="/app/trade">Launch app <ArrowRight size={20} /></Link>
            <a className="outline-button" href={deployment.explorerUrl} target="_blank" rel="noreferrer">View contracts <ExternalLink size={18} /></a>
          </div>
          <div className="hero-checks">
            <span><CheckCircle2 size={16} /> NoxCompute live</span>
            <span><CheckCircle2 size={16} /> Exact-match source</span>
            <span><CheckCircle2 size={16} /> No mock settlement</span>
          </div>
        </div>
        <img className="landing-protocol-art" src={hero} alt="Nox encrypted execution layers" />
        <div className="landing-terminal" aria-label="Live protocol status">
          <div><span>ROUTER V2</span><strong>{shorten(deployment.contracts.noxSwapRouter, 10, 8)}</strong></div>
          <div><span>ENCRYPTED POOLS</span><strong>3 initialized</strong></div>
          <div><span>ETH / USD</span><strong>{ethPrice ? `$${ethPrice.toLocaleString()}` : 'Loading'}</strong></div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Deployment statistics">
        <div><strong>10</strong><span>Sepolia contracts</span></div>
        <div><strong>3</strong><span>Encrypted pools</span></div>
        <div><strong>4</strong><span>ERC-7984 assets</span></div>
        <div><strong>9</strong><span>Live MCP tools</span></div>
      </section>

      <section className="landing-onboarding" id="how-it-works" aria-labelledby="how-it-works-title">
        <div className="landing-section-title">
          <p className="eyebrow">FROM PUBLIC TEST ASSETS TO PRIVATE EXECUTION</p>
          <h2 id="how-it-works-title">Start with a wallet. Finish with encrypted settlement.</h2>
          <p>Everything runs against live Sepolia contracts. Signatures reveal only data your connected account is authorized to inspect.</p>
        </div>
        <ol className="onboarding-flow">
          {onboardingSteps.map((step, index) => (
            <li key={step.title}>
              <span className="step-index">0{index + 1}</span>
              <step.icon size={21} />
              <strong>{step.title}</strong>
              <small>{step.text}</small>
            </li>
          ))}
        </ol>
        <div className="asset-key" aria-label="Asset naming guide">
          <span><strong>n*</strong> Public faucet asset</span>
          <ArrowRight size={17} />
          <span><strong>Wrap 1:1</strong> ERC-7984 conversion</span>
          <ArrowRight size={17} />
          <span><strong>c*</strong> Confidential balance</span>
        </div>
      </section>

      <section className="landing-capabilities" id="workflows">
        <div className="landing-section-title">
          <p className="eyebrow">CONFIDENTIAL DEFI, END TO END</p>
          <h2>One privacy layer. Four real workflows.</h2>
        </div>
        <div className="capability-list">
          {capabilities.map((item) => (
            <Link to={item.to} className="capability-row" key={item.number}>
              <span className="capability-number">{item.number}</span>
              <span className="capability-icon"><item.icon size={25} /></span>
              <span><strong>{item.title}</strong><small>{item.text}</small></span>
              <ArrowRight size={22} />
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-automation" aria-labelledby="automation-title">
        <div>
          <p className="eyebrow">PUBLIC COORDINATION, PRIVATE TERMS</p>
          <h2 id="automation-title">An orderbook anyone can inspect and settle.</h2>
          <p>Browse live orders without a wallet. Chainlink and block time determine readiness; amount and minOut stay encrypted throughout execution.</p>
          <Link className="outline-button" to="/app/trade?mode=orders">Open public orderbook <ArrowRight size={18} /></Link>
        </div>
        <div className="automation-points">
          <span><Eye size={19} /><strong>Wallet-free reads</strong><small>Real events, handles, state, and explorer links.</small></span>
          <span><Workflow size={19} /><strong>Permissionless settlement</strong><small>Any wallet may execute or refund when ready.</small></span>
          <span><Bot size={19} /><strong>Optional keeper</strong><small>Automation never decrypts order terms.</small></span>
        </div>
      </section>

      <section className="landing-privacy" id="privacy" aria-labelledby="privacy-title">
        <div className="landing-section-title">
          <p className="eyebrow">KNOW THE PRIVACY BOUNDARY</p>
          <h2 id="privacy-title">Public coordination does not require public amounts.</h2>
          <p>Encrypted handles are visible identifiers, not plaintext values. Wallet ownership alone does not reveal what a handle contains.</p>
        </div>
        <div className="privacy-matrix">
          <div>
            <span className="privacy-label public"><Eye size={18} /> Public on Sepolia</span>
            <ul>{publicData.map((item) => <li key={item}><CheckCircle2 size={16} /> {item}</li>)}</ul>
          </div>
          <div>
            <span className="privacy-label private"><LockKeyhole size={18} /> Encrypted by Nox</span>
            <ul>{privateData.map((item) => <li key={item}><ShieldCheck size={16} /> {item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="landing-architecture">
        <div>
          <p className="eyebrow">BUILT AROUND IEXEC NOX</p>
          <h2>Privacy is the execution path, not a dashboard claim.</h2>
        </div>
        <div className="architecture-flow">
          <span><Bot size={20} /> Browser SDK</span>
          <ArrowRight size={18} />
          <span><ShieldCheck size={20} /> Nox handles</span>
          <ArrowRight size={18} />
          <span><Layers3 size={20} /> Sepolia contracts</span>
        </div>
      </section>

      <section className="landing-faq" id="faq" aria-labelledby="faq-title">
        <div className="landing-section-title">
          <p className="eyebrow">FREQUENTLY ASKED QUESTIONS</p>
          <h2 id="faq-title">Understand the signatures before you trade.</h2>
          <p>NoxSwap is testnet software. Its faucet assets have no monetary value, the contracts have not received an external security audit, and the site never asks for a private key.</p>
        </div>
        <div className="faq-list">
          {faqs.map((item, index) => (
            <details key={item.question}>
              <summary><span>0{index + 1}</span>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div><p className="eyebrow">LIVE TESTNET APPLICATION</p><h2>Inspect the encrypted path yourself.</h2></div>
        <Link className="launch-button dark" to="/app/wallet">Fund a test wallet <ArrowRight size={20} /></Link>
      </section>

    </main>
  );
}
