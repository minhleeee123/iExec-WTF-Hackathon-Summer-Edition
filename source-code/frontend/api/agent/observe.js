import { timingSafeEqual } from 'node:crypto'
import { createGroqKeeperObservation } from '../_lib/groq-observer.js'
import { AgentPlannerError } from '../_lib/groq-planner.js'

export const OBSERVER_RATE_WINDOW_MS = 60_000
export const OBSERVER_MAX_REQUESTS_PER_WINDOW = 5
export const OBSERVER_MAX_BODY_BYTES = 16_384
const requestsByClient = new Map()

export function observerClientId(req) {
  return String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
}

export function consumeObserverRateLimit(id, now = Date.now()) {
  if (requestsByClient.size > 1_024) {
    for (const [key, value] of requestsByClient) {
      if (now - value.startedAt >= OBSERVER_RATE_WINDOW_MS) requestsByClient.delete(key)
    }
  }
  const current = requestsByClient.get(id)
  if (!current || now - current.startedAt >= OBSERVER_RATE_WINDOW_MS) {
    requestsByClient.set(id, { count: 1, startedAt: now })
    return true
  }
  if (current.count >= OBSERVER_MAX_REQUESTS_PER_WINDOW) return false
  current.count += 1
  return true
}

export function resetObserverRateLimit() {
  requestsByClient.clear()
}

export function isAuthorizedObserverRequest(req, secret) {
  if (!secret) return false
  const provided = String(req.headers?.authorization || '')
  const expected = `Bearer ${secret}`
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
}

export function isObserverBodyWithinLimit(req, body) {
  const contentLength = Number(req.headers?.['content-length'])
  if (Number.isFinite(contentLength) && contentLength > OBSERVER_MAX_BODY_BYTES) return false
  return Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body ?? '')) <= OBSERVER_MAX_BODY_BYTES
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
  const secret = process.env.KEEPER_OBSERVER_SECRET
  if (!secret) return sendJson(res, 503, { error: { code: 'OBSERVER_NOT_CONFIGURED', message: 'Keeper observer is not configured.' } })
  if (!isAuthorizedObserverRequest(req, secret)) {
    return sendJson(res, 401, { error: { code: 'OBSERVER_UNAUTHORIZED', message: 'Keeper observer authorization is required.' } })
  }
  const clientId = observerClientId(req)
  if (!consumeObserverRateLimit(clientId)) {
    res.setHeader('Retry-After', '60')
    return sendJson(res, 429, { error: { code: 'OBSERVER_RATE_LIMITED', message: 'Too many observer requests. Retry shortly.' } })
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!isObserverBodyWithinLimit(req, req.body)) {
      return sendJson(res, 413, { error: { code: 'OBSERVER_BODY_TOO_LARGE', message: 'Observer request is too large.' } })
    }
    const result = await createGroqKeeperObservation(body, {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL,
    })
    return sendJson(res, 200, result)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
      return sendJson(res, 400, { error: { code: 'INVALID_OBSERVER_REQUEST', message: error.message } })
    }
    if (error instanceof AgentPlannerError) {
      return sendJson(res, error.status, { error: { code: error.code, message: error.message } })
    }
    return sendJson(res, 500, { error: { code: 'AGENT_ERROR', message: 'The keeper observer could not process this request' } })
  }
}
