import { Droplets, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import { formatDuration, formatToken } from '../lib/format';
import { getCooldownRemaining } from '../lib/validation';
import { CardHelpButton } from './CardHelpModal';

export default function AssetOperations({
  asset,
  assetAmount,
  assetMode,
  available,
  balances,
  busy,
  chainNow,
  connected,
  embedded = false,
  faucets,
  onAmountChange,
  onAssetChange,
  onFaucet,
  onManage,
  onMax,
  onModeChange,
  onReveal,
  privateBalancesVisible,
  tokens,
  validation,
}) {
  const token = tokens[asset];
  const availableText = assetMode === 'wrap'
    ? `${formatToken(available ?? 0n, token.decimals)} ${token.publicSymbol}`
    : privateBalancesVisible && available !== null
      ? `${formatToken(available, token.decimals)} ${token.symbol}`
      : 'Private balance hidden';

  return (
    <section id="assets" className={`section-band${embedded ? ' embedded-workflow' : ''}`}>
      <div className={embedded ? 'embedded-intro' : 'section-title'}>
        <div><p className="eyebrow">ASSET OPERATIONS</p><h2>Fund, wrap, and unwrap</h2></div>
        <CardHelpButton
          category="ASSET FAUCET GUIDE"
          title="Token Faucets & Wrappers"
          description="Claim test tokens, wrap public ERC-20 into confidential ERC-7984 tokens 1:1, or unwrap back to public form."
          steps={[
            { heading: 'Step 1 - Gas Fee', detail: 'Claims, wrapping, and unwrapping require Sepolia ETH for gas. Click "Get ETH" if your ETH balance is low.' },
            { heading: 'Step 2 - Test Faucets', detail: 'Claim nUSDC, nWETH, nWBTC, nSOL test tokens (1-hour cooldown).' },
            { heading: 'Step 3 - Wrap & Unwrap', detail: 'Approve the official test wrapper once and wrap 1:1 into confidential form, or request unwrap with a Nox public decryption proof.' },
          ]}
        />
        <p>Test faucets enforce a one-hour cooldown. The first wrap may request a reusable wrapper approval; later wraps need only the wrap transaction. Unwrapping finalizes with a Nox public decryption proof.</p>
      </div>
      <div className="asset-layout">
        <div className="faucet-list">
          <div className="faucet-item eth-faucet-item">
            <div>
              <span>Sepolia ETH (Gas Fee)</span>
              <small>Public L1 Testnet ETH for transaction gas</small>
            </div>
            <a
              href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
              target="_blank"
              rel="noreferrer"
              className="outline-faucet-link"
              title="Get free Sepolia ETH for transaction gas from Google Cloud Faucet"
            >
              <ExternalLink size={15} /> Get ETH
            </a>
          </div>
          {Object.values(tokens).map((item) => {
            const faucet = faucets[item.symbol];
            const remaining = getCooldownRemaining(faucet.nextClaimAt, chainNow);
            return (
              <div className="faucet-item" key={item.symbol}>
                <div>
                  <span>{item.publicSymbol}</span>
                  <small>
                    Public balance {formatToken(balances[item.symbol].public, item.decimals)}
                    {faucet.amount > 0n && ` · Claim ${formatToken(faucet.amount, item.decimals)}`}
                  </small>
                  {remaining > 0 && <small className="cooldown">Next claim in {formatDuration(remaining)}</small>}
                </div>
                <button onClick={() => onFaucet(item.symbol)} disabled={!connected || Boolean(busy)} title={remaining > 0 ? `Faucet available in ${formatDuration(remaining)}` : `Fund ${item.publicSymbol}`}>
                  <Droplets size={16} /> {remaining > 0 ? formatDuration(remaining) : 'Faucet'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="asset-form">
          <div className="segmented" role="group" aria-label="Asset operation">
            <button className={assetMode === 'wrap' ? 'active' : ''} onClick={() => onModeChange('wrap')}>Wrap</button>
            <button className={assetMode === 'unwrap' ? 'active' : ''} onClick={() => onModeChange('unwrap')}>Unwrap</button>
          </div>
          <div className="available-row">
            <span>Available</span>
            <strong>{connected ? availableText : 'Connect wallet'}</strong>
            {connected && (assetMode === 'unwrap' && (!privateBalancesVisible || available === null)
              ? <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>
              : <button className="text-button" onClick={onMax} disabled={available === null || available === 0n}>Max</button>)}
          </div>
          <div className="inline-fields">
            <input value={assetAmount} onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" aria-label="Asset amount" />
            <select value={asset} onChange={(event) => onAssetChange(event.target.value)} aria-label="Asset">
              {Object.values(tokens).map((item) => (
                <option value={item.symbol} key={item.symbol}>
                  {assetMode === 'wrap' ? item.publicSymbol : item.symbol}
                </option>
              ))}
            </select>
          </div>
          {connected && validation.error && <p className="field-error" role="alert">{validation.error}</p>}
          <button className="primary-action compact" onClick={onManage} disabled={!connected || Boolean(busy) || Boolean(validation.error)}>
            {busy === assetMode ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />} {assetMode === 'wrap' ? 'Approve and wrap' : 'Request and finalize unwrap'}
          </button>
        </div>
      </div>
    </section>
  );
}
