import assert from 'node:assert/strict'
import test from 'node:test'
import { AgentPlannerError, createGroqStrategyPlan } from './groq-planner.js'

const input = {
  intent: 'Use 10 percent of my cUSDC to buy ETH when it reaches 1900 dollars.',
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
  amountValue: '10',
  triggerPriceUsd: '1900',
  slippageBps: 500,
  expiryMinutes: 1440,
  requiresWrap: false,
  summary: 'Buy cETH with 10% of cUSDC at $1,900.',
  riskNote: 'Pool liquidity and oracle freshness are checked again before submission.',
}

test('calls Groq with strict structured output and returns only normalized data', async () => {
  let request
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) }
    return {
      ok: true,
      headers: { get: (name) => (name === 'x-request-id' ? 'req_123' : null) },
      json: async () => ({ choices: [{ message: { content: JSON.stringify(plan) } }] }),
    }
  }

  const result = await createGroqStrategyPlan(input, {
    apiKey: 'test-secret',
    fetchImpl,
  })

  assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions')
  assert.equal(request.options.headers.Authorization, 'Bearer test-secret')
  assert.equal(request.body.response_format.json_schema.strict, true)
  assert.equal(request.body.model, 'openai/gpt-oss-20b')
  assert.equal(result.meta.requestId, 'req_123')
  assert.deepEqual(result.plan, plan)
  assert.equal(JSON.stringify(result).includes('test-secret'), false)
})

test('maps free-tier throttling without exposing the provider response', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    headers: { get: () => '12' },
  })

  await assert.rejects(
    createGroqStrategyPlan(input, { apiKey: 'test-secret', fetchImpl }),
    (error) => {
      assert.ok(error instanceof AgentPlannerError)
      assert.equal(error.code, 'AGENT_RATE_LIMITED')
      assert.equal(error.retryAfter, 12)
      return true
    },
  )
})

test('requires server-side configuration before sending a request', async () => {
  await assert.rejects(
    createGroqStrategyPlan(input),
    (error) => error instanceof AgentPlannerError && error.code === 'AGENT_NOT_CONFIGURED',
  )
})
