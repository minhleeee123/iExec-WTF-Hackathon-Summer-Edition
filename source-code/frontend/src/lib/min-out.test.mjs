import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveLimitOrderMinOut, deriveSwapMinOut } from './min-out.js';

test('derives a protected USDC to ETH minimum from Chainlink', () => {
  const result = deriveSwapMinOut({
    amountIn: '100',
    ethPrice: 2_000,
    outputDecimals: 18,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  });
  assert.equal(result, '0.04960075');
});

test('derives protected limit-order minimums in both directions', () => {
  assert.equal(deriveLimitOrderMinOut({ amount: '100', outputDecimals: 18, side: 'buy', triggerPrice: '2000' }), '0.04960075');
  assert.equal(deriveLimitOrderMinOut({ amount: '0.05', outputDecimals: 6, side: 'sell', triggerPrice: '2000' }), '99.2015');
});

test('does not invent a quote for unsupported pairs or invalid input', () => {
  assert.equal(deriveSwapMinOut({ amountIn: '1', ethPrice: 2_000, outputDecimals: 6, tokenIn: 'cWBTC', tokenOut: 'cUSDC' }), '');
  assert.equal(deriveLimitOrderMinOut({ amount: '', outputDecimals: 18, side: 'buy', triggerPrice: '2000' }), '');
});
