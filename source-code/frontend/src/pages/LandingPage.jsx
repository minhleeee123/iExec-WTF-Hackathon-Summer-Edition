import { ArrowRight, Bot, CheckCircle2, ExternalLink, FileKey2, Layers3, LockKeyhole, ShieldCheck, Workflow } from 'lucide-react';
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
    icon: FileKey2,
    number: '03',
    title: 'Selective access',
    text: 'Reveal balances only after wallet authorization or grant an auditor access to a specific current handle.',
    to: '/app/wallet?tab=access',
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
        <div><strong>7</strong><span>Live MCP tools</span></div>
      </section>

      <section className="landing-capabilities">
        <div className="landing-section-title">
          <p className="eyebrow">CONFIDENTIAL DEFI, END TO END</p>
          <h2>One privacy layer. Three real workflows.</h2>
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

      <section className="landing-cta">
        <div><p className="eyebrow">LIVE TESTNET APPLICATION</p><h2>Inspect the encrypted path yourself.</h2></div>
        <Link className="launch-button dark" to="/app/wallet">Fund a test wallet <ArrowRight size={20} /></Link>
      </section>
    </main>
  );
}
