import { AgentPlannerError, createGroqStrategyPlan } from '../_lib/groq-planner.js'

const requestsByClient = new Map()
const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 5

function clientId(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
}

function consumeRateLimit(id, now = Date.now()) {
  const current = requestsByClient.get(id)
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestsByClient.set(id, { count: 1, startedAt: now })
    return true
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false
  current.count += 1
  return true
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } })
  }
  if (!consumeRateLimit(clientId(req))) {
    res.setHeader('Retry-After', '60')
    return sendJson(res, 429, {
      error: { code: 'LOCAL_RATE_LIMITED', message: 'Too many strategy requests. Retry shortly.' },
    })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await createGroqStrategyPlan(body, {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL,
    })
    return sendJson(res, 200, result)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
      return sendJson(res, 400, {
        error: { code: 'INVALID_AGENT_REQUEST', message: error.message },
      })
    }
    if (error instanceof AgentPlannerError) {
      if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter))
      return sendJson(res, error.status, {
        error: {
          code: error.code,
          message: error.message,
          retryAfter: error.retryAfter,
        },
      })
    }
    return sendJson(res, 500, {
      error: { code: 'AGENT_ERROR', message: 'The strategy agent could not process this request' },
    })
  }
}
