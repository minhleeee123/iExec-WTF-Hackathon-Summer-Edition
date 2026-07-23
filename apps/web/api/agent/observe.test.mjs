import assert from 'node:assert/strict'
import test from 'node:test'
import {
  consumeObserverRateLimit,
  isAuthorizedObserverRequest,
  isObserverBodyWithinLimit,
  resetObserverRateLimit,
} from './observe.js'

test('observer auth uses the configured bearer secret', () => {
  const req = { headers: { authorization: 'Bearer observer-secret' } }
  assert.equal(isAuthorizedObserverRequest(req, 'observer-secret'), true)
  assert.equal(isAuthorizedObserverRequest(req, 'wrong-secret'), false)
  assert.equal(isAuthorizedObserverRequest({ headers: {} }, 'observer-secret'), false)
})

test('observer rate limit allows five requests and rejects the sixth', () => {
  resetObserverRateLimit()
  const id = `test-${Date.now()}`
  for (let index = 0; index < 5; index += 1) assert.equal(consumeObserverRateLimit(id, 1_000), true)
  assert.equal(consumeObserverRateLimit(id, 1_000), false)
  assert.equal(consumeObserverRateLimit(id, 61_001), true)
  resetObserverRateLimit()
})

test('observer body limit rejects oversized content-length and payloads', () => {
  assert.equal(isObserverBodyWithinLimit({ headers: { 'content-length': '20000' } }, '{}'), false)
  assert.equal(isObserverBodyWithinLimit({ headers: {} }, { event: { reason: 'ok' } }), true)
})
