import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { formatToken } from '../lib/format';
import { CardHelpButton } from './CardHelpModal';
import OrderReadiness from './OrderReadiness';

export default function LimitOrderForm({ actions, busy, connected, hideHelp = false, onConnect, onReveal, privateBalancesVisible }) {
  const {
    amount,
    authorizeOrderBook,
    available,
    createChecks,
    createOrder,
    createReady,
    expiryMinutes,
    formError,
    minOut,
    minOutAuto,
    onAllowZeroMinOutChange,
    onAmountChange,
    onExpiryChange,
    onMax,
    onMinOutChange,
    onSideChange,
    onProtectionChange,
    onTriggerChange,
    onUseSuggestedMinOut,
    operatorAuthorized,
    protectionBps,
    readinessLoading,
    revokeOrderBook,
    side,
    suggestedMinOut,
    tokenIn,
    tokenOut,
    trigger,
  } = actions;
  const availableText = privateBalancesVisible && available !== null
    ? `${formatToken(available, tokenIn.decimals)} ${tokenIn.symbol}`
    : 'Private balance hidden';

  return (
    <div className="order-form public-order-form">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow">CREATE ORDER</p><h2>Private terms, public trigger</h2></div>
        {!hideHelp && (
          <CardHelpButton
            category="LIMIT ORDER GUIDE"
            title="Confidential Limit Orders"
            description="Escrow tokens into on-chain confidential limit orders that execute permissionlessly when Chainlink oracle prices trigger your target."
            steps={[
              { heading: 'Step 1 - Gas Fee', detail: 'Creating or cancelling orders requires Sepolia ETH for gas. Execution gas is paid by the automated keeper.' },
              { heading: 'Step 2 - Authorize OrderBook', detail: 'Click "Authorize OrderBook" once for tokenIn if not already authorized.' },
              { heading: 'Step 3 - Set Target Price & MinOut', detail: 'Specify your target price and minimum output. Your order stays encrypted until executed or cancelled.' },
              { heading: 'Step 4 - Escrow Order', detail: 'Click "Escrow confidential order" and confirm in your wallet.' },
            ]}
          />
        )}
      </div>
      <div className="segmented order-side" role="group" aria-label="Limit order side">
        <button className={side === 'buy' ? 'active' : ''} onClick={() => onSideChange('buy')}>Buy ETH</button>
        <button className={side === 'sell' ? 'active' : ''} onClick={() => onSideChange('sell')}>Sell ETH</button>
      </div>
      <div className="available-row">
        <span>Available</span><strong>{connected ? availableText : 'Connect wallet'}</strong>
        {connected && (privateBalancesVisible && available !== null
          ? <button className="text-button" onClick={onMax}>Max</button>
          : <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>)}
      </div>
      <div className="order-fields">
        <label><span>Encrypted amount</span><span className="protected-input"><input value={amount} onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" aria-label="Limit order amount" /><strong>{tokenIn.symbol}</strong></span></label>
        <label><span>Encrypted minOut {!minOutAuto && suggestedMinOut && <button type="button" className="text-button" onClick={onUseSuggestedMinOut}>Use suggested</button>}</span><span className="protected-input"><input value={minOut} onChange={(event) => onMinOutChange(event.target.value)} inputMode="decimal" aria-label="Limit order minimum output" /><strong>{tokenOut.symbol}</strong></span>{minOut.trim() === '0' && <span className="zero-protection"><input type="checkbox" onChange={(event) => onAllowZeroMinOutChange(event.target.checked)} /> Allow zero minOut</span>}</label>
        <label><span>Oracle tolerance</span><span className="protected-input"><select value={protectionBps} onChange={(event) => onProtectionChange(Number(event.target.value))} aria-label="Limit order oracle tolerance"><option value={50}>0.5%</option><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10% — recommended</option></select><strong>buffer</strong></span></label>
        <label><span>{side === 'buy' ? 'Execute at or below' : 'Execute at or above'}</span><span className="protected-input"><input value={trigger} onChange={(event) => onTriggerChange(event.target.value)} inputMode="decimal" aria-label="ETH trigger price" /><strong>USD</strong></span></label>
        <label><span>Expiry</span><span className="protected-input"><input value={expiryMinutes} onChange={(event) => onExpiryChange(event.target.value)} inputMode="numeric" aria-label="Limit order expiry minutes" /><strong>min</strong></span></label>
      </div>
      {connected && formError && <p className="field-error" role="alert">{formError}</p>}
      <OrderReadiness checks={createChecks} loading={readinessLoading} title="Create order readiness" />
      {connected && !operatorAuthorized && (
        <button className="secondary-action" onClick={authorizeOrderBook} disabled={Boolean(busy)}>
          {busy === 'authorize-orderbook' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Authorize OrderBook
        </button>
      )}
      {connected && operatorAuthorized && (
        <div className="operator-revoke">
          <button className="secondary-action" onClick={revokeOrderBook} disabled={Boolean(busy)}>
            {busy === 'revoke-orderbook' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Revoke OrderBook authorization
          </button>
          <p className="field-note">Revoking blocks new escrow transfers for {tokenIn.symbol}. Cancel existing open orders separately to refund their escrow.</p>
        </div>
      )}
      <button className="primary-action compact" onClick={connected ? createOrder : onConnect} disabled={connected && (Boolean(busy) || !createReady)}>
        {busy === 'create-order' ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />}
        {connected ? 'Encrypt and escrow order' : 'Connect wallet to create'}
      </button>
    </div>
  );
}
