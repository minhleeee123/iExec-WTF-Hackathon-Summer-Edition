import { formatUnits } from 'ethers';
import { normalizeAgentPlan } from './agent-plan.js';

const AGENT_TOKENS = Object.freeze({
  cUSDC: { symbol: 'cUSDC', decimals: 6 },
  cETH: { symbol: 'cETH', decimals: 18 },
});

function percentageOf(value, percentage) {
  const [whole, fraction = ''] = percentage.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole}${fraction}`);
  return (value * numerator) / (100n * scale);
}

export function compileAgentPlan(value, { balances, privateBalancesVisible }) {
  const plan = normalizeAgentPlan(value);
  if (!plan.supported) throw new Error(plan.unsupportedReason);

  const tokenIn = plan.side === 'buy' ? AGENT_TOKENS.cUSDC : AGENT_TOKENS.cETH;
  const tokenOut = plan.side === 'buy' ? AGENT_TOKENS.cETH : AGENT_TOKENS.cUSDC;
  let amount = plan.amountValue;

  if (plan.amountMode === 'percent') {
    const privateBalance = balances?.[tokenIn.symbol]?.decrypted;
    if (!privateBalancesVisible || typeof privateBalance !== 'bigint') {
      throw new Error(`Reveal the ${tokenIn.symbol} balance before applying a percentage strategy.`);
    }
    const amountUnits = percentageOf(privateBalance, plan.amountValue);
    if (amountUnits <= 0n) throw new Error('This percentage is smaller than the token precision allows.');
    amount = formatUnits(amountUnits, tokenIn.decimals);
  }

  return Object.freeze({
    ...plan,
    amount,
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
  });
}
