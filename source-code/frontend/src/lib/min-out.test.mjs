import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveLimitOrderMinOut, deriveSwapMinOut } from './min-out.js';

test('derives a protected USDC to ETH minimum with the default five-percent oracle tolerance', () => {
  const result = deriveSwapMinOut({
    amountIn: '100',
    ethPrice: 2_000,
    outputDecimals: 18,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  });
  assert.equal(result, '0.0473575');
});

test('keeps the reported 1,000 cUSDC regression below the current encrypted-pool output', () => {
  const result = deriveSwapMinOut({
    amountIn: '1000',
    ethPrice: 1_921.6,
    outputDecimals: 18,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  });
  assert(Number(result) < 0.49669838285348444);
  assert.equal(deriveSwapMinOut({
    amountIn: '1000',
    ethPrice: 1_921.6,
    outputDecimals: 18,
    slippageBps: 50,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  }), '0.516244275604');
});

test('derives protected limit-order minimums with the default five-percent tolerance', () => {
  assert.equal(deriveLimitOrderMinOut({ amount: '100', outputDecimals: 18, side: 'buy', triggerPrice: '2000' }), '0.0473575');
  assert.equal(deriveLimitOrderMinOut({ amount: '0.05', outputDecimals: 6, side: 'sell', triggerPrice: '2000' }), '94.715');
  assert.equal(deriveLimitOrderMinOut({ amount: '100', outputDecimals: 18, side: 'buy', triggerPrice: '2000', slippageBps: 100 }), '0.0493515');
});

test('keeps the current 1,000 cUSDC limit-order regression below the encrypted-pool output', () => {
  const minimum = deriveLimitOrderMinOut({ amount: '1000', outputDecimals: 18, side: 'buy', triggerPrice: '1921.6' });
  assert(Number(minimum) < 0.49669838285348444);
});

test('does not invent a quote for unsupported pairs or invalid input', () => {
  assert.equal(deriveSwapMinOut({ amountIn: '1', ethPrice: 2_000, outputDecimals: 6, tokenIn: 'cWBTC', tokenOut: 'cUSDC' }), '');
  assert.equal(deriveSwapMinOut({ amountIn: '1', ethPrice: 2_000, outputDecimals: 18, slippageBps: 0, tokenIn: 'cUSDC', tokenOut: 'cETH' }), '');
  assert.equal(deriveLimitOrderMinOut({ amount: '', outputDecimals: 18, side: 'buy', triggerPrice: '2000' }), '');
});
