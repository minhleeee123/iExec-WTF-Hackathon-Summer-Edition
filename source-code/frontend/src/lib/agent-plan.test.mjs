import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAgentPlan, validateAgentRequest } from './agent-plan.js'

const request = {
  intent: 'Buy ETH with 25% of my private cUSDC when ETH falls 3 percent.',
  market: {
    ethPriceUsd: 2_000,
    oracleUpdatedAt: 1_700_000_000,
    blockTimestamp: 1_700_000_010,
  },
}

const plan = {
  version: 1,
  supported: true,
  unsupportedReason: '',
  action: 'limit_order',
  side: 'buy',
  amountMode: 'percent',
  amountValue: '25',
  triggerPriceUsd: '1940',
  slippageBps: 50,
  expiryMinutes: 1440,
  requiresWrap: false,
  summary: 'Buy cETH with 25% of the available cUSDC at $1,940.',
  riskNote: 'Execution still depends on pool liquidity and the encrypted minimum output.',
}

test('validates only the public market context accepted by the agent API', () => {
  assert.deepEqual(validateAgentRequest(request), request)
  assert.throws(
    () => validateAgentRequest({ ...request, privateBalance: '1000' }),
    /unsupported fields: privateBalance/,
  )
  assert.throws(
    () => validateAgentRequest({ ...request, market: { ...request.market, wallet: '0x123' } }),
    /unsupported fields: wallet/,
  )
})

test('normalizes a strict confidential limit-order plan', () => {
  assert.deepEqual(normalizeAgentPlan(plan), plan)
})

test('rejects unsafe or semantically invalid plan values', () => {
  assert.throws(() => normalizeAgentPlan({ ...plan, amountValue: '0' }), /greater than zero/)
  assert.throws(() => normalizeAgentPlan({ ...plan, amountValue: '101' }), /cannot exceed 100/)
  assert.throws(() => normalizeAgentPlan({ ...plan, slippageBps: 0 }), /between 10 and 500/)
  assert.throws(() => normalizeAgentPlan({ ...plan, walletAddress: '0x123' }), /unsupported fields/)
})

test('requires a reason when the model cannot support an intent', () => {
  assert.throws(
    () => normalizeAgentPlan({ ...plan, supported: false, unsupportedReason: '' }),
    /require a reason/,
  )
})
