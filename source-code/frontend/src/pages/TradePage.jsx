import { useSearchParams } from 'react-router-dom';
import LimitOrders from '../components/LimitOrders';
import PageHeading from '../components/PageHeading';
import SwapPanel from '../components/SwapPanel';

export default function TradePage({ orderContext, swapProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'orders' ? 'orders' : 'swap';

  const selectMode = (nextMode) => {
    setSearchParams(nextMode === 'orders' ? { mode: 'orders' } : {}, { replace: true });
  };

  return (
    <main className="app-page trade-page">
      <PageHeading eyebrow="CONFIDENTIAL EXECUTION" title="Trade" description="Choose an immediate protected swap or escrow a private limit order." aside={<><strong>3 encrypted pools</strong><span>Router V2 · Chainlink</span></>} />
      <div className="workflow-shell">
        <div className="workflow-tabs" role="tablist" aria-label="Trade mode">
          <button role="tab" aria-selected={mode === 'swap'} className={mode === 'swap' ? 'active' : ''} onClick={() => selectMode('swap')}>Protected swap</button>
          <button role="tab" aria-selected={mode === 'orders'} className={mode === 'orders' ? 'active' : ''} onClick={() => selectMode('orders')}>Limit orders</button>
        </div>
        <div className="workflow-content">
          {mode === 'swap' ? <SwapPanel {...swapProps} /> : <LimitOrders context={orderContext} embedded />}
        </div>
      </div>
    </main>
  );
}
