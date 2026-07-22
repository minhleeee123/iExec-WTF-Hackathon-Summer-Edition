import { useSearchParams } from 'react-router-dom';
import AgentTrade from '../components/AgentTrade';
import LimitOrders from '../components/LimitOrders';
import PageHeading from '../components/PageHeading';
import SwapPanel from '../components/SwapPanel';

export default function TradePage({ orderContext, swapProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode');
  const mode = ['orders', 'agent'].includes(requestedMode) ? requestedMode : 'swap';

  const selectMode = (nextMode) => {
    setSearchParams(nextMode === 'swap' ? {} : { mode: nextMode }, { replace: true });
  };

  return (
    <main className="app-page trade-page">
      <PageHeading eyebrow="CONFIDENTIAL EXECUTION" title="Trade" description="Choose an immediate protected swap, escrow a private limit order, or draft one from natural language." aside={<><strong>3 encrypted pools</strong><span>Nox · Chainlink · Groq</span></>} />
      <div className="workflow-shell">
        <div className="workflow-tabs" role="tablist" aria-label="Trade mode">
          <button role="tab" aria-selected={mode === 'swap'} className={mode === 'swap' ? 'active' : ''} onClick={() => selectMode('swap')}>Protected swap</button>
          <button role="tab" aria-selected={mode === 'orders'} className={mode === 'orders' ? 'active' : ''} onClick={() => selectMode('orders')}>Limit orders</button>
          <button role="tab" aria-selected={mode === 'agent'} className={mode === 'agent' ? 'active' : ''} onClick={() => selectMode('agent')}>Strategy Agent</button>
        </div>
        <div className="workflow-content">
          {mode === 'swap' && <SwapPanel {...swapProps} />}
          {mode === 'orders' && <LimitOrders context={orderContext} embedded />}
          {mode === 'agent' && <AgentTrade context={orderContext} />}
        </div>
      </div>
    </main>
  );
}
