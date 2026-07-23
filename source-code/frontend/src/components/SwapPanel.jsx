import { ArrowDown, LoaderCircle, ShieldCheck } from 'lucide-react';
import deployment from '../deployment.json';
import { formatToken, shorten } from '../lib/format';
import { CardHelpButton } from './CardHelpModal';

export default function SwapPanel({
  amountIn,
  balance,
  busy,
  connected,
  deadlineMinutes,
  error,
  minOut,
  minOutAuto,
  onAmountChange,
  onConnect,
  onDeadlineChange,
  onMax,
  onAllowZeroMinOutChange,
  onMinOutChange,
  onReveal,
  onSwap,
  onTokenChange,
  onTokenOutChange,
  onUseSuggestedMinOut,
  outputOptions,
  priceUpdatedAt,
  privateBalancesVisible,
  referenceOutput,
  suggestedMinOut,
  token,
  tokenIn,
  tokenOut,
  tokens,
}) {
  const available = privateBalancesVisible && balance.decrypted !== null
    ? `${formatToken(balance.decrypted, token.decimals)} ${token.symbol}`
    : 'Private balance hidden';
  const hasOracleReference = referenceOutput !== '--';

  const handleSwitchTokens = () => {
    onTokenChange(tokenOut);
    onTokenOutChange(tokenIn);
  };

  return (
    <div className="swap-panel">
      <div className="section-heading">
        <div><p className="eyebrow">LIVE ROUTER V2</p><h2>Protected confidential swap</h2></div>
        <CardHelpButton
          category="PROTECTED SWAP GUIDE"
          title="Protected Confidential Swap"
          description="Exchange confidential ERC-7984 tokens using iExec Nox encrypted handles and Chainlink oracle price references."
          steps={[
            { heading: 'Step 1 - Gas Fee', detail: 'Ensure your wallet has Sepolia ETH for transaction gas (claim free Sepolia ETH if balance is low).' },
            { heading: 'Step 2 - Reveal Private Balance', detail: 'Click Reveal and sign EIP-712 to decrypt your private balance state.' },
            { heading: 'Step 3 - Set MinOut', detail: 'Click "Use suggested" to set a protected minimum output derived from Chainlink. Avoid setting minOut higher than pool rate to prevent refund rejection.' },
            { heading: 'Step 4 - Execute Swap', detail: 'Click "Encrypt protected swap" and confirm the transaction in your wallet.' },
          ]}
        />
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
            {Object.values(tokens).map((item) => <option value={item.symbol} key={item.symbol}>{item.symbol}</option>)}
          </select>
        </div>
      </div>
      <div className="direction-row">
        <button
          type="button"
          className="direction-btn"
          onClick={handleSwitchTokens}
          aria-label="Switch input and output tokens"
          title="Switch tokens"
        >
          <ArrowDown className="direction-icon" size={18} />
        </button>
      </div>
      <div className="amount-box output">
        <div className="amount-meta">
          <span>Oracle reference output</span>
          <span>{hasOracleReference ? 'Chainlink ETH/USD, 0.30% fee' : 'No public oracle for this test pair'}</span>
        </div>
        <div className="amount-row">
          <strong>{referenceOutput}</strong>
          <select value={tokenOut} onChange={(event) => onTokenOutChange(event.target.value)} aria-label="Output token">
            {outputOptions.map((symbol) => <option value={symbol} key={symbol}>{symbol}</option>)}
          </select>
        </div>
      </div>

      <div className="protection-grid">
        <label>
          <span>Encrypted minimum received {!minOutAuto && suggestedMinOut && <button type="button" className="text-button" onClick={onUseSuggestedMinOut}>Use suggested</button>}</span>
          <span className="protected-input"><input value={minOut} onChange={(event) => onMinOutChange(event.target.value)} inputMode="decimal" aria-label="Minimum output" /><strong>{tokenOut}</strong></span>
          {minOut.trim() === '0' && <span className="zero-protection"><input type="checkbox" onChange={(event) => onAllowZeroMinOutChange(event.target.checked)} /> Allow zero minOut</span>}
        </label>
        <label>
          <span>Deadline</span>
          <span className="protected-input"><input value={deadlineMinutes} onChange={(event) => onDeadlineChange(event.target.value)} inputMode="numeric" aria-label="Deadline minutes" /><strong>min</strong></span>
        </label>
      </div>
      <p className="field-note">Suggested minOut is 0.50% below the Chainlink-derived reference. Unsupported pairs require a positive manual minimum.</p>
      {connected && error && <p className="field-error" role="alert">{error}</p>}

      <button className="primary-action" onClick={connected ? onSwap : onConnect} disabled={Boolean(busy) || (connected && Boolean(error))}>
        {busy === 'swap' ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />}
        {connected ? 'Encrypt protected swap' : 'Connect wallet to swap'}
      </button>
      <div className="contract-strip">
        <span>Router {shorten(deployment.contracts.noxSwapRouter, 10, 8)}</span>
        <span>3 encrypted pools</span>
        <span>{priceUpdatedAt ? `Oracle ${new Date(priceUpdatedAt * 1000).toLocaleTimeString()}` : 'Oracle loading'}</span>
      </div>
    </div>
  );
}
