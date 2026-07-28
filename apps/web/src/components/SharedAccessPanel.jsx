import { Eye, FileKey2, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatToken, shorten } from '../lib/format';

const STATUS_COPY = {
  changed: ['Handle changed', 'The balance changed after this access check. Ask the holder to grant the current handle.'],
  error: ['Unavailable', 'The current ACL could not be read. Retry the access check.'],
  'not-shared': ['Not shared', 'The connected wallet is not a viewer of this current handle.'],
  shared: ['Shared', 'The connected wallet may request an authorized session reveal.'],
  uninitialized: ['No balance', 'This holder has no initialized confidential balance for the asset.'],
};

export default function SharedAccessPanel({
  busy,
  connected,
  entries = [],
  fixedHolder = '',
  initialHolder = '',
  onCheck,
  onConnect,
  onHolderCommitted,
  onReveal,
  tokens,
  variant = 'wallet',
}) {
  const [holder, setHolder] = useState(fixedHolder || initialHolder);

  useEffect(() => {
    setHolder(fixedHolder || initialHolder);
  }, [fixedHolder, initialHolder]);

  const normalizedHolder = (fixedHolder || holder).trim();
  const validHolder = /^0x[a-fA-F0-9]{40}$/.test(normalizedHolder);
  const checking = busy === `shared-check-${variant}`;
  const hasEntries = entries.length > 0;
  const title = 'Shared with me';
  const check = () => {
    onHolderCommitted?.(normalizedHolder);
    onCheck(normalizedHolder);
  };

  return (
    <section className={`shared-access-panel shared-access-${variant}`}>
      <div className="section-heading compact-heading">
        <div><p className="eyebrow">VIEWER ACCESS</p><h2>{title}</h2></div>
        <FileKey2 size={19} />
      </div>
      <p className="shared-access-helper">Check current per-handle ACLs, then reveal only values shared with the connected wallet. Viewer access never grants spending authority.</p>
      {!fixedHolder && (
        <label className="safe-field shared-holder-field">
          <span>{variant === 'safe' ? 'Source Safe' : 'Source wallet'}</span>
          <input value={holder} onChange={(event) => setHolder(event.target.value)} placeholder={variant === 'safe' ? '0x Safe address' : '0x balance holder address'} aria-label="Shared balance holder address" />
        </label>
      )}
      {fixedHolder && <div className="shared-source"><span>Safe owner</span><code title={fixedHolder}>{shorten(fixedHolder, 12, 10)}</code></div>}
      <button
        className="secondary-action compact shared-check-action"
        onClick={connected ? check : onConnect}
        disabled={connected && (!validHolder || Boolean(busy))}
      >
        {checking ? <LoaderCircle className="spin" size={17} /> : connected ? <RefreshCw size={17} /> : <ShieldCheck size={17} />}
        {checking ? 'Checking access…' : connected ? 'Check current access' : 'Connect viewer wallet'}
      </button>

      {!hasEntries ? (
        <div className="shared-access-empty" role="status">No current ACL check yet. Connect the viewer wallet and check the balance source.</div>
      ) : (
        <div className="shared-access-list" aria-live="polite">
          {entries.map((entry) => {
            const token = tokens[entry.symbol];
            const [label, detail] = STATUS_COPY[entry.status] ?? STATUS_COPY.error;
            const revealed = typeof entry.decrypted === 'bigint';
            const revealing = busy === `shared-reveal-${variant}-${entry.symbol}`;
            return (
              <article className={`shared-access-row shared-status-${entry.status}`} key={entry.symbol}>
                <div className="shared-token-value">
                  <span>{entry.symbol}</span>
                  <strong>{revealed ? formatToken(entry.decrypted, token.decimals) : '••••••'}</strong>
                </div>
                <div className="shared-access-status">
                  <strong>{label}</strong>
                  <span>{detail}</span>
                  {entry.handle && <code title={entry.handle}>{shorten(entry.handle, 10, 8)}</code>}
                </div>
                <button
                  className="outline-mini-button"
                  onClick={() => onReveal({ entry, holder: normalizedHolder })}
                  disabled={entry.status !== 'shared' || revealing || Boolean(busy && !revealing)}
                >
                  {revealing ? <LoaderCircle className="spin" size={15} /> : <Eye size={15} />}
                  {revealing ? 'Revealing…' : revealed ? 'Reveal again' : 'Reveal'}
                </button>
              </article>
            );
          })}
        </div>
      )}
      <p className="shared-session-note">Revealed plaintext stays in this browser session and clears when the wallet or network changes. A new balance handle requires a new grant.</p>
    </section>
  );
}
