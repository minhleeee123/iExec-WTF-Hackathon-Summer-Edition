import assert from 'node:assert/strict';
import test from 'node:test';
import { compileAgentPlan } from './agent-compile.js';

const plan = {
  version: 1,
  supported: true,
  unsupportedReason: '',
  action: 'limit_order',
  side: 'buy',
  amountMode: 'percent',
  amountValue: '12.5',
  triggerPriceUsd: '1900',
  slippageBps: 75,
  expiryMinutes: 1440,
  requiresWrap: false,
  summary: 'Buy cETH with 12.5% of cUSDC at $1,900.',
  riskNote: 'Execution depends on oracle freshness and pool liquidity.',
};

test('compiles a percentage intent from session-only private balance state', () => {
  const compiled = compileAgentPlan(plan, {
    balances: { cUSDC: { decrypted: 1_000_000_000n } },
    privateBalancesVisible: true,
  });
  assert.equal(compiled.amount, '125.0');
  assert.equal(compiled.tokenIn, 'cUSDC');
  assert.equal(compiled.tokenOut, 'cETH');
});

test('does not compile a percentage intent before local balance reveal', () => {
  assert.throws(
    () => compileAgentPlan(plan, { balances: {}, privateBalancesVisible: false }),
    /Reveal the cUSDC balance/,
  );
});

test('keeps an exact public amount without accessing private balance state', () => {
  const compiled = compileAgentPlan({ ...plan, side: 'sell', amountMode: 'exact', amountValue: '0.025' }, {
    balances: {},
    privateBalancesVisible: false,
  });
  assert.equal(compiled.amount, '0.025');
  assert.equal(compiled.tokenIn, 'cETH');
  assert.equal(compiled.tokenOut, 'cUSDC');
});
