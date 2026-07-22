import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingHeader() {
  return (
    <header className="landing-header">
      <Link className="brand" to="/" aria-label="NoxSwap home">
        <span className="brand-mark"><LockKeyhole size={19} /></span>
        <span>Nox<span className="brand-accent">Swap</span></span>
        <span className="network-chip">Sepolia</span>
      </Link>
      <nav className="landing-header-nav" aria-label="Landing page navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#privacy">Privacy</a>
        <a href="#faq">FAQ</a>
        <Link className="landing-header-launch" to="/app/trade">Launch app <ArrowRight size={17} /></Link>
      </nav>
    </header>
  );
}
