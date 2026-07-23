import assert from 'node:assert/strict'
import test from 'node:test'
import { createGroqKeeperObservation } from './groq-observer.js'

const event = {
  orderId: '12',
  decision: 'execute',
  reason: 'trigger-ready',
  result: 'confirmed',
  blockTimestamp: 1_700_000_000,
  expiry: 1_700_003_600,
  canExecute: true,
  transactionHash: '0x1234',
}

test('keeper observer uses only public decision facts and strict output', async () => {
  let body
  const fetchImpl = async (_url, options) => {
    body = JSON.parse(options.body)
    return {
      ok: true,
      headers: { get: () => 'observer_1' },
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        version: 1,
        severity: 'info',
        headline: 'Order executed at its public trigger',
        explanation: 'The deterministic keeper observed a ready trigger before expiry and the transaction confirmed.',
        recommendedAction: 'none',
      }) } }] }),
    }
  }
  const result = await createGroqKeeperObservation({ event }, { apiKey: 'test-secret', fetchImpl })
  assert.equal(body.response_format.json_schema.strict, true)
  assert.equal(body.messages[1].content, JSON.stringify(event))
  assert.equal(result.observation.recommendedAction, 'none')
  assert.equal(JSON.stringify(result).includes('test-secret'), false)
})

test('keeper observer rejects confidential or authority-bearing fields', async () => {
  await assert.rejects(
    createGroqKeeperObservation({ event: { ...event, privateKey: 'secret' } }, { apiKey: 'test-secret' }),
    /unsupported fields: privateKey/,
  )
})
