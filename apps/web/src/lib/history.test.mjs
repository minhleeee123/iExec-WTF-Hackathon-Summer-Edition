import assert from 'node:assert/strict';
import test from 'node:test';
import { queryRecentSwapEvents } from './history.js';

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
