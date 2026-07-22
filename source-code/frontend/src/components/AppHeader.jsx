import { LoaderCircle, LockKeyhole, Wallet } from 'lucide-react';
import { shorten } from '../lib/format';

export default function AppHeader({ account, busy, onConnect }) {
  return (
    <header className="topbar">
      <a className="brand" href="#swap" aria-label="NoxSwap home">
        <span className="brand-mark"><LockKeyhole size={20} /></span>
        <span>NoxSwap</span>
        <span className="network-chip">Sepolia</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#swap">Swap</a>
        <a href="#assets">Assets</a>
        <a href="#activity">Activity</a>
      </nav>
      <button className="wallet-button" onClick={onConnect} disabled={busy === 'connect'}>
        {busy === 'connect' ? <LoaderCircle className="spin" size={17} /> : <Wallet size={17} />}
        {account ? shorten(account) : 'Connect wallet'}
      </button>
    </header>
  );
}
