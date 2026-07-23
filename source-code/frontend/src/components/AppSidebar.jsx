import { Activity, ArrowLeft, ArrowLeftRight, Boxes, Copy, ExternalLink, LoaderCircle, LockKeyhole, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import PrivateWallet from './PrivateWallet';
import { shorten } from '../lib/format';

const navigation = [
  { to: '/app/wallet', label: 'Wallet', description: 'Assets and access', icon: Boxes },
  { to: '/app/trade', label: 'Trade', description: 'Swap and orders', icon: ArrowLeftRight },
  { to: '/app/activity', label: 'Activity', description: 'History and proofs', icon: Activity },
];

function AccountControl({ account, busy, onAccountAction }) {
  return (
    <button className="sidebar-account" onClick={onAccountAction} disabled={busy === 'connect'}>
      {busy === 'connect'
        ? <LoaderCircle className="spin" size={17} />
        : account ? <Copy size={17} /> : <Wallet size={17} />}
      <span>{account ? shorten(account) : 'Connect wallet'}</span>
    </button>
  );
}

function PrimaryNavigation({ onNavigate, testId }) {
  return (
    <nav className="app-primary-nav" aria-label="Application navigation" data-testid={testId}>
      {navigation.map((item) => (
        <NavLink key={item.to} to={item.to} onClick={onNavigate}>
          <item.icon size={19} />
          <span><strong>{item.label}</strong><small>{item.description}</small></span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppSidebar({ account, busy, onAccountAction, walletProps }) {
  const [mobileWalletOpen, setMobileWalletOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileWalletOpen(false), [location.pathname]);

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-brand-row">
          <Link className="brand" to="/" aria-label="NoxSwap landing page">
            <span className="brand-mark"><LockKeyhole size={19} /></span>
            <span>Nox<span className="brand-accent">Swap</span></span>
          </Link>
          <span className="sidebar-live"><i /> Sepolia</span>
        </div>

        <PrimaryNavigation testId="desktop-primary-nav" />

        <div className="sidebar-wallet">
          <AccountControl account={account} busy={busy} onAccountAction={onAccountAction} />
          <PrivateWallet {...walletProps} compact />
        </div>

        <div className="sidebar-footer">
          <Link to="/"><ArrowLeft size={15} /> Landing page</Link>
          {account && (
            <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer">
              Explorer <ExternalLink size={14} />
            </a>
          )}
        </div>
      </aside>

      <header className="mobile-app-header">
        <Link className="brand" to="/" aria-label="NoxSwap landing page">
          <span className="brand-mark"><LockKeyhole size={18} /></span>
          <span>Nox<span className="brand-accent">Swap</span></span>
        </Link>
        <button className="mobile-wallet-toggle" onClick={() => setMobileWalletOpen(true)} aria-label="Open private wallet">
          <Wallet size={18} />
          <span>{account ? shorten(account, 5, 4) : 'Connect'}</span>
        </button>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Application navigation" data-testid="mobile-primary-nav">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to}>
            <item.icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {mobileWalletOpen && (
        <div className="mobile-wallet-overlay" role="presentation" onMouseDown={() => setMobileWalletOpen(false)}>
          <aside className="mobile-wallet-drawer" role="dialog" aria-modal="true" aria-label="Private wallet" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-heading">
              <strong>Private wallet</strong>
              <button className="icon-button" onClick={() => setMobileWalletOpen(false)} aria-label="Close private wallet"><X size={18} /></button>
            </div>
            <AccountControl account={account} busy={busy} onAccountAction={onAccountAction} />
            <PrivateWallet {...walletProps} compact />
          </aside>
        </div>
      )}
    </>
  );
}
