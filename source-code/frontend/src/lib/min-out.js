const ROUTER_FEE_FACTOR = 0.997;
const DEFAULT_PROTECTION_FACTOR = 0.995;

function decimalString(value, decimals) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return value
    .toFixed(Math.min(decimals, 12))
    .replace(/\.?0+$/, '');
}

export function deriveSwapMinOut({ amountIn, ethPrice, outputDecimals, tokenIn, tokenOut }) {
  const amount = Number(amountIn);
  const price = Number(ethPrice);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) return '';

  let quotedOutput;
  if (tokenIn === 'cUSDC' && tokenOut === 'cETH') quotedOutput = (amount / price) * ROUTER_FEE_FACTOR;
  else if (tokenIn === 'cETH' && tokenOut === 'cUSDC') quotedOutput = amount * price * ROUTER_FEE_FACTOR;
  else return '';

  return decimalString(quotedOutput * DEFAULT_PROTECTION_FACTOR, outputDecimals);
}

export function deriveLimitOrderMinOut({ amount, outputDecimals, side, triggerPrice, slippageBps = 50 }) {
  const input = Number(amount);
  const trigger = Number(triggerPrice);
  const protection = Number(slippageBps);
  if (!Number.isFinite(input) || input <= 0 || !Number.isFinite(trigger) || trigger <= 0) return '';
  if (!Number.isInteger(protection) || protection < 10 || protection > 500) return '';

  const quotedOutput = side === 'buy'
    ? (input / trigger) * ROUTER_FEE_FACTOR
    : input * trigger * ROUTER_FEE_FACTOR;
  return decimalString(quotedOutput * (1 - protection / 10_000), outputDecimals);
}
