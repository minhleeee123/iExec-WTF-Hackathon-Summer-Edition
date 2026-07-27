import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadSwapIndex,
  queryRecentSwapEvents,
  saveSwapIndex,
} from './history.js';

test('swap history uses one request when the wallet RPC accepts the full range', async () => {
  const calls = [];
  const router = {
    filters: { SwapExecuted: (address) => ({ address }) },
    queryFilter: async (filter, fromBlock, toBlock) => {
      calls.push({ filter, fromBlock, toBlock });
      return ['event'];
    },
  };
  assert.deepEqual(await queryRecentSwapEvents(router, '0xabc', 100, 350), ['event']);
  assert.equal(calls.length, 1);
});

test('swap history retries a rejected archive range in 100-block chunks', async () => {
  const calls = [];
  const router = {
    filters: { SwapExecuted: (address) => ({ address }) },
    queryFilter: async (_filter, fromBlock, toBlock) => {
      calls.push([fromBlock, toBlock]);
      if (calls.length === 1) throw new Error('archive range rejected');
      return [{ fromBlock, toBlock }];
    },
  };
  const events = await queryRecentSwapEvents(router, '0xabc', 100, 350);
  assert.deepEqual(calls, [[100, 350], [100, 199], [200, 299], [300, 350]]);
  assert.equal(events.length, 3);
});

test('swap history checkpoint cache is account and deployment specific', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const identity = {
    chainId: 11155111,
    routerAddress: '0x1111111111111111111111111111111111111111',
    trader: '0x2222222222222222222222222222222222222222',
    deploymentBlock: 100,
  };
  const index = {
    version: 1,
    chainId: 11155111,
    routerAddress: identity.routerAddress,
    trader: identity.trader,
    deploymentBlock: 100,
    checkpointBlock: 120,
    events: [],
  };
  assert.equal(saveSwapIndex(storage, index), true);
  assert.deepEqual(loadSwapIndex(storage, identity), index);
  assert.equal(loadSwapIndex(storage, { ...identity, trader: '0x3333333333333333333333333333333333333333' }), null);
});
