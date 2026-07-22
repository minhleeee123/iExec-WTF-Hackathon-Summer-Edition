import { createGroqKeeperObservation } from '../_lib/groq-observer.js'
import { AgentPlannerError } from '../_lib/groq-planner.js'

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
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
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
