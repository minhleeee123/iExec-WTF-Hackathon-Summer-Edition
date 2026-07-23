import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemoteKeeperObserver, requestStrategyPlan } from '../lib/agent-client.js';

const market = { ethPriceUsd: 2_000, oracleUpdatedAt: 1_700_000_000, blockTimestamp: 1_700_000_010 };

test('MCP strategy client sends only intent and public market context', async () => {
  let request;
  const fetchImpl = async (_url, options) => {
    request = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ plan: { action: 'limit_order', supported: true }, meta: { provider: 'groq' } }),
    };
  };
  const result = await requestStrategyPlan({
    endpoint: 'https://noxswap.example/api/agent/plan',
    intent: 'Buy cETH with 10 percent of cUSDC at 1900 dollars.',
    market,
    fetchImpl,
  });
  assert.deepEqual(Object.keys(request).sort(), ['intent', 'market']);
  assert.deepEqual(request.market, market);
  assert.equal(result.meta.provider, 'groq');
});

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

test('agent clients reject insecure remote endpoints', async () => {
  await assert.rejects(
    requestStrategyPlan({ endpoint: 'http://remote.example/plan', intent: 'valid intent', market }),
    /must use HTTPS/,
  );
});
