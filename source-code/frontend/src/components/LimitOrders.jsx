import { useCallback } from 'react';
import useLimitOrderActions from '../hooks/useLimitOrderActions';
import useLimitOrderBook from '../hooks/useLimitOrderBook';
import LimitOrderForm from './LimitOrderForm';
import OrderBook from './OrderBook';

export default function LimitOrders({ context, embedded = false }) {
  const { onNotice } = context;
  const notifyChange = useCallback((message) => onNotice({ type: 'info', text: message }), [onNotice]);
  const book = useLimitOrderBook({ account: context.account, onOrderChange: notifyChange });
  const actions = useLimitOrderActions({
    ...context,
    blockTimestamp: book.blockTimestamp,
    bookError: book.error,
    onRefreshOrders: book.refresh,
    oracle: book.oracle,
  });

  return (
    <section id="orders" className={`section-band orders-band${embedded ? ' embedded-workflow' : ''}`}>
      <div className="embedded-intro"><div><p className="eyebrow">CHAINLINK-TRIGGERED ESCROW</p><h2>Confidential limit orders</h2></div><p>Public triggers coordinate permissionless execution while amount and minOut remain owner-authorized Nox handles.</p></div>
      <div className="orders-layout public-orders-layout">
        <LimitOrderForm actions={actions} busy={context.busy} connected={Boolean(context.account)} onConnect={context.onConnect} onReveal={context.onReveal} privateBalancesVisible={context.privateBalancesVisible} />
        <OrderBook account={context.account} actions={actions} blockFetchedAt={book.blockFetchedAt} blockTimestamp={book.blockTimestamp} book={book} busy={context.busy} onConnect={context.onConnect} />
      </div>
    </section>
  );
}
