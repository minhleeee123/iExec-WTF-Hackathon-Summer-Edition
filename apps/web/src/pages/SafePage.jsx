import { Eye, ExternalLink, LoaderCircle, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SafeTreasury from '../components/SafeTreasury';
import { formatToken, shorten } from '../lib/format';

const SECTIONS = ['swap', 'orders', 'activity', 'security'];

export default function SafePage({ safeProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = SECTIONS.includes(requestedSection) ? requestedSection : 'swap';
  const enabled = Boolean(safeProps.safe?.moduleEnabled);
  const [fundAmount, setFundAmount] = useState('1000');
  const [fundToken, setFundToken] = useState('cUSDC');

  const selectSection = (nextSection) => {
    setSearchParams(nextSection === 'swap' ? {} : { section: nextSection }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`safe-tab-${nextSection}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = SECTIONS.indexOf(section);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? SECTIONS.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length;
    selectSection(SECTIONS[next]);
  };

  return (
    <main className="app-page safe-page">
      <header className="safe-page-hero">
        <div className="safe-page-hero-copy">
          <p className="eyebrow">SAFE × NOX COMPOSABILITY</p>
          <h1>Safe Treasury</h1>
          <p>Operate confidential assets owned by a Safe smart account through an explicitly allowlisted Nox module.</p>
        </div>
        <div className="safe-page-meta" aria-label="Safe Treasury context">
          {safeProps.safe?.address && <a href={`https://sepolia.etherscan.io/address/${safeProps.safe.address}`} target="_blank" rel="noreferrer"><span>Safe</span><strong>{shorten(safeProps.safe.address, 7, 5)}</strong><ExternalLink size={12} /></a>}
          <span><small>Threshold</small><strong>{safeProps.safe?.owners?.length || '—'} / {safeProps.safe?.threshold || '—'}</strong></span>
          <span className={enabled ? 'safe-meta-good' : 'safe-meta-bad'}><small>Module</small><strong>{enabled ? 'Enabled' : 'Paused'}</strong></span>
          <span className={safeProps.safe?.isOwner ? 'safe-meta-good' : ''}><small>Signer</small><strong>{safeProps.safe?.isOwner ? 'Safe owner' : safeProps.connected ? 'Read only' : 'Connect wallet'}</strong></span>
          <button className="icon-button" onClick={safeProps.onRefresh} disabled={Boolean(safeProps.busy)} aria-label="Refresh Safe treasury" title="Refresh Safe treasury"><RefreshCw className={safeProps.busy === 'safe-refresh' ? 'spin' : ''} size={16} /></button>
        </div>
        <section className="safe-page-assets" aria-label="Safe confidential balances and funding">
          <div className="safe-page-balance-strip">
            {Object.values(safeProps.tokens).map((token) => {
              const balance = safeProps.safeBalances?.[token.symbol];
              return (
                <span key={token.symbol}>
                  <small>{token.symbol}</small>
                  <strong>{balance?.decrypted === null || balance?.decrypted === undefined ? '••••••' : formatToken(balance.decrypted, token.decimals)}</strong>
                </span>
              );
            })}
          </div>
          <button className="outline-mini-button safe-page-reveal" onClick={safeProps.onReveal} disabled={!enabled || !safeProps.safe?.isOwner || Boolean(safeProps.busy)}>
            {safeProps.busy === 'safe-reveal' ? <LoaderCircle className="spin" size={15} /> : <Eye size={15} />} Reveal
          </button>
          <div className="safe-page-fund">
            <label><span>Fund treasury</span><input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} inputMode="decimal" aria-label="Safe funding amount" /></label>
            <label><span>Asset</span><select value={fundToken} onChange={(event) => setFundToken(event.target.value)} aria-label="Safe funding token">{Object.values(safeProps.tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.publicSymbol}</option>)}</select></label>
            <button className="outline-mini-button" onClick={() => safeProps.onFund({ token: fundToken, amount: fundAmount })} disabled={!safeProps.safe?.isOwner || Boolean(safeProps.busy)}>
              {safeProps.busy === 'safe-fund' ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Fund
            </button>
          </div>
          <span className="safe-page-custody-note"><ShieldCheck size={14} /> Safe-owned balances</span>
        </section>
      </header>
      <div className="workflow-shell safe-workflow-shell">
        <div className="workflow-tabs safe-workflow-tabs" role="tablist" aria-label="Safe Treasury section">
          {[
            ['swap', 'Swap & unwrap'],
            ['orders', 'Orders & Agent'],
            ['activity', 'Activity'],
            ['security', 'Access & security'],
          ].map(([value, label]) => (
            <button
              id={`safe-tab-${value}`}
              key={value}
              type="button"
              role="tab"
              aria-selected={section === value}
              aria-controls={`safe-panel-${value}`}
              tabIndex={section === value ? 0 : -1}
              className={section === value ? 'active' : ''}
              onKeyDown={handleTabKey}
              onClick={() => selectSection(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="workflow-content" role="tabpanel" id={`safe-panel-${section}`} aria-labelledby={`safe-tab-${section}`} tabIndex="0">
          <SafeTreasury {...safeProps} view={section} />
        </div>
      </div>
    </main>
  );
}
