export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b'

export const AGENT_PLAN_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: [
    'version',
    'supported',
    'unsupportedReason',
    'action',
    'side',
    'amountMode',
    'amountValue',
    'triggerPriceUsd',
    'slippageBps',
    'expiryMinutes',
    'requiresWrap',
    'summary',
    'riskNote',
  ],
  properties: {
    version: { type: 'integer', enum: [1] },
    supported: { type: 'boolean' },
    unsupportedReason: { type: 'string', maxLength: 180 },
    action: { type: 'string', enum: ['limit_order'] },
    side: { type: 'string', enum: ['buy', 'sell'] },
    amountMode: { type: 'string', enum: ['percent', 'exact'] },
    amountValue: { type: 'string', maxLength: 40 },
    triggerPriceUsd: { type: 'string', maxLength: 40 },
    slippageBps: { type: 'integer', minimum: 10, maximum: 500 },
    expiryMinutes: { type: 'integer', minimum: 5, maximum: 10_080 },
    requiresWrap: { type: 'boolean' },
    summary: { type: 'string', maxLength: 180 },
    riskNote: { type: 'string', maxLength: 180 },
  },
})

const PLAN_KEYS = new Set(AGENT_PLAN_SCHEMA.required)
const REQUEST_KEYS = new Set(['intent', 'market'])
const MARKET_KEYS = new Set(['ethPriceUsd', 'oracleUpdatedAt', 'blockTimestamp'])
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
}

function assertExactKeys(value, allowed, label) {
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key))
  if (unexpected.length > 0) {
    throw new TypeError(`${label} contains unsupported fields: ${unexpected.join(', ')}`)
  }
}

function parsePositiveDecimal(value, label) {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) {
    throw new TypeError(`${label} must be a positive decimal string`)
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RangeError(`${label} must be greater than zero`)
  }
  return value
}

export function validateAgentRequest(value) {
  assertPlainObject(value, 'Agent request')
  assertExactKeys(value, REQUEST_KEYS, 'Agent request')

  const intent = typeof value.intent === 'string' ? value.intent.trim() : ''
  if (intent.length < 8 || intent.length > 600) {
    throw new RangeError('Intent must contain between 8 and 600 characters')
  }

  assertPlainObject(value.market, 'Market context')
  assertExactKeys(value.market, MARKET_KEYS, 'Market context')

  const market = {
    ethPriceUsd: Number(value.market.ethPriceUsd),
    oracleUpdatedAt: Number(value.market.oracleUpdatedAt),
    blockTimestamp: Number(value.market.blockTimestamp),
  }

  if (!Number.isFinite(market.ethPriceUsd) || market.ethPriceUsd <= 0) {
    throw new RangeError('Market ETH price must be greater than zero')
  }
  for (const field of ['oracleUpdatedAt', 'blockTimestamp']) {
    if (!Number.isSafeInteger(market[field]) || market[field] <= 0) {
      throw new RangeError(`Market ${field} must be a positive integer`)
    }
  }

  return { intent, market }
}

export function normalizeAgentPlan(value) {
  assertPlainObject(value, 'Agent plan')
  assertExactKeys(value, PLAN_KEYS, 'Agent plan')

  if (value.version !== 1 || value.action !== 'limit_order') {
    throw new TypeError('Unsupported agent plan version or action')
  }
  if (typeof value.supported !== 'boolean' || typeof value.requiresWrap !== 'boolean') {
    throw new TypeError('Agent plan boolean fields are invalid')
  }
  if (!['buy', 'sell'].includes(value.side)) {
    throw new TypeError('Agent plan side must be buy or sell')
  }
  if (!['percent', 'exact'].includes(value.amountMode)) {
    throw new TypeError('Agent plan amount mode must be percent or exact')
  }

  const amountValue = parsePositiveDecimal(value.amountValue, 'Agent amount')
  const triggerPriceUsd = parsePositiveDecimal(value.triggerPriceUsd, 'Agent trigger price')
  if (value.amountMode === 'percent' && Number(amountValue) > 100) {
    throw new RangeError('Agent percentage cannot exceed 100')
  }
  if (!Number.isInteger(value.slippageBps) || value.slippageBps < 10 || value.slippageBps > 500) {
    throw new RangeError('Agent slippage must be between 10 and 500 basis points')
  }
  if (!Number.isInteger(value.expiryMinutes) || value.expiryMinutes < 5 || value.expiryMinutes > 10_080) {
    throw new RangeError('Agent expiry must be between 5 minutes and 7 days')
  }

  for (const field of ['unsupportedReason', 'summary', 'riskNote']) {
    if (typeof value[field] !== 'string' || value[field].length > 180) {
      throw new TypeError(`Agent ${field} must be a string of at most 180 characters`)
    }
  }
  if (value.supported && !value.summary.trim()) {
    throw new TypeError('Supported agent plans require a summary')
  }
  if (!value.supported && !value.unsupportedReason.trim()) {
    throw new TypeError('Unsupported agent plans require a reason')
  }

  return Object.freeze({
    version: 1,
    supported: value.supported,
    unsupportedReason: value.unsupportedReason.trim(),
    action: 'limit_order',
    side: value.side,
    amountMode: value.amountMode,
    amountValue,
    triggerPriceUsd,
    slippageBps: value.slippageBps,
    expiryMinutes: value.expiryMinutes,
    requiresWrap: value.requiresWrap,
    summary: value.summary.trim(),
    riskNote: value.riskNote.trim(),
  })
}
