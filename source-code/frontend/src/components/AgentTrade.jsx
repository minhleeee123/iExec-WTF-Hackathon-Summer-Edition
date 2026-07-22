import useLimitOrderActions from '../hooks/useLimitOrderActions.js';
import AgentStrategy from './AgentStrategy.jsx';
import LimitOrderForm from './LimitOrderForm.jsx';

export default function AgentTrade({ context }) {
  const market = context.agentMarket;
  const actions = useLimitOrderActions({
    ...context,
    blockTimestamp: market.blockTimestamp,
    bookError: market.available ? '' : 'Public market context is unavailable.',
    onRefreshOrders: async () => {},
    oracle: {
      available: market.available,
      price: market.ethPriceUsd,
      updatedAt: market.oracleUpdatedAt,
      error: market.available ? '' : 'Chainlink ETH/USD is unavailable.',
    },
  });

  return (
    <section className="agent-workflow">
      <div className="embedded-intro">
        <div><p className="eyebrow">INTENT-BASED CONFIDENTIAL TRADE</p><h2>Strategy Agent</h2></div>
        <p>Groq translates natural language into a reviewable order draft. Nox encrypts the final terms locally and MetaMask remains the only transaction authority.</p>
      </div>
      <div className="agent-layout">
        <AgentStrategy actions={actions} context={context} market={market} />
        <LimitOrderForm
          actions={actions}
          busy={context.busy}
          connected={Boolean(context.account)}
          onConnect={context.onConnect}
          onReveal={context.onReveal}
          privateBalancesVisible={context.privateBalancesVisible}
        />
      </div>
    </section>
  );
}
