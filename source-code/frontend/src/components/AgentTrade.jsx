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
          category="AI STRATEGY AGENT GUIDE"
          title="Strategy Agent & Confidential Orders"
          description="Use natural language to draft confidential order parameters with Groq AI, then escrow encrypted orders on Sepolia."
          steps={[
            { heading: 'Step 1 - Gas Fee', detail: 'Creating orders requires Sepolia ETH for gas (claim free Sepolia ETH if low). Execution gas is paid by automated keepers.' },
            { heading: 'Step 2 - Generate AI Draft', detail: 'Type a trading intent (e.g. "Sell 0.01 cETH when ETH reaches $2,500") and click "Generate private strategy draft".' },
            { heading: 'Step 3 - Apply & Authorize', detail: 'Click "Apply to order form". Authorize OrderBook once for tokenIn if required.' },
            { heading: 'Step 4 - Escrow Order', detail: 'Click "Escrow confidential order" to deposit encrypted tokens on-chain. MetaMask remains the sole transaction authority.' },
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
          hideHelp
          onConnect={context.onConnect}
          onReveal={context.onReveal}
          privateBalancesVisible={context.privateBalancesVisible}
        />
      </div>
    </section>
  );
}
