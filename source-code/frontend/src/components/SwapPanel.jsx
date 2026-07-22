import { ArrowDown, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import deployment from '../deployment.json';
import { formatToken, shorten } from '../lib/format';

export default function SwapPanel({
  amountIn,
  balance,
  busy,
  connected,
  onAmountChange,
  onConnect,
  onMax,
  onRefresh,
  onReveal,
  onSwap,
  onTokenChange,
  priceUpdatedAt,
  privateBalancesVisible,
  referenceOutput,
  token,
  tokenIn,
  tokenOut,
  validation,
}) {
  const available = privateBalancesVisible && balance.decrypted !== null
    ? `${formatToken(balance.decrypted, token.decimals)} ${token.symbol}`
    : 'Private balance hidden';

  return (
    <div className="swap-panel">
      <div className="section-heading">
        <div><p className="eyebrow">LIVE CONTRACT</p><h2>Confidential swap</h2></div>
        <button className="icon-button" onClick={onRefresh} disabled={busy === 'refresh'} aria-label="Refresh chain data" title="Refresh chain data">
          <RefreshCw className={busy === 'refresh' ? 'spin' : ''} size={18} />
        </button>
      </div>

      <div className="amount-box">
        <div className="amount-meta">
          <span>You encrypt</span>
          <span className="available-inline">
            {connected ? available : 'Connect wallet'}
            {connected && (privateBalancesVisible && balance.decrypted !== null
              ? <button className="text-button" onClick={onMax}>Max</button>
              : <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>)}
          </span>
        </div>
        <div className="amount-row">
          <input value={amountIn} onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" aria-label="Swap amount" />
          <select value={tokenIn} onChange={(event) => onTokenChange(event.target.value)} aria-label="Input token">
            <option value="cUSDC">cUSDC</option><option value="cETH">cETH</option>
          </select>
        </div>
      </div>
      <div className="direction"><ArrowDown size={18} /></div>
      <div className="amount-box output">
        <div className="amount-meta"><span>Reference output</span><span>Chainlink price, 0.30% fee</span></div>
        <div className="amount-row"><strong>{referenceOutput}</strong><span className="token-pill">{tokenOut}</span></div>
      </div>
      <p className="field-note">The reference is public UI guidance. The contract computes the final amount from encrypted pool reserves.</p>
      {connected && validation.error && <p className="field-error" role="alert">{validation.error}</p>}

      <button className="primary-action" onClick={connected ? onSwap : onConnect} disabled={Boolean(busy) || (connected && Boolean(validation.error))}>
        {busy === 'swap' ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />}
        {connected ? 'Encrypt and swap' : 'Connect wallet to swap'}
      </button>
      <div className="contract-strip">
        <span>Router {shorten(deployment.contracts.noxSwapRouter, 10, 8)}</span>
        <span>Fee 0.30%</span>
        <span>{priceUpdatedAt ? `Oracle ${new Date(priceUpdatedAt * 1000).toLocaleTimeString()}` : 'Oracle loading'}</span>
      </div>
    </div>
  );
}
