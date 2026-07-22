import { Clock3, LoaderCircle, Play, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { formatToken, shorten } from '../lib/format';

const STATUS = ['Open', 'Executed', 'Cancelled', 'Expired'];

export default function LimitOrders({
  amount,
  available,
  busy,
  chainNow,
  connected,
  error,
  expiryMinutes,
  embedded = false,
  minOut,
  onAmountChange,
  onCancel,
  onCreate,
  onExecute,
  onExpire,
  onExpiryChange,
  onMax,
  onMinOutChange,
  onReveal,
  onSideChange,
  onTriggerChange,
  orders,
  privateBalancesVisible,
  side,
  tokens,
  trigger,
}) {
  const tokenIn = side === 'buy' ? tokens.cUSDC : tokens.cETH;
  const tokenOut = side === 'buy' ? tokens.cETH : tokens.cUSDC;
  const availableText = privateBalancesVisible && available !== null
    ? `${formatToken(available, tokenIn.decimals)} ${tokenIn.symbol}`
    : 'Private balance hidden';

  return (
    <section id="orders" className={`section-band orders-band${embedded ? ' embedded-workflow' : ''}`}>
      {!embedded && <div className="section-title"><div><p className="eyebrow">CHAINLINK-TRIGGERED ESCROW</p><h2>Confidential limit orders</h2></div><p>Order amount and minOut remain encrypted. ETH/USD trigger, expiry, and order status are public so any keeper can execute an eligible order.</p></div>}
      {embedded && <div className="embedded-intro"><div><p className="eyebrow">CHAINLINK-TRIGGERED ESCROW</p><h2>Confidential limit order</h2></div><p>Amount and minOut stay encrypted. Trigger, expiry, and status remain public for permissionless execution.</p></div>}
      <div className="orders-layout">
        <div className="order-form">
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
            <label><span>Encrypted minOut</span><span className="protected-input"><input value={minOut} onChange={(event) => onMinOutChange(event.target.value)} inputMode="decimal" aria-label="Limit order minimum output" /><strong>{tokenOut.symbol}</strong></span></label>
            <label><span>{side === 'buy' ? 'Execute at or below' : 'Execute at or above'}</span><span className="protected-input"><input value={trigger} onChange={(event) => onTriggerChange(event.target.value)} inputMode="decimal" aria-label="ETH trigger price" /><strong>USD</strong></span></label>
            <label><span>Expiry</span><span className="protected-input"><input value={expiryMinutes} onChange={(event) => onExpiryChange(event.target.value)} inputMode="numeric" aria-label="Limit order expiry minutes" /><strong>min</strong></span></label>
          </div>
          {connected && error && <p className="field-error" role="alert">{error}</p>}
          <button className="primary-action compact" onClick={onCreate} disabled={!connected || Boolean(busy) || Boolean(error)}>
            {busy === 'create-order' ? <LoaderCircle className="spin" size={18} /> : <ShieldCheck size={18} />} Encrypt and escrow order
          </button>
        </div>

        <div className="orders-list">
          <div className="section-heading"><div><p className="eyebrow">ON-CHAIN ORDER BOOK</p><h2>My orders</h2></div><Clock3 size={20} /></div>
          {orders.length === 0 ? <p className="empty-state">No confidential orders found for this wallet.</p> : orders.map((order) => {
            const status = STATUS[order.status] ?? 'Unknown';
            const expired = order.status === 0 && chainNow > order.expiry;
            return (
              <div className="order-item" key={order.id}>
                <div><strong>Order #{order.id}</strong><small>{order.tokenIn} → {order.tokenOut}</small></div>
                <div><span>${Number(ethers.formatUnits(order.triggerPrice, 8)).toLocaleString()}</span><small>{order.tokenIn === 'cUSDC' ? 'at or below' : 'at or above'} · {new Date(order.expiry * 1000).toLocaleTimeString()}</small></div>
                <code title={order.amountHandle}>{shorten(order.amountHandle, 10, 8)}</code>
                <span className={`order-status status-${status.toLowerCase()}`}>{expired ? 'Expired' : status}</span>
                {order.status === 0 && (
                  <div className="order-actions">
                    {expired
                      ? <button className="icon-button" onClick={() => onExpire(order.id)} disabled={Boolean(busy)} aria-label={`Refund expired order ${order.id}`} title="Refund expired order"><RotateCcw size={16} /></button>
                      : <button className="icon-button" onClick={() => onExecute(order.id)} disabled={Boolean(busy)} aria-label={`Execute order ${order.id}`} title="Execute eligible order"><Play size={16} /></button>}
                    <button className="icon-button" onClick={() => onCancel(order.id)} disabled={Boolean(busy)} aria-label={`Cancel order ${order.id}`} title="Cancel and refund"><XCircle size={16} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
