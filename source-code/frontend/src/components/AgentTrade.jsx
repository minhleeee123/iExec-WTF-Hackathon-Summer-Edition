import useLimitOrderActions from '../hooks/useLimitOrderActions.js';
import AgentStrategy from './AgentStrategy.jsx';
import { CardHelpButton } from './CardHelpModal.jsx';
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
        <CardHelpButton
          category="AI AGENT GUIDE"
          title="Strategy Agent Co-Pilot"
          description="Use natural language to draft confidential swap or limit order parameters powered by Groq LLM & Chainlink."
          steps={[
            { heading: 'Step 1 - Type Intent', detail: 'Type a natural language prompt like "Swap 10 cUSDC to cETH when price is favorable".' },
            { heading: 'Step 2 - Review Draft', detail: 'The AI processes public Chainlink context and drafts parameters locally.' },
            { heading: 'Step 3 - Gas Fee & Wallet', detail: 'Ensure your wallet has Sepolia ETH for gas. MetaMask remains the sole transaction authority.' },
          ]}
        />
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
