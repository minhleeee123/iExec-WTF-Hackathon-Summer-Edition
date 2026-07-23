import {
  Ban,
  Eye,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
} from 'lucide-react';
import { ethers } from 'ethers';
import { useMemo, useState } from 'react';
import { formatToken, isHandle, shorten } from '../lib/format';
import { deriveLimitOrderMinOut, deriveSwapMinOut } from '../lib/min-out';

const SENTINEL = '0x0000000000000000000000000000000000000001';
const SAFE_SWAP_OUTPUTS = { cUSDC: ['cETH', 'cWBTC', 'cSOL'], cETH: ['cUSDC'], cWBTC: ['cUSDC'], cSOL: ['cUSDC'] };

export default function SafeTreasury({
  account,
  busy,
  connected,
  onCancelOrder,
  onConnect,
  onCreateOrder,
  onFund,
  onGrantViewer,
  onRefresh,
  onReveal,
  onRevoke,
  onSetOperator,
  onSwap,
  safe,
  safeBalances,
  safeOrders,
  ethPrice,
  tokens,
}) {
  const [swapTokenIn, setSwapTokenIn] = useState('cUSDC');
  const [swapTokenOut, setSwapTokenOut] = useState('cETH');
  const [swapAmount, setSwapAmount] = useState('1000');
  const [swapMinOut, setSwapMinOut] = useState('');
  const [orderAmount, setOrderAmount] = useState('1000');
  const [orderMinOut, setOrderMinOut] = useState('');
  const [orderTokenIn, setOrderTokenIn] = useState('cUSDC');
  const [orderTokenOut, setOrderTokenOut] = useState('cETH');
  const [triggerPrice, setTriggerPrice] = useState('3000');
  const [expiryHours, setExpiryHours] = useState('24');
  const [viewer, setViewer] = useState(account ?? '');
  const [viewerHandle, setViewerHandle] = useState('cUSDC');
  const [fundToken, setFundToken] = useState('cUSDC');
  const [fundAmount, setFundAmount] = useState('1000');

  const enabled = Boolean(safe?.moduleEnabled);
  const suggestedSwapMinOut = useMemo(() => deriveSwapMinOut({ amountIn: swapAmount, ethPrice, outputDecimals: tokens[swapTokenOut].decimals, tokenIn: swapTokenIn, tokenOut: swapTokenOut }), [ethPrice, swapAmount, swapTokenIn, swapTokenOut, tokens]);
  const suggestedOrderMinOut = useMemo(() => deriveLimitOrderMinOut({ amount: orderAmount, outputDecimals: tokens[orderTokenOut].decimals, side: orderTokenIn === 'cUSDC' ? 'buy' : 'sell', triggerPrice }), [orderAmount, orderTokenIn, orderTokenOut, triggerPrice, tokens]);
  const minOut = swapMinOut || suggestedSwapMinOut || '';
  const orderMin = orderMinOut || suggestedOrderMinOut || '';
  const viewerHandleValue = safeBalances?.[viewerHandle]?.handle;
  const canGrantViewer = isHandle(viewerHandleValue) && viewer.trim().length > 0;
  const openOrders = useMemo(() => safeOrders.filter((order) => order.status === 0), [safeOrders]);
  const swapBalance = safeBalances?.[swapTokenIn]?.decrypted;
  const orderBalance = safeBalances?.[orderTokenIn]?.decrypted;
  const canSpendSwap = swapBalance !== null && swapBalance !== undefined && Number(swapAmount) > 0 && Number(swapAmount) <= Number(ethers.formatUnits(swapBalance, tokens[swapTokenIn].decimals));
  const canSpendOrder = orderBalance !== null && orderBalance !== undefined && Number(orderAmount) > 0 && Number(orderAmount) <= Number(ethers.formatUnits(orderBalance, tokens[orderTokenIn].decimals));
  const validSwapProtection = Number(minOut) > 0;
  const validOrderTerms = Number(orderMin) > 0 && Number(triggerPrice) > 0 && Number(expiryHours) >= 1;

  return (
    <section className="section-band safe-treasury-band">
      <div className="section-title safe-heading">
        <div>
          <p className="eyebrow">SAFE TREASURY · NOX COMPOSABILITY</p>
          <h2>Private operations under Safe control</h2>
        </div>
        <div className="safe-heading-actions">
          <button className="icon-button" onClick={onRefresh} disabled={Boolean(busy)} aria-label="Refresh Safe treasury" title="Refresh Safe treasury"><RefreshCw className={busy === 'safe-refresh' ? 'spin' : ''} size={17} /></button>
          {safe?.address && <a className="text-button" href={`https://sepolia.etherscan.io/address/${safe.address}`} target="_blank" rel="noreferrer">Safe <ExternalLink size={13} /></a>}
        </div>
        <p>The Safe remains the owner of every encrypted balance. NoxSafeModule is allowlisted to route only swaps, orders, operators, viewers, and revoke operations.</p>
      </div>

      {!connected ? (
        <div className="safe-empty-state"><ShieldCheck size={22} /><strong>Connect the Safe owner wallet to continue.</strong><button className="primary-action compact" onClick={onConnect}>Connect owner wallet</button></div>
      ) : !safe?.address ? (
        <div className="safe-empty-state"><ShieldCheck size={22} /><strong>No demo Safe is configured for this network.</strong><span>Deploy a Safe and module, then add their addresses to the Sepolia deployment manifest.</span></div>
      ) : (
        <>
          <div className="safe-status-grid">
            <div><span>Safe address</span><strong>{shorten(safe.address, 10, 8)}</strong></div>
            <div><span>Owners / threshold</span><strong>{safe.owners?.length ?? '—'} / {safe.threshold ?? '—'}</strong></div>
            <div><span>Module</span><strong className={enabled ? 'status-good' : 'status-bad'}>{enabled ? 'Enabled' : 'Revoked'}</strong></div>
            <div><span>Connected signer</span><strong className={safe.isOwner ? 'status-good' : 'status-bad'}>{safe.isOwner ? 'Safe owner' : 'Not an owner'}</strong></div>
          </div>

          <div className="safe-balance-card">
            <div className="safe-card-heading"><div><p className="eyebrow">01 · SAFE BALANCE REVEAL</p><h3>Encrypted treasury balances</h3></div><button className="primary-action compact" onClick={onReveal} disabled={!enabled || Boolean(busy) || !safe.isOwner}>{busy === 'safe-reveal' ? <LoaderCircle className="spin" size={17} /> : <Eye size={17} />} Reveal Safe balances</button></div>
            <p className="safe-helper">Reveal grants the connected Safe owner viewer access through a Safe transaction. Plaintext remains in this browser session only.</p>
            <div className="safe-balance-grid">{Object.values(tokens).map((token) => {
              const balance = safeBalances?.[token.symbol] ?? {};
              return <div className="safe-balance-row" key={token.symbol}><div><strong>{token.symbol}</strong><small>{isHandle(balance.handle) ? shorten(balance.handle, 10, 7) : 'No initialized handle'}</small></div><span>{balance.decrypted === null || balance.decrypted === undefined ? '••••••' : formatToken(balance.decrypted, token.decimals)}</span></div>;
            })}</div>
            <div className="safe-fund-row"><span>Fund Safe from your public test balance</span><input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} inputMode="decimal" aria-label="Safe funding amount" /><select value={fundToken} onChange={(event) => setFundToken(event.target.value)} aria-label="Safe funding token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.publicSymbol}</option>)}</select><button className="outline-mini-button" onClick={() => onFund({ token: fundToken, amount: fundAmount })} disabled={!safe.isOwner || Boolean(busy)}>{busy === 'safe-fund' ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Wrap to Safe</button></div>
          </div>

          <div className="safe-operation-grid">
            <div className="safe-operation-card">
              <div className="safe-card-heading"><div><p className="eyebrow">02 · SAFE PRIVATE SWAP</p><h3>Swap from treasury</h3></div><ShieldCheck size={19} /></div>
              <div className="inline-fields"><input value={swapAmount} onChange={(event) => { setSwapAmount(event.target.value); setSwapMinOut(''); }} inputMode="decimal" aria-label="Safe swap amount" /><select value={swapTokenIn} onChange={(event) => { const next = event.target.value; setSwapTokenIn(next); setSwapTokenOut(SAFE_SWAP_OUTPUTS[next][0]); setSwapMinOut(''); }} aria-label="Safe swap input token">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol}</option>)}</select></div>
              <div className="inline-fields"><select value={swapTokenOut} onChange={(event) => { setSwapTokenOut(event.target.value); setSwapMinOut(''); }} aria-label="Safe swap output token">{SAFE_SWAP_OUTPUTS[swapTokenIn].map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}</select><input value={minOut} onChange={(event) => setSwapMinOut(event.target.value)} placeholder="Encrypted minOut" inputMode="decimal" aria-label="Safe swap minimum output" /></div>
              <button className="primary-action compact" onClick={() => onSwap({ tokenIn: swapTokenIn, tokenOut: swapTokenOut, amount: swapAmount, minOut })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendSwap || !validSwapProtection}>{busy === 'safe-swap' ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />} Execute Safe swap</button>
              {!canSpendSwap && <small className="field-error">Reveal the Safe balance and enter an amount within the available {swapTokenIn} balance.</small>}
              <small className="safe-helper">The owner prepares ciphertext ACLs for the allowlisted router; only the Safe transaction can spend treasury funds.</small>
            </div>

            <div className="safe-operation-card">
              <div className="safe-card-heading"><div><p className="eyebrow">03 · SAFE LIMIT ORDER</p><h3>Create private order</h3></div><Plus size={19} /></div>
              <div className="inline-fields"><input value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} inputMode="decimal" aria-label="Safe order amount" /><select value={orderTokenIn} onChange={(event) => { const next = event.target.value; setOrderTokenIn(next); setOrderTokenOut(next === 'cUSDC' ? 'cETH' : 'cUSDC'); setOrderMinOut(''); }} aria-label="Safe order input token"><option value="cUSDC">cUSDC</option><option value="cETH">cETH</option></select></div>
              <div className="inline-fields"><select value={orderTokenOut} disabled aria-label="Safe order output token"><option value={orderTokenOut}>{orderTokenOut}</option></select><input value={orderMin} onChange={(event) => setOrderMinOut(event.target.value)} placeholder="Encrypted minOut" inputMode="decimal" aria-label="Safe order minimum output" /></div>
              <div className="inline-fields"><input value={triggerPrice} onChange={(event) => setTriggerPrice(event.target.value)} inputMode="decimal" aria-label="Safe order trigger price" /><input value={expiryHours} onChange={(event) => setExpiryHours(event.target.value)} inputMode="numeric" aria-label="Safe order expiry in hours" /></div>
              <button className="primary-action compact" onClick={() => onCreateOrder({ tokenIn: orderTokenIn, tokenOut: orderTokenOut, amount: orderAmount, minOut: orderMin, triggerPrice, expiryHours })} disabled={!enabled || !safe.isOwner || Boolean(busy) || !canSpendOrder || !validOrderTerms}>{busy === 'safe-order' ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} Create Safe order</button>
              {!canSpendOrder && <small className="field-error">Reveal the Safe balance and enter an amount within the available {orderTokenIn} balance.</small>}
              <small className="safe-helper">Terms stay encrypted; only token pair, trigger, expiry, and Safe owner are public.</small>
            </div>
          </div>

          <div className="safe-operation-card safe-orders-card">
            <div className="safe-card-heading"><div><p className="eyebrow">04 · SAFE ORDER CONTROL</p><h3>Cancel an open Safe order</h3></div><Ban size={19} /></div>
            {openOrders.length === 0 ? <p className="safe-helper">No open orders owned by this Safe were found.</p> : <div className="safe-order-list">{openOrders.map((order) => <div className="safe-order-row" key={order.id}><span><strong>Order #{order.id}</strong><small>{order.tokenIn} → {order.tokenOut} · expires {new Date(order.expiry * 1000).toLocaleString()}</small></span><button className="outline-mini-button" onClick={() => onCancelOrder(order.id)} disabled={Boolean(busy)}>{busy === `safe-cancel-${order.id}` ? <LoaderCircle className="spin" size={15} /> : <Ban size={15} />} Cancel</button></div>)}</div>}
          </div>

          <div className="safe-operation-grid">
            <div className="safe-operation-card">
              <div className="safe-card-heading"><div><p className="eyebrow">05 · AUDITOR ACCESS</p><h3>Grant a read-only viewer</h3></div><UserRoundPlus size={19} /></div>
              <select value={viewerHandle} onChange={(event) => setViewerHandle(event.target.value)} aria-label="Safe handle for viewer">{Object.values(tokens).map((token) => <option key={token.symbol} value={token.symbol}>{token.symbol} balance handle</option>)}</select>
              <input value={viewer} onChange={(event) => setViewer(event.target.value)} placeholder="0x auditor address" aria-label="Safe auditor address" />
              <button className="primary-action compact" onClick={() => onGrantViewer({ handle: viewerHandleValue, viewer })} disabled={!enabled || !safe.isOwner || !ethersAddress(viewer) || Boolean(busy) || !canGrantViewer}>{busy === 'safe-viewer' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Grant viewer via Safe</button>
              <small className="safe-helper">Viewer access is limited to the selected handle. It does not grant spend or transaction authority.</small>
            </div>
            <div className="safe-operation-card">
              <div className="safe-card-heading"><div><p className="eyebrow">06 · MODULE SECURITY</p><h3>Operator access & revoke</h3></div><Ban size={19} /></div>
              <p className="safe-helper">Authorize only the router or order book for a token. Revoke disables the Nox module from this Safe; the Safe owner threshold remains unchanged.</p>
              <div className="safe-security-actions">{Object.values(tokens).slice(0, 2).map((token) => <button className="outline-mini-button" key={token.symbol} onClick={() => onSetOperator(token.symbol)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === `safe-operator-${token.symbol}` ? <LoaderCircle className="spin" size={15} /> : <ShieldCheck size={15} />} Authorize {token.symbol}</button>)}<button className="danger-action compact" onClick={() => onRevoke(SENTINEL)} disabled={!enabled || !safe.isOwner || Boolean(busy)}>{busy === 'safe-revoke' ? <LoaderCircle className="spin" size={17} /> : <Ban size={17} />} Revoke module</button></div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ethersAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
