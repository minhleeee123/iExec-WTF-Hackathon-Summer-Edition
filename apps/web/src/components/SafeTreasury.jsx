import {
  Activity,
  Ban,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import AgentStrategy from './AgentStrategy';
import { isHandle, shorten } from '../lib/format';
import { DEFAULT_LIMIT_ORDER_PROTECTION_BPS, DEFAULT_SWAP_PROTECTION_BPS, deriveLimitOrderMinOut, deriveSwapMinOut } from '../lib/min-out';

const SENTINEL = '0x0000000000000000000000000000000000000001';
const SAFE_SWAP_OUTPUTS = { cUSDC: ['cETH', 'cWBTC', 'cSOL'], cETH: ['cUSDC'], cWBTC: ['cUSDC'], cSOL: ['cUSDC'] };

export default function SafeTreasury({
  account,
  agentMarket,
  busy,
  connected,
  onCancelOrder,
  onConnect,
  onCreateOrder,
  onEnable,
  onFinalizeUnwrap,
  onGrantViewer,
  onNotice,
  onReveal,
  onRevoke,
  onSetOperator,
  onSwap,
  onUnwrap,
  safe,
  safeActivity = [],
  safeBalances,
  safeOrders,
  safePendingUnwraps = [],
  ethPrice,
  tokens,
  view = 'swap',
}) {
  const [swapTokenIn, setSwapTokenIn] = useState('cUSDC');
  const [swapTokenOut, setSwapTokenOut] = useState('cETH');
  const [swapAmount, setSwapAmount] = useState('1000');
  const [swapMinOut, setSwapMinOut] = useState('');
  const [swapProtectionBps, setSwapProtectionBps] = useState(DEFAULT_SWAP_PROTECTION_BPS);
  const [swapDeadlineMinutes, setSwapDeadlineMinutes] = useState('20');
  const [orderAmount, setOrderAmount] = useState('1000');
  const [orderMinOut, setOrderMinOut] = useState('');
  const [orderProtectionBps, setOrderProtectionBps] = useState(DEFAULT_LIMIT_ORDER_PROTECTION_BPS);
  const [orderTokenIn, setOrderTokenIn] = useState('cUSDC');
  const [orderTokenOut, setOrderTokenOut] = useState('cETH');
  const [triggerPrice, setTriggerPrice] = useState('3000');
  const [expiryHours, setExpiryHours] = useState('24');
  const [viewer, setViewer] = useState(account ?? '');
  const [viewerHandle, setViewerHandle] = useState('cUSDC');
  const [unwrapToken, setUnwrapToken] = useState('cUSDC');
  const [unwrapAmount, setUnwrapAmount] = useState('100');
  const [unwrapRecipientMode, setUnwrapRecipientMode] = useState('owner');
  const [operationMode, setOperationMode] = useState('swap');

  useEffect(() => {
    if (view === 'swap' && !['swap', 'unwrap'].includes(operationMode)) setOperationMode('swap');
    if (view === 'orders' && !['order', 'agent'].includes(operationMode)) setOperationMode('order');
  }, [operationMode, view]);

  const enabled = Boolean(safe?.moduleEnabled);
  const suggestedSwapMinOut = useMemo(() => deriveSwapMinOut({ amountIn: swapAmount, ethPrice, outputDecimals: tokens[swapTokenOut].decimals, slippageBps: swapProtectionBps, tokenIn: swapTokenIn, tokenOut: swapTokenOut }), [ethPrice, swapAmount, swapProtectionBps, swapTokenIn, swapTokenOut, tokens]);
  const suggestedOrderMinOut = useMemo(() => deriveLimitOrderMinOut({ amount: orderAmount, outputDecimals: tokens[orderTokenOut].decimals, side: orderTokenIn === 'cUSDC' ? 'buy' : 'sell', slippageBps: orderProtectionBps, triggerPrice }), [orderAmount, orderProtectionBps, orderTokenIn, orderTokenOut, triggerPrice, tokens]);
  const minOut = swapMinOut || suggestedSwapMinOut || '';
  const orderMin = orderMinOut || suggestedOrderMinOut || '';
  const viewerHandleValue = safeBalances?.[viewerHandle]?.handle;
  const canGrantViewer = isHandle(viewerHandleValue) && viewer.trim().length > 0;
  const openOrders = useMemo(() => safeOrders.filter((order) => order.status === 0), [safeOrders]);
  const swapBalance = safeBalances?.[swapTokenIn]?.decrypted;
  const orderBalance = safeBalances?.[orderTokenIn]?.decrypted;
  const unwrapBalance = safeBalances?.[unwrapToken]?.decrypted;
  const canSpendSwap = swapBalance !== null && swapBalance !== undefined && Number(swapAmount) > 0 && Number(swapAmount) <= Number(ethers.formatUnits(swapBalance, tokens[swapTokenIn].decimals));
  const canSpendOrder = orderBalance !== null && orderBalance !== undefined && Number(orderAmount) > 0 && Number(orderAmount) <= Number(ethers.formatUnits(orderBalance, tokens[orderTokenIn].decimals));
  const canUnwrap = unwrapBalance !== null && unwrapBalance !== undefined && Number(unwrapAmount) > 0 && Number(unwrapAmount) <= Number(ethers.formatUnits(unwrapBalance, tokens[unwrapToken].decimals));
  const unwrapRecipient = unwrapRecipientMode === 'safe' ? safe?.address : account;
  const validSwapProtection = Number(minOut) > 0;
  const validSwapDeadline = /^\d+$/.test(swapDeadlineMinutes) && Number(swapDeadlineMinutes) >= 1 && Number(swapDeadlineMinutes) <= 1440;
  const validOrderTerms = Number(orderMin) > 0 && Number(triggerPrice) > 0 && Number(expiryHours) >= 1;
  const safeBalancesVisible = Object.values(safeBalances).every((balance) => balance.decrypted !== null && balance.decrypted !== undefined);
  const safeAgentContext = {
    account,
    balances: safeBalances,
    busy,
    onNotice,
    onReveal,
    privateBalancesVisible: safeBalancesVisible,
  };
  const safeAgentActions = {
    applyAgentPlan: (compiled) => {
      setOrderTokenIn(compiled.tokenIn);
      setOrderTokenOut(compiled.tokenOut);
      setOrderAmount(compiled.amount);
      setTriggerPrice(String(compiled.triggerPriceUsd));
      setExpiryHours(String(Math.max(1, Math.ceil(compiled.expiryMinutes / 60))));
      setOrderProtectionBps(compiled.slippageBps);
      setOrderMinOut('');
      setOperationMode('order');
    },
  };

  return (
    <section className="safe-treasury-workspace">
      {!connected ? (
        <div className="safe-empty-state"><ShieldCheck size={22} /><strong>Connect the Safe owner wallet to continue.</strong><button className="primary-action compact" onClick={onConnect}>Connect owner wallet</button></div>
      ) : !safe?.address ? (
        <div className="safe-empty-state"><ShieldCheck size={22} /><strong>No demo Safe is configured for this network.</strong><span>Deploy a Safe and module, then add their addresses to the Sepolia deployment manifest.</span></div>
      ) : (
        <>
          {!enabled && (
            <div className="safe-recovery-banner" role="alert">
              <div><strong>Nox module is revoked</strong><span>Safe balances remain intact, but private swaps, orders, reveals and viewer grants are paused. Re-enable the allowlisted module to continue.</span></div>
              <button className="primary-action compact" onClick={onEnable} disabled={!safe.isOwner || Boolean(busy)}>{busy === 'safe-enable' ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />} Enable Nox module</button>
            </div>
          )}

          {['swap', 'orders'].includes(view) && <div className={`safe-dashboard-grid safe-dashboard-${view}`}>
            <section className="safe-operation-card safe-action-workspace">
              <div className="safe-action-header">
                <div><p className="eyebrow">PRIVATE OPERATIONS</p><h3>{view === 'swap' ? 'Swap or unwrap treasury value' : 'Create and manage Safe orders'}</h3></div>
                <div className="safe-operation-tabs" role="tablist" aria-label="Safe private operation">
                  {view === 'swap' ? (
                    <>
                      <button type="button" role="tab" aria-selected={operationMode === 'swap'} className={operationMode === 'swap' ? 'active' : ''} onClick={() => setOperationMode('swap')}>Protected swap</button>
                      <button type="button" role="tab" aria-selected={operationMode === 'unwrap'} className={operationMode === 'unwrap' ? 'active' : ''} onClick={() => setOperationMode('unwrap')}>Unwrap</button>
                    </>
                  ) : (
                    <>
                      <button type="button" role="tab" aria-selected={operationMode === 'order'} className={operationMode === 'order' ? 'active' : ''} onClick={() => setOperationMode('order')}>Limit order</button>
                      <button type="button" role="tab" aria-selected={operationMode === 'agent'} className={operationMode === 'agent' ? 'active' : ''} onClick={() => setOperationMode('agent')}>Strategy Agent</button>
                    </>
                  )}
                </div>
              </div>

              {operationMode === 'agent' ? (
                <div className="safe-agent-panel" role="tabpanel">
                  <AgentStrategy
                    actions={safeAgentActions}
                    applyLabel="Apply to Safe order"
                    context={safeAgentContext}
                    market={agentMarket}
                    wrapWarningText="Fund the required confidential asset into this Safe before creating the order."
                  />
                </div>
              ) : operationMode === 'swap' ? (
                <div className="safe-operation-panel" role="tabpanel">
                  <div className="safe-panel-intro"><ShieldCheck size={20} /><div><strong>Protected Safe swap</strong><span>Encrypted amount and protection, executed only through the allowlisted router.</span></div></div>
                  <div className="safe-form-grid">
                    <label className="safe-field safe-field-wide"><span>You encrypt</span><div className="safe-composite-input"><input value={swapAmount} onChange={(event) => { setSwapAmount(event.target.value); setSwapMinOut(''); }} inputMode="decimal" aria-label="Safe swap amount" /><select value={swapTokenIn} onChange={(event) => { const next = event.target.value; setSwapTokenIn(next); setSwapTokenOut(SAFE_SWAP_OUTPUTS[next][0]); setSwapMinOut(''); }} aria-label="Safe swap input token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}</select></div></label>
                    <label className="safe-field"><span>Receive asset</span><select value={swapTokenOut} onChange={(event) => { setSwapTokenOut(event.target.value); setSwapMinOut(''); }} aria-label="Safe swap output token">{SAFE_SWAP_OUTPUTS[swapTokenIn].map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}</select></label>
                    <label className="safe-field"><span>Encrypted minOut</span><input value={minOut} onChange={(event) => setSwapMinOut(event.target.value)} inputMode="decimal" aria-label="Safe swap minimum output" /></label>
                    <label className="safe-field"><span>Oracle tolerance</span><select value={swapProtectionBps} onChange={(event) => { setSwapProtectionBps(Number(event.target.value)); setSwapMinOut(''); }} aria-label="Safe swap oracle tolerance"><option value={50}>0.5%</option><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10% — recommended</option></select></label>
                    <label className="safe-field"><span>Deadline</span><div className="safe-suffix-input"><input value={swapDeadlineMinutes} onChange={(event) => setSwapDeadlineMinutes(event.target.value)} inputMode="numeric" aria-label="Safe swap deadline minutes" /><strong>min</strong></div></label>
                  </div>
                  {!canSpendSwap && <small className="field-error">Reveal the Safe balance and enter an amount within the available {swapTokenIn} balance.</small>}
                  {!validSwapDeadline && <small className="field-error">Deadline must be between 1 minute and 24 hours.</small>}
                  <div className="safe-submit-row"><span>Suggested minOut is {Number(swapProtectionBps) / 100}% below the Chainlink reference. Only the Safe transaction can spend treasury funds.</span><button className="primary-action compact" onClick={() => onSwap({ tokenIn: swapTokenIn, tokenOut: swapTokenOut, amount: swapAmount, minOut, deadlineMinutes: swapDeadlineMinutes })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendSwap || !validSwapProtection || !validSwapDeadline}>{busy === 'safe-swap' ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />} Execute Safe swap</button></div>
                </div>
              ) : operationMode === 'unwrap' ? (
                <div className="safe-operation-panel" role="tabpanel">
                  <div className="safe-panel-intro safe-panel-warning"><KeyRound size={20} /><div><strong>Exit confidential custody</strong><span>Unwrap burns the selected c-asset and releases its public n-asset after Nox Gateway publishes a valid decryption proof.</span></div></div>
                  <div className="safe-form-grid">
                    <label className="safe-field safe-field-wide"><span>Confidential amount</span><div className="safe-composite-input"><input value={unwrapAmount} onChange={(event) => setUnwrapAmount(event.target.value)} inputMode="decimal" aria-label="Safe unwrap amount" /><select value={unwrapToken} onChange={(event) => setUnwrapToken(event.target.value)} aria-label="Safe unwrap token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}</select></div></label>
                    <label className="safe-field safe-field-wide"><span>Public asset recipient</span><select value={unwrapRecipientMode} onChange={(event) => setUnwrapRecipientMode(event.target.value)} aria-label="Safe unwrap recipient"><option value="owner">Connected Safe owner · {account ? shorten(account, 8, 6) : 'not connected'}</option><option value="safe">Safe account · {safe?.address ? shorten(safe.address, 8, 6) : 'not configured'}</option></select></label>
                  </div>
                  {!canUnwrap && <small className="field-error">Reveal the Safe balance and enter an amount within the available {unwrapToken} balance.</small>}
                  <div className="safe-unwrap-disclosure"><strong>Privacy boundary</strong><span>The amount stays encrypted while the Safe approves the request, then becomes public when the underlying {tokens[unwrapToken].publicSymbol} is released. Expect one direct input-preparation transaction and one Safe transaction, followed by permissionless proof finalization.</span></div>
                  <div className="safe-submit-row"><span>Recipient is restricted on-chain to this Safe or one of its owners. A confirmed request remains recoverable if proof finalization is delayed.</span><button className="primary-action compact" onClick={() => onUnwrap({ token: unwrapToken, amount: unwrapAmount, recipient: unwrapRecipient })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canUnwrap || !unwrapRecipient}>{busy === 'safe-unwrap' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Request & finalize unwrap</button></div>
                  {safePendingUnwraps.length > 0 && (
                    <div className="safe-pending-unwraps">
                      <div><strong>Pending proof finalization</strong><span>These Safe requests are confirmed on-chain and can be finalized without requesting the unwrap again.</span></div>
                      {safePendingUnwraps.map((request) => (
                        <div className="safe-pending-unwrap-row" key={request.id}>
                          <span><strong>{request.tokenSymbol} unwrap</strong><small>{shorten(request.id, 12, 10)} · to {shorten(request.recipient, 8, 6)}</small></span>
                          <button className="outline-mini-button" onClick={() => onFinalizeUnwrap({ tokenSymbol: request.tokenSymbol, requestId: request.id })} disabled={Boolean(busy)}>{busy === `safe-finalize-${request.id}` ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Finalize</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="safe-operation-panel" role="tabpanel">
                  <div className="safe-panel-intro"><Plus size={20} /><div><strong>Confidential limit order</strong><span>Amount and minOut stay encrypted; trigger, expiry, pair, and Safe owner remain public.</span></div></div>
                  <div className="safe-form-grid">
                    <label className="safe-field safe-field-wide"><span>Escrow amount</span><div className="safe-composite-input"><input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} inputMode="decimal" aria-label="Safe order amount" /><select value={orderTokenIn} onChange={(event) => { const next = event.target.value; setOrderTokenIn(next); setOrderTokenOut(next === 'cUSDC' ? 'cETH' : 'cUSDC'); setOrderMinOut(''); }} aria-label="Safe order input token"><option value="cUSDC">cUSDC</option><option value="cETH">cETH</option></select></div></label>
                    <label className="safe-field"><span>Receive asset</span><select value={orderTokenOut} disabled aria-label="Safe order output token"><option value={orderTokenOut}>{orderTokenOut}</option></select></label>
                    <label className="safe-field"><span>Encrypted minOut</span><input value={orderMin} onChange={(event) => setOrderMinOut(event.target.value)} inputMode="decimal" aria-label="Safe order minimum output" /></label>
                    <label className="safe-field"><span>Order tolerance</span><select value={orderProtectionBps} onChange={(event) => { setOrderProtectionBps(Number(event.target.value)); setOrderMinOut(''); }} aria-label="Safe order oracle tolerance"><option value={50}>0.5%</option><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10% — recommended</option></select></label>
                    <label className="safe-field"><span>Trigger price</span><input value={triggerPrice} onChange={(event) => setTriggerPrice(event.target.value)} inputMode="decimal" aria-label="Safe order trigger price" /></label>
                    <label className="safe-field"><span>Expiry</span><div className="safe-suffix-input"><input value={expiryHours} onChange={(event) => setExpiryHours(event.target.value)} inputMode="numeric" aria-label="Safe order expiry in hours" /><strong>hours</strong></div></label>
                  </div>
                  {!canSpendOrder && <small className="field-error">Reveal the Safe balance and enter an amount within the available {orderTokenIn} balance.</small>}
                  <div className="safe-submit-row"><span>Escrow can be cancelled by the Safe owner before settlement.</span><button className="primary-action compact" onClick={() => onCreateOrder({ tokenIn: orderTokenIn, tokenOut: orderTokenOut, amount: orderAmount, minOut: orderMin, triggerPrice, expiryHours })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendOrder || !validOrderTerms}>{busy === 'safe-order' ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Create Safe order</button></div>
                </div>
              )}
            </section>

            {view === 'orders' && <aside className="safe-side-stack">
              <section className="safe-operation-card safe-orders-card">
                <div className="safe-card-heading"><div><p className="eyebrow">OPEN ORDERS</p><h3>Order control</h3></div><span className="safe-count-badge">{openOrders.length}</span></div>
                {openOrders.length === 0 ? <div className="safe-compact-empty"><Ban size={17} /><span>No open Safe orders.</span></div> : <div className="safe-order-list">{openOrders.map((order) => <div className="safe-order-row" key={order.id}><span><strong>Order #{order.id}</strong><small>{order.tokenIn} → {order.tokenOut} · expires {new Date(order.expiry * 1000).toLocaleString()}</small></span><button className="outline-mini-button" onClick={() => onCancelOrder(order.id)} disabled={Boolean(busy)}>{busy === `safe-cancel-${order.id}` ? <LoaderCircle className="spin" size={15} /> : <Ban size={15} />} Cancel</button></div>)}</div>}
              </section>
            </aside>}
          </div>}

          {view === 'activity' && <section className="safe-activity-panel safe-section-panel">
            <div className="safe-card-heading">
              <div><p className="eyebrow">SAFE ACTIVITY</p><h3>Treasury history</h3><p className="safe-helper">Confirmed Sepolia events only. Confidential amounts and minimum outputs remain encrypted.</p></div>
              <span className="safe-count-badge">{safeActivity.length}</span>
            </div>
            {safeActivity.length === 0 ? (
              <div className="safe-compact-empty"><Activity size={17} /><span>No Safe activity was found in the indexed block range.</span></div>
            ) : (
              <div className="safe-activity-list">
                {safeActivity.map((item) => (
                  <div className={`safe-activity-row safe-activity-${item.type}`} key={item.id}>
                    <span className="safe-activity-icon"><Activity size={15} /></span>
                    <div><strong>{item.title}</strong><small>{item.detail}</small></div>
                    <div className="safe-activity-meta"><span>{item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : `Block ${item.blockNumber}`}</span><a href={`https://sepolia.etherscan.io/tx/${item.hash}`} target="_blank" rel="noreferrer" aria-label={`View ${item.title} transaction`}>Tx <ExternalLink size={12} /></a></div>
                  </div>
                ))}
              </div>
            )}
          </section>}

          {view === 'security' && <div className="safe-security-workspace">
            <section className="safe-operation-card safe-access-card">
              <div className="safe-card-heading"><div><p className="eyebrow">AUDITOR ACCESS</p><h3>Grant a viewer</h3></div><UserRoundPlus size={19} /></div>
              <p className="safe-helper">Read-only access applies only to the selected encrypted handle and never grants spending authority.</p>
              <label className="safe-field"><span>Balance handle</span><select value={viewerHandle} onChange={(event) => setViewerHandle(event.target.value)} aria-label="Safe handle for viewer">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol} balance handle</option>)}</select></label>
              <label className="safe-field"><span>Viewer address</span><input value={viewer} onChange={(event) => setViewer(event.target.value)} placeholder="0x auditor address" aria-label="Safe auditor address" /></label>
              <button className="primary-action compact" onClick={() => onGrantViewer({ handle: viewerHandleValue, viewer })} disabled={!enabled || !safe.isOwner || !ethersAddress(viewer) || Boolean(busy) || !canGrantViewer}>{busy === 'safe-viewer' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Grant viewer via Safe</button>
            </section>
            <section className="safe-security-panel">
              <div className="safe-security-copy"><p className="eyebrow">MODULE SECURITY</p><h3>Operator access & emergency controls</h3><p>Operator authorization is token-specific. Revoking the module pauses every Nox operation but never changes Safe owners, threshold, or balances.</p></div>
              <div className="safe-operator-group"><span>Token operators</span><div>{Object.values(tokens).slice(0, 2).map((token) => <button className="outline-mini-button" key={token.symbol} onClick={() => onSetOperator(token.symbol)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === `safe-operator-${token.symbol}` ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />} Authorize {token.symbol}</button>)}</div></div>
              <div className="safe-danger-zone"><div><strong>Emergency revoke</strong><span>Requires a Safe owner recovery action to enable the module again.</span></div><button className="danger-action compact" onClick={() => onRevoke(SENTINEL)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === 'safe-revoke' ? <LoaderCircle className="spin" size={17} /> : <Ban size={17} />} Revoke module</button></div>
            </section>
          </div>}
        </>
      )}
    </section>
  );
}

function ethersAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
