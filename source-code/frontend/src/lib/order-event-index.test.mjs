import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOrderEvents,
  createOrderIndex,
  loadOrderIndex,
  orderIndexValues,
  queryLogsInChunks,
  saveOrderIndex,
  splitFinalizedEvents,
} from './order-event-index.js';

const identity = { chainId: 11155111, contractAddress: '0x0000000000000000000000000000000000000001', deploymentBlock: 100 };
const created = {
  name: 'OrderCreated', orderId: '1', owner: '0xowner', tokenIn: '0xin', tokenOut: '0xout',
  amountHandle: '0xamount', minOutHandle: '0xmin', triggerPrice: '250000000000', expiry: 500,
  blockNumber: 101, logIndex: 0, transactionHash: '0xcreate',
};

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('event index derives public order metadata and terminal status without getOrder scans', () => {
  const open = applyOrderEvents(createOrderIndex(identity), [created], 101);
  const terminal = applyOrderEvents(open, [{ name: 'OrderExecuted', orderId: '1', blockNumber: 110, logIndex: 0, transactionHash: '0xexecute' }], 110);
  assert.equal(orderIndexValues(open)[0].contractStatus, 0);
  assert.equal(orderIndexValues(terminal)[0].contractStatus, 1);
  assert.equal(orderIndexValues(terminal)[0].terminalTransactionHash, '0xexecute');
  assert.equal(open.orders['1'].contractStatus, 0, 'overlay updates must not mutate the finalized snapshot');
});

test('checkpoint cache is deployment-specific and contains only serializable public data', () => {
  const storage = memoryStorage();
  const index = applyOrderEvents(createOrderIndex(identity), [created], 101);
  assert.equal(saveOrderIndex(storage, index), true);
  assert.deepEqual(loadOrderIndex(storage, identity), index);
  assert.equal(loadOrderIndex(storage, { ...identity, deploymentBlock: 99 }), null);
});

test('finalized and overlay events are separated at the checkpoint boundary', () => {
  const events = [created, { name: 'OrderCancelled', orderId: '1', blockNumber: 120, logIndex: 0, transactionHash: '0xcancel' }];
  const [finalized, overlay] = splitFinalizedEvents(events, 110);
  assert.deepEqual(finalized, [created]);
  assert.equal(overlay[0].name, 'OrderCancelled');
});

test('log queries use bounded block ranges', async () => {
  const calls = [];
  const provider = { getLogs: async ({ fromBlock, toBlock }) => { calls.push([fromBlock, toBlock]); return [{ blockNumber: fromBlock }]; } };
  const logs = await queryLogsInChunks(provider, { address: '0x1' }, 10, 22, 5);
  assert.deepEqual(calls, [[10, 14], [15, 19], [20, 22]]);
  assert.equal(logs.length, 3);
});
