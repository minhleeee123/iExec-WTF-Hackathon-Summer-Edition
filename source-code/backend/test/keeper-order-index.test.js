import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyKeeperEvents,
  createKeeperIndex,
  createKeeperOrderSource,
  queryKeeperLogs,
} from '../lib/keeper-order-index.js';

const identity = {
  chainId: 11155111,
  contractAddress: '0x0000000000000000000000000000000000000001',
  deploymentBlock: 100,
};

test('keeper event index retains only active orders and is immutable across overlays', () => {
  const base = createKeeperIndex(identity);
  const created = applyKeeperEvents(base, [
    { name: 'OrderCreated', orderId: 1, blockNumber: 101, logIndex: 0 },
    { name: 'OrderCreated', orderId: 2, blockNumber: 102, logIndex: 0 },
  ], 102);
  const settled = applyKeeperEvents(created, [
    { name: 'OrderExecuted', orderId: 1, blockNumber: 103, logIndex: 0 },
  ], 103);
  assert.deepEqual(created.activeOrderIds, [1, 2]);
  assert.deepEqual(settled.activeOrderIds, [2]);
  assert.equal(settled.lastOrderId, 2);
});

test('keeper log queries are chunked to bounded block ranges', async () => {
  const calls = [];
  const provider = { getLogs: async ({ fromBlock, toBlock }) => { calls.push([fromBlock, toBlock]); return []; } };
  await queryKeeperLogs(provider, { address: identity.contractAddress }, 100, 112, 5);
  assert.deepEqual(calls, [[100, 104], [105, 109], [110, 112]]);
});

test('keeper source rebuilds an active set from events without enumerating historical IDs', async () => {
  let requestedBlockTag;
  const logs = [
    { name: 'OrderCreated', orderId: 1, blockNumber: 101, index: 0 },
    { name: 'OrderCreated', orderId: 2, blockNumber: 102, index: 0 },
    { name: 'OrderExecuted', orderId: 1, blockNumber: 103, index: 0 },
  ];
  const provider = {
    getBlockNumber: async () => 110,
    getLogs: async ({ fromBlock, toBlock }) => logs.filter((entry) => entry.blockNumber >= fromBlock && entry.blockNumber <= toBlock),
  };
  const contract = {
    interface: {
      getEvent: (name) => ({ topicHash: name }),
      parseLog: (entry) => ({ name: entry.name, args: { orderId: BigInt(entry.orderId) } }),
    },
    nextOrderId: async ({ blockTag }) => { requestedBlockTag = blockTag; return 3n; },
  };
  const source = createKeeperOrderSource({
    ...identity,
    checkpointFile: '',
    contract,
    finalityBlocks: 2,
    provider,
  });
  assert.deepEqual(await source.listActiveOrderIds(), [2]);
  assert.equal(requestedBlockTag, 107, 'nextOrderId must be read at the same lagged block as the event snapshot');
});
