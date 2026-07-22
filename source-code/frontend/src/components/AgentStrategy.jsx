import { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, Check, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { compileAgentPlan } from '../lib/agent-compile.js';

const EXAMPLES = [
  'Buy cETH with 20% of my cUSDC if ETH falls 3%. Expire in one day.',
  'Sell 0.01 cETH when ETH reaches $2,500 with 1% slippage. Expire in 6 hours.',
];

function readError(payload, status) {
  if (payload?.error?.code === 'AGENT_RATE_LIMITED' || status === 429) {
    const wait = payload?.error?.retryAfter;
    return wait ? `Groq rate limit reached. Retry in about ${wait} seconds.` : 'Groq rate limit reached. Retry shortly.';
  }
  return payload?.error?.message || 'The strategy agent is temporarily unavailable.';
}

export default function AgentStrategy({ actions, context, market }) {
  const [intent, setIntent] = useState('');
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const marketReady = market.available && Number.isFinite(market.ethPriceUsd) && market.blockTimestamp > 0;
  const applyIssue = useMemo(() => {
    if (!plan?.supported) return plan?.unsupportedReason || '';
    if (plan?.amountMode === 'percent' && !context.privateBalancesVisible) {
      return 'Reveal private balances locally before applying this percentage strategy.';
    }
    return '';
  }, [context.privateBalancesVisible, plan]);

  const generate = async () => {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const response = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          market: {
            ethPriceUsd: market.ethPriceUsd,
            oracleUpdatedAt: market.oracleUpdatedAt,
            blockTimestamp: market.blockTimestamp,
          },
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readError(payload, response.status));
      setPlan(payload.plan);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    try {
      const compiled = compileAgentPlan(plan, context);
      actions.applyAgentPlan(compiled);
      context.onNotice({
        type: 'success',
        text: 'Strategy applied to the order form. Review every field before signing.',
      });
    } catch (compileError) {
      setError(compileError.message);
    }
  };

  return (
    <div className="agent-strategy">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow">GROQ STRATEGY DRAFT</p><h2>Describe your intent</h2></div>
        <span className="agent-provider"><BrainCircuit size={15} /> GPT-OSS 20B</span>
      </div>

      <div className="agent-privacy-note">
        <ShieldCheck size={17} />
        <span><strong>Privacy boundary</strong> Groq receives this prompt and public oracle context. NoxSwap never sends your wallet address, balance, handles, proof, or signature.</span>
      </div>

      <label className="agent-intent-field">
        <span>Trading intent</span>
        <textarea
          aria-label="Trading intent"
          maxLength={600}
          placeholder="Buy cETH with 20% of my cUSDC if ETH falls 3%. Expire in one day."
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
        />
        <small>{intent.length}/600</small>
      </label>

      <div className="agent-examples" aria-label="Example intents">
        {EXAMPLES.map((example) => <button type="button" key={example} onClick={() => setIntent(example)}>{example}</button>)}
      </div>

      <div className="agent-market-context">
        <span>PUBLIC CONTEXT</span>
        <strong>{marketReady ? `$${market.ethPriceUsd.toLocaleString()} ETH/USD` : 'Oracle unavailable'}</strong>
        <small>{marketReady ? `Chain time ${new Date(market.blockTimestamp * 1000).toLocaleTimeString()}` : 'Refresh Sepolia reads before planning'}</small>
      </div>

      {error && <p className="field-error agent-error" role="alert">{error}</p>}
      <button className="primary-action compact" onClick={generate} disabled={loading || intent.trim().length < 8 || !marketReady}>
        {loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
        {loading ? 'Drafting strategy' : 'Generate private strategy draft'}
      </button>

      {plan && (
        <div className={`agent-plan${plan.supported ? '' : ' unsupported'}`}>
          <div className="agent-plan-heading">
            {plan.supported ? <Check size={18} /> : <AlertTriangle size={18} />}
            <div><span>{plan.supported ? 'DRAFT READY' : 'UNSUPPORTED INTENT'}</span><strong>{plan.supported ? plan.summary : plan.unsupportedReason}</strong></div>
          </div>
          {plan.supported && (
            <>
              <dl className="agent-plan-grid">
                <div><dt>Side</dt><dd>{plan.side === 'buy' ? 'Buy ETH' : 'Sell ETH'}</dd></div>
                <div><dt>Amount</dt><dd>{plan.amountValue}{plan.amountMode === 'percent' ? '%' : ` ${plan.side === 'buy' ? 'cUSDC' : 'cETH'}`}</dd></div>
                <div><dt>Trigger</dt><dd>${plan.triggerPriceUsd}</dd></div>
                <div><dt>Slippage</dt><dd>{plan.slippageBps / 100}%</dd></div>
                <div><dt>Expiry</dt><dd>{plan.expiryMinutes} min</dd></div>
                <div><dt>Wrap first</dt><dd>{plan.requiresWrap ? 'Required' : 'No'}</dd></div>
              </dl>
              <p className="agent-risk"><AlertTriangle size={14} /> {plan.riskNote}</p>
              {plan.requiresWrap && <p className="agent-wrap-warning">Wrap the underlying asset in Wallet before creating this order.</p>}
              {applyIssue && <p className="field-error agent-apply-issue">{applyIssue}</p>}
              {plan.amountMode === 'percent' && !context.privateBalancesVisible && context.account && (
                <button className="secondary-action" onClick={context.onReveal} disabled={Boolean(context.busy)}><ShieldCheck size={17} /> Reveal balances locally</button>
              )}
              <button className="secondary-action agent-apply" onClick={apply} disabled={Boolean(applyIssue)}>
                <Check size={17} /> Apply to order form
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
