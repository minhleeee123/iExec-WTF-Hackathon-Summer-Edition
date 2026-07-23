import { DEFAULT_GROQ_MODEL } from '../../src/lib/agent-plan.js'
import { AgentPlannerError } from './groq-planner.js'

export const KEEPER_OBSERVATION_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['version', 'severity', 'headline', 'explanation', 'recommendedAction'],
  properties: {
    version: { type: 'integer', enum: [1] },
    severity: { type: 'string', enum: ['info', 'attention'] },
    headline: { type: 'string', maxLength: 100 },
    explanation: { type: 'string', maxLength: 240 },
    recommendedAction: { type: 'string', enum: ['none', 'monitor', 'fund-keeper', 'check-rpc'] },
  },
})

const EVENT_KEYS = new Set([
  'orderId',
  'decision',
  'reason',
  'result',
  'blockTimestamp',
  'expiry',
  'canExecute',
  'transactionHash',
])

function validateEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Observer event must be an object')
  const unexpected = Object.keys(input).filter((key) => !EVENT_KEYS.has(key))
  if (unexpected.length) throw new TypeError(`Observer event contains unsupported fields: ${unexpected.join(', ')}`)
  if (!/^\d+$/.test(String(input.orderId))) throw new TypeError('Observer orderId must be an integer string')
  if (!['execute', 'expire', 'retry'].includes(input.decision)) throw new TypeError('Observer decision is invalid')
  if (typeof input.reason !== 'string' || typeof input.result !== 'string') throw new TypeError('Observer reason and result are required')
  if (!Number.isSafeInteger(input.blockTimestamp) || !Number.isSafeInteger(input.expiry)) throw new TypeError('Observer timestamps are invalid')
  if (typeof input.canExecute !== 'boolean') throw new TypeError('Observer canExecute must be boolean')
  if (input.transactionHash !== null && !/^0x[0-9a-fA-F]+$/.test(input.transactionHash)) throw new TypeError('Observer transaction hash is invalid')
  return {
    orderId: String(input.orderId),
    decision: input.decision,
    reason: input.reason.slice(0, 120),
    result: input.result.slice(0, 120),
    blockTimestamp: input.blockTimestamp,
    expiry: input.expiry,
    canExecute: input.canExecute,
    transactionHash: input.transactionHash,
  }
}

function normalizeObservation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Observation must be an object')
  const expected = new Set(KEEPER_OBSERVATION_SCHEMA.required)
  const unexpected = Object.keys(value).filter((key) => !expected.has(key))
  if (unexpected.length || value.version !== 1) throw new TypeError('Observation schema is invalid')
  if (!['info', 'attention'].includes(value.severity)) throw new TypeError('Observation severity is invalid')
  if (!['none', 'monitor', 'fund-keeper', 'check-rpc'].includes(value.recommendedAction)) throw new TypeError('Observation action is invalid')
  for (const [field, max] of [['headline', 100], ['explanation', 240]]) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > max) throw new TypeError(`Observation ${field} is invalid`)
  }
  return Object.freeze({
    version: 1,
    severity: value.severity,
    headline: value.headline.trim(),
    explanation: value.explanation.trim(),
    recommendedAction: value.recommendedAction,
  })
}

export async function createGroqKeeperObservation(
  input,
  { apiKey, model = DEFAULT_GROQ_MODEL, fetchImpl = fetch, timeoutMs = 8_000 } = {},
) {
  const event = validateEvent(input?.event)
  if (!apiKey) throw new AgentPlannerError('The keeper observer is not configured', { code: 'AGENT_NOT_CONFIGURED', status: 503 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        reasoning_effort: 'low',
        temperature: 0.1,
        max_completion_tokens: 800,
        messages: [
          {
            role: 'system',
            content: 'Explain one deterministic NoxSwap keeper decision using only the supplied public facts. The on-chain decision is already final; never approve, reject, or alter it. Never request secrets, balances, handles, signatures, or keys.',
          },
          { role: 'user', content: JSON.stringify(event) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'noxswap_keeper_observation', strict: true, schema: KEEPER_OBSERVATION_SCHEMA },
        },
      }),
      signal: controller.signal,
    })
  } catch (error) {
    throw new AgentPlannerError(error?.name === 'AbortError' ? 'Keeper observer timed out' : 'Keeper observer is unavailable', {
      code: error?.name === 'AbortError' ? 'AGENT_TIMEOUT' : 'AGENT_PROVIDER_UNAVAILABLE',
      status: error?.name === 'AbortError' ? 504 : 502,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new AgentPlannerError(response.status === 429 ? 'Groq free-tier rate limit reached' : 'Groq could not explain the keeper decision', {
      code: response.status === 429 ? 'AGENT_RATE_LIMITED' : 'AGENT_PROVIDER_ERROR',
      status: response.status === 429 ? 429 : 502,
    })
  }

  try {
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    return {
      observation: normalizeObservation(typeof content === 'string' ? JSON.parse(content) : content),
      meta: { provider: 'groq', model, requestId: response.headers?.get?.('x-request-id') || null },
    }
  } catch {
    throw new AgentPlannerError('Groq returned an invalid keeper observation', { code: 'AGENT_INVALID_RESPONSE', status: 502 })
  }
}
