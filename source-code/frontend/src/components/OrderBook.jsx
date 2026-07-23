import { Check, ChevronLeft, ChevronRight, Clock3, Copy, ExternalLink, LoaderCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { useSearchParams } from 'react-router-dom';
import { selectOrders } from '../lib/order-filters.js';
import { parseOrderUrlState, serializeOrderUrlState, updateOrderUrlState } from '../lib/order-url-state.js';
import { getOrderSide } from '../lib/orders.js';
import { formatDuration, shorten } from '../lib/format';
import KeeperStatus from './KeeperStatus';
import OrderDetail from './OrderDetail';

export default function OrderBook({ account, actions, blockFetchedAt, blockTimestamp, book, busy, onConnect }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clock, setClock] = useState(() => Date.now());
  const [copiedOrderId, setCopiedOrderId] = useState(null);
  const filters = useMemo(() => parseOrderUrlState(searchParams), [searchParams]);
  const selected = filters.order ? book.orders.find((order) => Number(order.id) === filters.order) : null;
  const selectedOrders = useMemo(() => selectOrders(book.orders, filters, account), [account, book.orders, filters]);
  const chainNow = blockTimestamp + Math.max(0, Math.floor((clock - blockFetchedAt) / 1000));

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateFilters = (patch, options) => {
    const shouldResetPage = patch.page === undefined && patch.order === undefined;
    const nextPatch = shouldResetPage ? { ...patch, page: 1 } : patch;
    setSearchParams(serializeOrderUrlState(updateOrderUrlState(filters, nextPatch)), options);
  };

  const orderLink = (order) => {
    const params = serializeOrderUrlState({ ...filters, order: Number(order.id) });
    return `${window.location.origin}/app/trade?${params.toString()}`;
  };

  const copyOrder = async (order) => {
    const link = orderLink(order);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedOrderId(Number(order.id));
      window.setTimeout(() => setCopiedOrderId((current) => current === Number(order.id) ? null : current), 1800);
    } catch { /* The detail URL remains visible after selection. */ }
  };

  return (
    <div className="orders-list public-orderbook">
      <div className="orderbook-toolbar">
        <div><p className="eyebrow">ON-CHAIN ORDERBOOK</p><h2>Public execution, private terms</h2></div>
        <button className="icon-button" onClick={() => book.refresh()} disabled={book.refreshing} aria-label="Refresh orderbook" title="Refresh orderbook"><RefreshCw className={book.refreshing ? 'spin' : ''} size={18} /></button>
      </div>
      <KeeperStatus notificationsEnabled={book.notificationsEnabled} onEnableNotifications={book.enableNotifications} />

      <div className="order-filters" aria-label="Orderbook filters">
        <SlidersHorizontal size={17} />
        <label><span>Status</span><select aria-label="Order status" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
          <option value="all">All</option><option value="open">Open</option><option value="executable">Executable</option><option value="expired">Expired</option><option value="executed">Executed</option><option value="cancelled">Cancelled</option><option value="oracle-unavailable">Oracle unavailable</option>
        </select></label>
        <label><span>Owner</span><select aria-label="Order owner" value={filters.owner} onChange={(event) => updateFilters({ owner: event.target.value })}>
          <option value="all">All orders</option><option value="mine" disabled={!account}>My orders</option>
        </select></label>
        <label><span>Side</span><select aria-label="Order side" value={filters.side} onChange={(event) => updateFilters({ side: event.target.value })}>
          <option value="all">All</option><option value="buy">Buy ETH</option><option value="sell">Sell ETH</option>
        </select></label>
        <label><span>Sort</span><select aria-label="Order sort" value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value })}>
          <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="expiry">Expiring soon</option><option value="trigger">Trigger low to high</option>
        </select></label>
      </div>

      {book.loading ? <div className="orderbook-state"><LoaderCircle className="spin" size={20} /> Loading live orders</div> : book.error ? (
        <div className="orderbook-state error-state"><strong>RPC orderbook unavailable</strong><span>{book.error}</span><button className="outline-mini-button" onClick={() => book.refresh()}>Retry</button></div>
      ) : selectedOrders.total === 0 ? (
        <div className="orderbook-state"><Clock3 size={20} /><strong>No orders match these filters.</strong><span>Change a filter or create a real confidential order.</span></div>
      ) : (
        <div className="public-orders-table" role="table" aria-label="Public confidential orders">
          {selectedOrders.items.map((order) => {
            const side = getOrderSide(order.tokenIn);
            const remaining = Math.max(0, order.expiry - chainNow);
            return (
              <div className="public-order-row" key={order.id} role="row">
                <button className="order-row-open" onClick={() => updateFilters({ order: Number(order.id) })} aria-label={`Open order ${order.id} details`} />
                <span className="order-identity"><strong>#{order.id} · {side === 'buy' ? 'Buy ETH' : 'Sell ETH'}</strong><small>{shorten(order.owner, 8, 6)}</small></span>
                <span><strong>{order.tokenIn} → {order.tokenOut}</strong><small>{side === 'buy' ? 'At or below' : 'At or above'} ${Number(ethers.formatUnits(order.triggerPrice, 8)).toLocaleString()}</small></span>
                <span><strong>{remaining > 0 ? formatDuration(remaining) : 'Time passed'}</strong><small>{new Date(order.expiry * 1000).toLocaleString()}</small></span>
                <code title={`${order.amountHandle} / ${order.minOutHandle}`}>{shorten(order.amountHandle, 9, 7)}</code>
                <span className={`order-status status-${order.state}`}>{order.stateLabel}</span>
                <span className="order-row-links">
                  <button onClick={() => copyOrder(order)} aria-label={copiedOrderId === Number(order.id) ? `Order ${order.id} link copied` : `Copy link for order ${order.id}`} title={copiedOrderId === Number(order.id) ? 'Copied' : 'Copy order link'}>{copiedOrderId === Number(order.id) ? <Check size={15} /> : <Copy size={15} />}</button>
                  {order.createdTransactionHash && <a href={`https://sepolia.etherscan.io/tx/${order.createdTransactionHash}`} target="_blank" rel="noreferrer" aria-label={`Open order ${order.id} creation transaction`}><ExternalLink size={15} /></a>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {book.partialErrors.length > 0 && <p className="partial-error" title={book.partialErrors.join('\n')}>{book.partialErrors.length} partial read issue{book.partialErrors.length === 1 ? '' : 's'}. Healthy orders remain visible.</p>}
      <div className="order-pagination">
        <span>{selectedOrders.total} order{selectedOrders.total === 1 ? '' : 's'} · page {selectedOrders.page} of {selectedOrders.pageCount}</span>
        <div>
          <button className="icon-button" onClick={() => updateFilters({ page: selectedOrders.page - 1 })} disabled={selectedOrders.page <= 1} aria-label="Previous order page"><ChevronLeft size={17} /></button>
          <button className="icon-button" onClick={() => updateFilters({ page: selectedOrders.page + 1 })} disabled={selectedOrders.page >= selectedOrders.pageCount} aria-label="Next order page"><ChevronRight size={17} /></button>
        </div>
      </div>

      {filters.order && !selected && !book.loading && <div className="orderbook-state error-state"><strong>Order #{filters.order} is unavailable.</strong><button className="outline-mini-button" onClick={() => updateFilters({ order: null }, { replace: true })}>Close</button></div>}
      {selected && <OrderDetail account={account} actions={actions} blockTimestamp={chainNow} busy={busy} onClose={() => updateFilters({ order: null })} onConnect={onConnect} onCopy={() => copyOrder(selected)} oracle={book.oracle} order={selected} />}
    </div>
  );
}
