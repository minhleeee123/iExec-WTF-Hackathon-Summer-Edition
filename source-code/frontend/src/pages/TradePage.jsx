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
    window.requestAnimationFrame(() => document.getElementById(`trade-tab-${nextMode}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['swap', 'orders', 'agent'];
    const current = tabs.indexOf(mode);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectMode(tabs[next]);
  };

  return (
    <main className="app-page trade-page">
      <PageHeading eyebrow="CONFIDENTIAL EXECUTION" title="Trade" description="Choose an immediate protected swap, escrow a private limit order, or draft one from natural language." aside={<><strong>3 encrypted pools</strong><span>Nox · Chainlink · Groq</span></>} />
      <div className="workflow-shell">
        <div className="workflow-tabs" role="tablist" aria-label="Trade mode">
          <button id="trade-tab-swap" role="tab" aria-selected={mode === 'swap'} aria-controls="trade-panel-swap" tabIndex={mode === 'swap' ? 0 : -1} className={mode === 'swap' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectMode('swap')}>Protected swap</button>
          <button id="trade-tab-orders" role="tab" aria-selected={mode === 'orders'} aria-controls="trade-panel-orders" tabIndex={mode === 'orders' ? 0 : -1} className={mode === 'orders' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectMode('orders')}>Limit orders</button>
          <button id="trade-tab-agent" role="tab" aria-selected={mode === 'agent'} aria-controls="trade-panel-agent" tabIndex={mode === 'agent' ? 0 : -1} className={mode === 'agent' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectMode('agent')}>Strategy Agent</button>
        </div>
        <div className="workflow-content" role="tabpanel" id={`trade-panel-${mode}`} aria-labelledby={`trade-tab-${mode}`} tabIndex="0">
          {mode === 'swap' && <SwapPanel {...swapProps} />}
          {mode === 'orders' && <LimitOrders context={orderContext} embedded />}
          {mode === 'agent' && <AgentTrade context={orderContext} />}
        </div>
      </div>
    </main>
  );
}
