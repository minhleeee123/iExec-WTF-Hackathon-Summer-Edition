import { Copy, ExternalLink, Eye, LoaderCircle, Play, RotateCcw, X, XCircle } from 'lucide-react';
import { ethers } from 'ethers';
import { useState } from 'react';
import { formatDuration, shorten } from '../lib/format';
import { getOrderPermissions, getOrderSide } from '../lib/orders.js';
import OrderReadiness from './OrderReadiness';

function Fact({ label, children }) {
  return <div className="order-fact"><span>{label}</span><strong>{children}</strong></div>;
}

export default function OrderDetail({ account, actions, blockTimestamp, busy, onClose, onConnect, onCopy, oracle, order }) {
  const permissions = getOrderPermissions({ account, contractStatus: order.contractStatus, owner: order.owner, state: order.state });
  const remaining = Math.max(0, order.expiry - blockTimestamp);
  const side = getOrderSide(order.tokenIn);
  const terms = actions.revealedTerms[order.id];
  const availableActions = [
    permissions.canExecute && 'execute',
    permissions.canExpire && 'expire',
    permissions.canCancel && 'cancel',
  ].filter(Boolean);
  const [actionChoice, setActionChoice] = useState(null);
  const selectedAction = availableActions.includes(actionChoice) ? actionChoice : availableActions[0] ?? null;

  const checks = selectedAction ? actions.actionChecks(order, selectedAction) : [];
  const actionReady = checks.length > 0 && checks.every((check) => check.pass);
  const actionDetails = {
    execute: { icon: Play, label: 'Execute order', busyKey: `execute-order-${order.id}`, className: 'primary-action compact' },
    expire: { icon: RotateCcw, label: 'Expire and refund', busyKey: `expire-order-${order.id}`, className: 'primary-action compact' },
    cancel: { icon: XCircle, label: 'Cancel order', busyKey: `cancel-order-${order.id}`, className: 'secondary-action danger-action' },
  };
  const selectedDetails = selectedAction ? actionDetails[selectedAction] : null;
  const SelectedIcon = selectedDetails?.icon;

  return (
    <div className="order-detail-backdrop" onMouseDown={onClose} role="presentation">
      <aside className="order-detail-drawer" role="dialog" aria-modal="true" aria-label={`Order ${order.id} details`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-heading">
          <div><p className="eyebrow">PUBLIC ORDER #{order.id}</p><h2>{side === 'buy' ? 'Buy ETH' : 'Sell ETH'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close order details"><X size={18} /></button>
        </div>

        <div className="detail-status-row">
          <span className={`order-status status-${order.state}`}>{order.stateLabel}</span>
          <button className="outline-mini-button" onClick={onCopy}><Copy size={14} /> Copy link</button>
        </div>
        <p className="detail-disclaimer">Trigger readiness means the order can be called. Encrypted minOut can still reject settlement and confidentially refund the owner.</p>
        {order.readinessError && <p className="partial-error">Readiness RPC unavailable: {order.readinessError}</p>}

        <div className="order-facts-grid">
          <Fact label="Owner">{shorten(order.owner, 10, 8)}</Fact>
          <Fact label="Pair">{order.tokenIn} → {order.tokenOut}</Fact>
          <Fact label="Trigger">{side === 'buy' ? 'At or below' : 'At or above'} ${Number(ethers.formatUnits(order.triggerPrice, 8)).toLocaleString()}</Fact>
          <Fact label="Chainlink now">{oracle.available ? `$${oracle.price.toLocaleString()}` : 'Unavailable'}</Fact>
          <Fact label="Expiry">{remaining > 0 ? `${formatDuration(remaining)} remaining` : 'Passed'}</Fact>
          <Fact label="Caller">{permissions.isOwner ? 'Owner' : account ? 'Permissionless executor' : 'Read only'}</Fact>
        </div>

        <div className="handle-list">
          <div><span>Encrypted amount</span><code title={order.amountHandle}>{shorten(order.amountHandle, 16, 12)}</code></div>
          <div><span>Encrypted minOut</span><code title={order.minOutHandle}>{shorten(order.minOutHandle, 16, 12)}</code></div>
        </div>

        {terms && <div className="revealed-terms"><span>Owner-authorized session plaintext</span><strong>{terms.amount}</strong><strong>Minimum {terms.minOut}</strong></div>}
        {permissions.canReveal && !terms && (
          <button className="secondary-action" onClick={() => actions.revealOrderTerms(order)} disabled={Boolean(busy)}>
            {busy === `reveal-order-${order.id}` ? <LoaderCircle className="spin" size={17} /> : <Eye size={17} />} Reveal my order terms
          </button>
        )}

        <div className="detail-links">
          {order.createdTransactionHash && <a href={`https://sepolia.etherscan.io/tx/${order.createdTransactionHash}`} target="_blank" rel="noreferrer">Creation transaction <ExternalLink size={14} /></a>}
          {order.terminalTransactionHash && <a href={`https://sepolia.etherscan.io/tx/${order.terminalTransactionHash}`} target="_blank" rel="noreferrer">Settlement transaction <ExternalLink size={14} /></a>}
        </div>

        {!account && ['executable', 'expired'].includes(order.state) && <button className="primary-action compact" onClick={onConnect}>Connect wallet to act</button>}
        {availableActions.length > 1 && <div className="segmented detail-action-selector" role="group" aria-label="Order transaction action">
          {availableActions.map((action) => <button className={selectedAction === action ? 'active' : ''} key={action} onClick={() => setActionChoice(action)}>{action === 'execute' ? 'Execute' : action === 'expire' ? 'Expire' : 'Cancel'}</button>)}
        </div>}
        {selectedAction && <OrderReadiness checks={checks} title={`${selectedAction[0].toUpperCase()}${selectedAction.slice(1)} readiness`} />}
        {selectedDetails && <div className="detail-actions">
          <button className={selectedDetails.className} onClick={() => actions.settleOrder(order, selectedAction)} disabled={Boolean(busy) || !actionReady}>
            {busy === selectedDetails.busyKey ? <LoaderCircle className="spin" size={17} /> : <SelectedIcon size={17} />} {selectedDetails.label}
          </button>
        </div>}
      </aside>
    </div>
  );
}
