import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemoteKeeperObserver } from '../src/observer-client.js';

test('remote keeper observer is optional and accepts public observations', async () => {
  assert.equal(createRemoteKeeperObserver({}), null);
  assert.equal(createRemoteKeeperObserver({ endpoint: 'https://noxswap.example/api/agent/observe' }), null);
  let body;
  let authorization;
  const observer = createRemoteKeeperObserver({
    endpoint: 'https://noxswap.example/api/agent/observe',
    token: 'observer-token',
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      authorization = options.headers.Authorization;
      return { ok: true, json: async () => ({ observation: { version: 1, severity: 'info' } }) };
    },
  });
  const event = { orderId: '1', decision: 'execute', reason: 'trigger-ready', result: 'confirmed' };
  await observer(event);
  assert.deepEqual(body, { event });
  assert.equal(authorization, 'Bearer observer-token');
});

test('remote keeper observer rejects insecure endpoints', () => {
  assert.throws(
    () => createRemoteKeeperObserver({ endpoint: 'http://remote.example/observe', token: 'observer-token' }),
    /must use HTTPS/,
  );
});
