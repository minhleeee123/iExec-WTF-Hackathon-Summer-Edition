import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function LandingHeader() {
  const location = useLocation();
  const landingAnchor = (section) => location.pathname === '/' ? `#${section}` : `/#${section}`;

  return (
    <header className="landing-header">
      <Link className="brand" to="/" aria-label="NoxSwap home">
        <span className="brand-mark"><LockKeyhole size={19} /></span>
        <span>Nox<span className="brand-accent">Swap</span></span>
        <span className="network-chip">Sepolia</span>
      </Link>
      <nav className="landing-header-nav" aria-label="Landing page navigation">
        <a href={landingAnchor('how-it-works')}>How it works</a>
        <a href={landingAnchor('safe-treasury')}>Safe Treasury</a>
        <a href={landingAnchor('privacy')}>Privacy</a>
        <a href={landingAnchor('faq')}>FAQ</a>
        <Link className="landing-header-docs" to="/docs" aria-current={location.pathname === '/docs' ? 'page' : undefined}>Docs</Link>
        <Link className="landing-header-launch" to="/app/wallet">Launch app <ArrowRight size={17} /></Link>
      </nav>
    </header>
  );
}
