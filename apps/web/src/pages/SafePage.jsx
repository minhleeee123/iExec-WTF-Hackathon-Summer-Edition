import { Eye, ExternalLink, LoaderCircle, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeading from '../components/PageHeading';
import SharedAccessPanel from '../components/SharedAccessPanel';
import SafeTreasury from '../components/SafeTreasury';
import { formatToken, shorten } from '../lib/format';
import { validateTokenAmount } from '../lib/validation';

const SECTIONS = ['swap', 'orders', 'activity', 'security'];

export default function SafePage({ safeProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = SECTIONS.includes(requestedSection) ? requestedSection : 'swap';
  const sharedHolder = searchParams.get('shared') ?? '';
  const enabled = Boolean(safeProps.safe?.moduleEnabled);
  const hasSafe = Boolean(safeProps.safe?.address);
  const discoveringSafe = safeProps.connected && safeProps.safeAccountStatus === 'loading';
  const [fundAmount, setFundAmount] = useState('1000');
  const [fundToken, setFundToken] = useState('cUSDC');
  const fundAsset = safeProps.tokens[fundToken];
  const fundValidation = validateTokenAmount(fundAmount, fundAsset.decimals, safeProps.balances?.[fundToken]?.public ?? null);
  const revealLabel = safeProps.safeBalanceRefreshFailed
    ? 'Reveal again'
    : safeProps.safeBalancesVisible
      ? 'Refresh reveal'
      : 'Reveal';

  const selectSection = (nextSection) => {
    setSearchParams({
      ...(nextSection === 'swap' ? {} : { section: nextSection }),
      ...(sharedHolder ? { shared: sharedHolder } : {}),
    }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`safe-tab-${nextSection}`)?.focus());
  };
  const commitSharedHolder = (holder) => setSearchParams({
    ...(hasSafe ? { section: 'security' } : {}),
    shared: holder,
  }, { replace: true });
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
      <PageHeading
        eyebrow="SAFE × NOX COMPOSABILITY"
        title="Safe Treasury"
        description="Operate confidential assets owned by a Safe smart account through an explicitly allowlisted Nox module."
        aside={(
          <>
            {safeProps.safe?.address ? (
              <a className="safe-heading-link" href={`https://sepolia.etherscan.io/address/${safeProps.safe.address}`} target="_blank" rel="noreferrer">
                <strong>Safe {shorten(safeProps.safe.address, 7, 5)}</strong><ExternalLink size={13} />
              </a>
            ) : <strong>{discoveringSafe ? 'Finding your Safe…' : safeProps.connected ? 'No Safe yet' : 'Connect wallet'}</strong>}
            <span>{hasSafe ? `${safeProps.safe.owners?.length || '—'} / ${safeProps.safe.threshold || '—'} threshold · ${enabled ? 'Module enabled' : 'Module paused'}` : 'One Safe treasury per connected owner'}</span>
          </>
        )}
      />
      {!hasSafe ? (
        <div className="safe-onboarding-layout">
          <section className="safe-create-card">
            <div className="section-heading"><div><p className="eyebrow">PERSONAL SAFE TREASURY</p><h2>{discoveringSafe ? 'Checking the Safe registry' : safeProps.connected ? 'Create your Safe' : 'Connect to find your Safe'}</h2></div>{discoveringSafe ? <LoaderCircle className="spin" size={22} /> : <ShieldCheck size={22} />}</div>
            <p>{discoveringSafe ? 'Reading the account-to-Safe registry on Ethereum Sepolia. Existing owners are loaded without creating a new account.' : safeProps.connected ? 'No Safe is registered for this account. Create a Safe v1.4.1 proxy, a bound Nox module, and enable the restricted module in one Sepolia transaction.' : 'Connect the owner wallet to load its registered Safe or create one if it does not exist.'}</p>
            <div className="safe-create-facts"><span>1-of-1 owner</span><span>Official Safe proxy</span><span>Restricted Nox module</span></div>
            <button className="primary-action" onClick={safeProps.connected ? safeProps.onCreateSafe : safeProps.onConnect} disabled={discoveringSafe || Boolean(safeProps.busy)}>
              {discoveringSafe || safeProps.busy === 'safe-create' ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
              {discoveringSafe ? 'Checking registry…' : safeProps.busy === 'safe-create' ? 'Creating Safe…' : safeProps.connected ? 'Create my Safe' : 'Connect wallet'}
            </button>
          </section>
          <SharedAccessPanel busy={safeProps.busy} connected={safeProps.connected} entries={safeProps.safeSharedEntries} initialHolder={sharedHolder} onCheck={safeProps.onCheckShared} onConnect={safeProps.onConnect} onHolderCommitted={commitSharedHolder} onReveal={safeProps.onRevealShared} tokens={safeProps.tokens} variant="safe" />
        </div>
      ) : (
      <div className="workflow-shell safe-workflow-shell">
        <section className="safe-custody-panel" aria-label="Safe confidential balances and funding">
          <div className="safe-custody-heading">
            <div>
              <p className="eyebrow">TREASURY CUSTODY</p>
              <h2>Safe-owned balances</h2>
            </div>
            <div className="safe-custody-status">
              <span className={enabled ? 'safe-context-chip safe-context-good' : 'safe-context-chip safe-context-bad'}><ShieldCheck size={13} /> {enabled ? 'Module enabled' : 'Operations paused'}</span>
              <span className="safe-context-chip">{safeProps.safe?.isOwner ? 'Safe owner' : safeProps.connected ? 'Read only' : 'Connect wallet'}</span>
              <button className="icon-button" onClick={safeProps.onRefresh} disabled={Boolean(safeProps.busy)} aria-label="Refresh Safe treasury" title="Refresh Safe treasury"><RefreshCw className={safeProps.busy === 'safe-refresh' ? 'spin' : ''} size={16} /></button>
            </div>
          </div>
          <div className="safe-page-assets">
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
            {safeProps.busy === 'safe-reveal' ? <LoaderCircle className="spin" size={15} /> : <Eye size={15} />} {safeProps.busy === 'safe-reveal' ? 'Revealing…' : revealLabel}
          </button>
          <div className="safe-page-fund">
            <label><span>Fund treasury</span><input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} inputMode="decimal" aria-label="Safe funding amount" /></label>
            <label><span>Asset</span><select value={fundToken} onChange={(event) => setFundToken(event.target.value)} aria-label="Safe funding token">{Object.values(safeProps.tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.publicSymbol}</option>)}</select></label>
            <button className="outline-mini-button" onClick={() => safeProps.onFund({ token: fundToken, amount: fundAmount })} disabled={!safeProps.safe?.isOwner || Boolean(safeProps.busy) || Boolean(fundValidation.error)} title={fundValidation.error || `Fund ${fundAsset.publicSymbol} to the Safe`}>
              {safeProps.busy === 'safe-fund' ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Fund
            </button>
          </div>
          </div>
          {fundValidation.error && <p className="safe-fund-error" role="status">{fundValidation.error}</p>}
        </section>
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
          <SafeTreasury {...safeProps} onSharedHolderCommitted={commitSharedHolder} sharedHolder={sharedHolder} view={section} />
        </div>
      </div>
      )}
    </main>
  );
}
