import {
  Activity,
  ArrowDown,
  Ban,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AgentStrategy from './AgentStrategy';
import { formatToken, isHandle, shorten } from '../lib/format';
import { DEFAULT_LIMIT_ORDER_PROTECTION_BPS, DEFAULT_SWAP_PROTECTION_BPS, deriveLimitOrderMinOut, deriveSwapMinOut } from '../lib/min-out';
import { validateMinimumOutput, validateTokenAmount } from '../lib/validation';
import { CardHelpButton } from './CardHelpModal';

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

  const selectOperation = (nextMode) => {
    setOperationMode(nextMode);
    window.requestAnimationFrame(() => document.getElementById(`safe-operation-tab-${nextMode}`)?.focus());
  };
  const handleOperationKey = (event, options) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = options.indexOf(operationMode);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? options.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
    selectOperation(options[next]);
  };

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
  const swapAmountValidation = validateTokenAmount(swapAmount, tokens[swapTokenIn].decimals, swapBalance ?? null);
  const swapMinOutValidation = validateMinimumOutput(minOut, tokens[swapTokenOut].decimals);
  const orderAmountValidation = validateTokenAmount(orderAmount, tokens[orderTokenIn].decimals, orderBalance ?? null);
  const orderMinOutValidation = validateMinimumOutput(orderMin, tokens[orderTokenOut].decimals);
  const unwrapAmountValidation = validateTokenAmount(unwrapAmount, tokens[unwrapToken].decimals, unwrapBalance ?? null);
  const canSpendSwap = !swapAmountValidation.error;
  const canSpendOrder = !orderAmountValidation.error;
  const canUnwrap = !unwrapAmountValidation.error;
  const swapAvailable = swapBalance !== null && swapBalance !== undefined ? `${formatToken(swapBalance, tokens[swapTokenIn].decimals)} ${swapTokenIn}` : 'Private balance hidden';
  const orderAvailable = orderBalance !== null && orderBalance !== undefined ? `${formatToken(orderBalance, tokens[orderTokenIn].decimals)} ${orderTokenIn}` : 'Private balance hidden';
  const unwrapAvailable = unwrapBalance !== null && unwrapBalance !== undefined ? `${formatToken(unwrapBalance, tokens[unwrapToken].decimals)} ${unwrapToken}` : 'Private balance hidden';
  const unwrapRecipient = unwrapRecipientMode === 'safe' ? safe?.address : account;
  const validSwapProtection = !swapMinOutValidation.error;
  const validSwapDeadline = /^\d+$/.test(swapDeadlineMinutes) && Number(swapDeadlineMinutes) >= 1 && Number(swapDeadlineMinutes) <= 1440;
  const validOrderTerms = !orderMinOutValidation.error && Number(triggerPrice) > 0 && Number(expiryHours) >= 1;
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

          {view === 'swap' && (
            <section className="swap-panel safe-swap-panel">
              <div className="section-heading">
                <div><p className="eyebrow">ALLOWLISTED SAFE ROUTER</p><h2>{operationMode === 'swap' ? 'Protected confidential swap' : 'Unwrap treasury assets'}</h2></div>
                <CardHelpButton
                  category="SAFE TREASURY GUIDE"
                  title="Safe-Owned Confidential Assets"
                  description="The connected owner reviews and signs, while the Safe remains the owner of every confidential asset and only the allowlisted Nox module can route operations."
                  steps={[
                    { heading: 'Reveal treasury balance', detail: 'Reveal is owner-authorized session state and never transfers funds.' },
                    { heading: 'Review private terms', detail: 'Swap amount and minOut remain encrypted; unwrap becomes public only when the underlying asset is released.' },
                    { heading: 'Approve Safe execution', detail: 'Input preparation cannot spend funds. The Safe transaction is the final spending authority.' },
                  ]}
                />
              </div>
              <div className="segmented safe-operation-tabs" role="tablist" aria-label="Safe private operation">
                <button id="safe-operation-tab-swap" type="button" role="tab" aria-selected={operationMode === 'swap'} aria-controls="safe-operation-panel-swap" tabIndex={operationMode === 'swap' ? 0 : -1} className={operationMode === 'swap' ? 'active' : ''} onKeyDown={(event) => handleOperationKey(event, ['swap', 'unwrap'])} onClick={() => selectOperation('swap')}>Protected swap</button>
                <button id="safe-operation-tab-unwrap" type="button" role="tab" aria-selected={operationMode === 'unwrap'} aria-controls="safe-operation-panel-unwrap" tabIndex={operationMode === 'unwrap' ? 0 : -1} className={operationMode === 'unwrap' ? 'active' : ''} onKeyDown={(event) => handleOperationKey(event, ['swap', 'unwrap'])} onClick={() => selectOperation('unwrap')}>Unwrap</button>
              </div>

              {operationMode === 'swap' ? (
                <div className="safe-native-operation" id="safe-operation-panel-swap" role="tabpanel" aria-labelledby="safe-operation-tab-swap">
                  <div className="amount-box">
                    <div className="amount-meta"><span>You encrypt</span><span className="available-inline">{swapAvailable}{swapBalance !== null && swapBalance !== undefined ? <button className="text-button" onClick={() => setSwapAmount(formatToken(swapBalance, tokens[swapTokenIn].decimals))}>Max</button> : <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>}</span></div>
                    <div className="amount-row"><input value={swapAmount} onChange={(event) => { setSwapAmount(event.target.value); setSwapMinOut(''); }} inputMode="decimal" aria-label="Safe swap amount" /><select value={swapTokenIn} onChange={(event) => { const next = event.target.value; setSwapTokenIn(next); setSwapTokenOut(SAFE_SWAP_OUTPUTS[next][0]); setSwapMinOut(''); }} aria-label="Safe swap input token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}</select></div>
                  </div>
                  <div className="direction-row"><span className="direction-btn safe-direction-static" aria-hidden="true"><ArrowDown size={18} /></span></div>
                  <div className="amount-box output">
                    <div className="amount-meta"><span>Protected output</span><span>Chainlink reference · encrypted pool</span></div>
                    <div className="amount-row"><strong>{suggestedSwapMinOut || '--'}</strong><select value={swapTokenOut} onChange={(event) => { setSwapTokenOut(event.target.value); setSwapMinOut(''); }} aria-label="Safe swap output token">{SAFE_SWAP_OUTPUTS[swapTokenIn].map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}</select></div>
                  </div>
                  <div className="protection-grid safe-protection-grid">
                    <label><span>Encrypted minimum received</span><span className="protected-input"><input value={minOut} onChange={(event) => setSwapMinOut(event.target.value)} inputMode="decimal" aria-label="Safe swap minimum output" /><strong>{swapTokenOut}</strong></span></label>
                    <label><span>Oracle tolerance</span><span className="protected-input"><select value={swapProtectionBps} onChange={(event) => { setSwapProtectionBps(Number(event.target.value)); setSwapMinOut(''); }} aria-label="Safe swap oracle tolerance"><option value={50}>0.5%</option><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10% — recommended</option></select><strong>buffer</strong></span></label>
                    <label><span>Deadline</span><span className="protected-input"><input value={swapDeadlineMinutes} onChange={(event) => setSwapDeadlineMinutes(event.target.value)} inputMode="numeric" aria-label="Safe swap deadline minutes" /><strong>min</strong></span></label>
                  </div>
                  <p className="field-note">Suggested minOut is {Number(swapProtectionBps) / 100}% below the Chainlink reference. Only the reviewed Safe transaction can spend treasury funds.</p>
                  {!canSpendSwap && <p className="field-error">{swapAmountValidation.error}</p>}
                  {!validSwapProtection && <p className="field-error">{swapMinOutValidation.error}</p>}
                  {!validSwapDeadline && <p className="field-error">Deadline must be between 1 minute and 24 hours.</p>}
                  <button className="primary-action" onClick={() => onSwap({ tokenIn: swapTokenIn, tokenOut: swapTokenOut, amount: swapAmount, minOut, deadlineMinutes: swapDeadlineMinutes })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendSwap || !validSwapProtection || !validSwapDeadline}>{busy === 'safe-swap' ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />} Encrypt & execute Safe swap</button>
                  <div className="contract-strip"><span>Safe {shorten(safe.address, 8, 6)}</span><span>Restricted Nox module</span><span>Owner-reviewed execution</span></div>
                </div>
              ) : (
                <div className="safe-native-operation safe-unwrap-operation" id="safe-operation-panel-unwrap" role="tabpanel" aria-labelledby="safe-operation-tab-unwrap">
                  <div className="available-row"><span>Available</span><strong>{unwrapAvailable}</strong>{unwrapBalance !== null && unwrapBalance !== undefined ? <button className="text-button" onClick={() => setUnwrapAmount(formatToken(unwrapBalance, tokens[unwrapToken].decimals))}>Max</button> : <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>}</div>
                  <div className="inline-fields"><input value={unwrapAmount} onChange={(event) => setUnwrapAmount(event.target.value)} inputMode="decimal" aria-label="Safe unwrap amount" /><select value={unwrapToken} onChange={(event) => setUnwrapToken(event.target.value)} aria-label="Safe unwrap token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}</select></div>
                  <label className="safe-native-field"><span>Public asset recipient</span><select value={unwrapRecipientMode} onChange={(event) => setUnwrapRecipientMode(event.target.value)} aria-label="Safe unwrap recipient"><option value="owner">Connected Safe owner · {account ? shorten(account, 8, 6) : 'not connected'}</option><option value="safe">Safe account · {safe?.address ? shorten(safe.address, 8, 6) : 'not configured'}</option></select></label>
                  {!canUnwrap && <p className="field-error">{unwrapAmountValidation.error}</p>}
                  <div className="safe-unwrap-disclosure"><strong>Privacy boundary</strong><span>The amount remains encrypted through Safe approval, then becomes public when {tokens[unwrapToken].publicSymbol} is released. Input preparation cannot spend treasury funds.</span></div>
                  <p className="field-note">The recipient is restricted on-chain to this Safe or one of its owners. Confirmed requests remain recoverable if proof finalization is delayed.</p>
                  <button className="primary-action" onClick={() => onUnwrap({ token: unwrapToken, amount: unwrapAmount, recipient: unwrapRecipient })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canUnwrap || !unwrapRecipient}>{busy === 'safe-unwrap' ? <LoaderCircle className="spin" size={19} /> : <KeyRound size={19} />} Request & finalize unwrap</button>
                  {safePendingUnwraps.length > 0 && (
                    <div className="safe-pending-unwraps">
                      <div><strong>Pending proof finalization</strong><span>Confirmed requests can be retried without signing a second unwrap.</span></div>
                      {safePendingUnwraps.map((request) => (
                        <div className="safe-pending-unwrap-row" key={request.id}><span><strong>{request.tokenSymbol} unwrap</strong><small>{shorten(request.id, 12, 10)} · to {shorten(request.recipient, 8, 6)}</small></span><button className="outline-mini-button" onClick={() => onFinalizeUnwrap({ tokenSymbol: request.tokenSymbol, requestId: request.id })} disabled={Boolean(busy)}>{busy === `safe-finalize-${request.id}` ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Finalize</button></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {view === 'orders' && (
            <section className="safe-orders-workflow">
              <div className="embedded-intro safe-orders-intro">
                <div><p className="eyebrow">CHAINLINK-TRIGGERED SAFE ESCROW</p><h2>Confidential limit orders</h2></div>
                <div className="segmented safe-operation-tabs" role="tablist" aria-label="Safe private operation"><button id="safe-operation-tab-order" type="button" role="tab" aria-selected={operationMode === 'order'} aria-controls="safe-operation-panel-order" tabIndex={operationMode === 'order' ? 0 : -1} className={operationMode === 'order' ? 'active' : ''} onKeyDown={(event) => handleOperationKey(event, ['order', 'agent'])} onClick={() => selectOperation('order')}>Limit order</button><button id="safe-operation-tab-agent" type="button" role="tab" aria-selected={operationMode === 'agent'} aria-controls="safe-operation-panel-agent" tabIndex={operationMode === 'agent' ? 0 : -1} className={operationMode === 'agent' ? 'active' : ''} onKeyDown={(event) => handleOperationKey(event, ['order', 'agent'])} onClick={() => selectOperation('agent')}>Strategy Agent</button></div>
              </div>
              <div className="orders-layout safe-orders-layout">
                {operationMode === 'agent' ? (
                  <div id="safe-operation-panel-agent" role="tabpanel" aria-labelledby="safe-operation-tab-agent"><AgentStrategy actions={safeAgentActions} applyLabel="Apply to Safe order" context={safeAgentContext} market={agentMarket} wrapWarningText="Fund the required confidential asset into this Safe before creating the order." /></div>
                ) : (
                  <div className="order-form public-order-form safe-order-form" id="safe-operation-panel-order" role="tabpanel" aria-labelledby="safe-operation-tab-order">
                    <div className="section-heading compact-heading"><div><p className="eyebrow">CREATE SAFE ORDER</p><h2>Private terms, public trigger</h2></div><ShieldCheck size={20} /></div>
                    <div className="available-row"><span>Available</span><strong>{orderAvailable}</strong>{orderBalance !== null && orderBalance !== undefined ? <button className="text-button" onClick={() => setOrderAmount(formatToken(orderBalance, tokens[orderTokenIn].decimals))}>Max</button> : <button className="text-button" onClick={onReveal} disabled={Boolean(busy)}>Reveal</button>}</div>
                    <div className="order-fields">
                      <label><span>Encrypted amount</span><span className="protected-input"><input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} inputMode="decimal" aria-label="Safe order amount" /><select value={orderTokenIn} onChange={(event) => { const next = event.target.value; setOrderTokenIn(next); setOrderTokenOut(next === 'cUSDC' ? 'cETH' : 'cUSDC'); setOrderMinOut(''); }} aria-label="Safe order input token"><option value="cUSDC">cUSDC</option><option value="cETH">cETH</option></select></span></label>
                      <label><span>Encrypted minOut</span><span className="protected-input"><input value={orderMin} onChange={(event) => setOrderMinOut(event.target.value)} inputMode="decimal" aria-label="Safe order minimum output" /><strong>{orderTokenOut}</strong></span></label>
                      <label><span>Oracle tolerance</span><span className="protected-input"><select value={orderProtectionBps} onChange={(event) => { setOrderProtectionBps(Number(event.target.value)); setOrderMinOut(''); }} aria-label="Safe order oracle tolerance"><option value={50}>0.5%</option><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10% — recommended</option></select><strong>buffer</strong></span></label>
                      <label><span>{orderTokenIn === 'cUSDC' ? 'Execute at or below' : 'Execute at or above'}</span><span className="protected-input"><input value={triggerPrice} onChange={(event) => setTriggerPrice(event.target.value)} inputMode="decimal" aria-label="Safe order trigger price" /><strong>USD</strong></span></label>
                      <label><span>Expiry</span><span className="protected-input"><input value={expiryHours} onChange={(event) => setExpiryHours(event.target.value)} inputMode="numeric" aria-label="Safe order expiry in hours" /><strong>hours</strong></span></label>
                    </div>
                    {!canSpendOrder && <p className="field-error">{orderAmountValidation.error}</p>}
                    {orderMinOutValidation.error && <p className="field-error">{orderMinOutValidation.error}</p>}
                    <p className="field-note">The Safe escrows encrypted input through the allowlisted module. The owner can cancel before permissionless settlement.</p>
                    <button className="primary-action compact" onClick={() => onCreateOrder({ tokenIn: orderTokenIn, tokenOut: orderTokenOut, amount: orderAmount, minOut: orderMin, triggerPrice, expiryHours })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendOrder || !validOrderTerms}>{busy === 'safe-order' ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />} Encrypt and escrow Safe order</button>
                  </div>
                )}
                <section className="orders-list safe-orders-card">
                  <div className="section-heading compact-heading"><div><p className="eyebrow">OPEN SAFE ORDERS</p><h2>Order control</h2></div><span className="safe-count-badge">{openOrders.length}</span></div>
                  {openOrders.length === 0 ? <p className="empty-state">No open Safe orders.</p> : <div className="safe-order-list">{openOrders.map((order) => <div className="safe-order-row" key={order.id}><span><strong>Order #{order.id}</strong><small>{order.tokenIn} → {order.tokenOut} · expires {new Date(order.expiry * 1000).toLocaleString()}</small></span><button className="outline-mini-button" onClick={() => onCancelOrder(order.id)} disabled={Boolean(busy)}>{busy === `safe-cancel-${order.id}` ? <LoaderCircle className="spin" size={15} /> : <Ban size={15} />} Cancel</button></div>)}</div>}
                </section>
              </div>
            </section>
          )}

          {view === 'activity' && <div className="activity-grid safe-activity-grid">
            <section className="history-panel">
              <div className="section-heading"><div><p className="eyebrow">ON-CHAIN SAFE EVENTS</p><h2>Treasury history</h2></div><span className="safe-count-badge">{safeActivity.length}</span></div>
              {safeActivity.length === 0 ? <p className="empty-state">No Safe activity was found in the indexed block range.</p> : <div className="safe-activity-list">{safeActivity.map((item) => <div className={`safe-activity-row safe-activity-${item.type}`} key={item.id}><span className="safe-activity-icon"><Activity size={15} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><div className="safe-activity-meta"><span>{item.timestamp ? new Date(item.timestamp * 1000).toLocaleString() : `Block ${item.blockNumber}`}</span><a href={`https://sepolia.etherscan.io/tx/${item.hash}`} target="_blank" rel="noreferrer" aria-label={`View ${item.title} transaction`}>Tx <ExternalLink size={12} /></a></div></div>)}</div>}
            </section>
            <aside className="log-panel safe-activity-context">
              <div className="section-heading"><div><p className="eyebrow">PRIVACY BOUNDARY</p><h2>What this history reveals</h2></div><ShieldCheck size={20} /></div>
              <div className="safe-context-list"><div><strong>Public</strong><span>Operation type, Safe address, token pair, block and transaction hash.</span></div><div><strong>Encrypted</strong><span>Swap amount, order amount, minimum output and confidential balances.</span></div><div><strong>Recovery</strong><span>{safePendingUnwraps.length} confirmed unwrap request{safePendingUnwraps.length === 1 ? '' : 's'} waiting for proof finalization.</span></div></div>
            </aside>
          </div>}

          {view === 'security' && <div className="safe-access-workflow">
            <div className="embedded-intro"><div><p className="eyebrow">SELECTIVE DISCLOSURE</p><h2>Access & emergency controls</h2></div><p>Viewer access is handle-specific; module and operator authority remain explicit Safe owner actions.</p></div>
            <div className="safe-security-workspace">
            <section className="order-form safe-access-card">
              <div className="section-heading compact-heading"><div><p className="eyebrow">AUDITOR ACCESS</p><h2>Grant a viewer</h2></div><UserRoundPlus size={19} /></div>
              <p className="safe-helper">Read-only access applies only to the selected encrypted handle and never grants spending authority.</p>
              <label className="safe-field"><span>Balance handle</span><select value={viewerHandle} onChange={(event) => setViewerHandle(event.target.value)} aria-label="Safe handle for viewer">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol} balance handle</option>)}</select></label>
              <label className="safe-field"><span>Viewer address</span><input value={viewer} onChange={(event) => setViewer(event.target.value)} placeholder="0x auditor address" aria-label="Safe auditor address" /></label>
              <button className="primary-action compact" onClick={() => onGrantViewer({ handle: viewerHandleValue, viewer })} disabled={!enabled || !safe.isOwner || !isEthereumAddress(viewer) || Boolean(busy) || !canGrantViewer}>{busy === 'safe-viewer' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Grant viewer via Safe</button>
            </section>
            <section className="orders-list safe-security-panel">
              <div className="safe-security-copy"><p className="eyebrow">MODULE SECURITY</p><h2>Operator access & emergency controls</h2><p>Operator authorization is token-specific. Revoking the module pauses every Nox operation but never changes Safe owners, threshold, or balances.</p></div>
              <div className="safe-operator-group"><span>Token operators</span><div>{Object.values(tokens).slice(0, 2).map((token) => <button className="outline-mini-button" key={token.symbol} onClick={() => onSetOperator(token.symbol)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === `safe-operator-${token.symbol}` ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />} Authorize {token.symbol}</button>)}</div></div>
              <div className="safe-danger-zone"><div><strong>Emergency revoke</strong><span>Requires a Safe owner recovery action to enable the module again.</span></div><button className="danger-action compact" onClick={() => onRevoke(SENTINEL)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === 'safe-revoke' ? <LoaderCircle className="spin" size={17} /> : <Ban size={17} />} Revoke module</button></div>
            </section>
            </div>
          </div>}
        </>
      )}
    </section>
  );
}

function isEthereumAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
