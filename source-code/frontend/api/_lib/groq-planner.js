import {
  AGENT_PLAN_SCHEMA,
  DEFAULT_GROQ_MODEL,
  normalizeAgentPlan,
  validateAgentRequest,
} from '../../src/lib/agent-plan.js'

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You are the NoxSwap confidential limit-order planner.
Return only the strict JSON schema requested by the API.
NoxSwap supports cUSDC -> cETH (side=buy) and cETH -> cUSDC (side=sell).
Use amountMode=percent when the user specifies a percentage and exact for a public exact amount.
Never ask for or infer a wallet address, private balance, encrypted handle, signature, seed phrase, or private key.
If a relative trigger is requested, calculate its USD value from the supplied public ETH/USD oracle price.
Use slippageBps=500 when the user does not specify slippage and expiryMinutes=1440 when no expiry is specified.
requiresWrap is true only when the intent explicitly starts from an underlying n-token or requests wrapping.
Set supported=false when the request is not a NoxSwap ETH/USDC confidential limit order.
This is a draft plan, not financial advice, and it must always require explicit wallet confirmation.`

export class AgentPlannerError extends Error {
  constructor(message, { code = 'AGENT_ERROR', status = 500, retryAfter = null } = {}) {
    super(message)
    this.name = 'AgentPlannerError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

function parseRetryAfter(response) {
  const value = response.headers?.get?.('retry-after')
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null
}

export async function createGroqStrategyPlan(
  input,
  {
    apiKey,
    model = DEFAULT_GROQ_MODEL,
    fetchImpl = fetch,
    timeoutMs = 20_000,
  } = {},
) {
  const request = validateAgentRequest(input)
  if (!apiKey) {
    throw new AgentPlannerError('The strategy agent is not configured', {
      code: 'AGENT_NOT_CONFIGURED',
      status: 503,
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  let response
  try {
    response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        reasoning_effort: 'low',
        temperature: 0.2,
        max_completion_tokens: 1_200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              intent: request.intent,
              publicMarketContext: request.market,
            }),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'noxswap_limit_order_plan',
            strict: true,
            schema: AGENT_PLAN_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AgentPlannerError('Groq did not respond before the timeout', {
        code: 'AGENT_TIMEOUT',
        status: 504,
      })
    }
    throw new AgentPlannerError('The strategy provider is temporarily unavailable', {
      code: 'AGENT_PROVIDER_UNAVAILABLE',
      status: 502,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new AgentPlannerError('Groq free-tier rate limit reached', {
        code: 'AGENT_RATE_LIMITED',
        status: 429,
        retryAfter: parseRetryAfter(response),
      })
    }
    throw new AgentPlannerError('Groq could not create a strategy plan', {
      code: 'AGENT_PROVIDER_ERROR',
      status: 502,
    })
  }

  let payload
  try {
    payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    const plan = normalizeAgentPlan(parsed)
    return {
      plan,
      meta: {
        provider: 'groq',
        model,
        requestId: response.headers?.get?.('x-request-id') || null,
      },
    }
  } catch {
    throw new AgentPlannerError('Groq returned an invalid strategy plan', {
      code: 'AGENT_INVALID_RESPONSE',
      status: 502,
    })
  }
}
