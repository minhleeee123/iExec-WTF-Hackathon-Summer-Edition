import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEther } from 'ethers';
import { decideOrder } from '../lib/keeper-decision.js';
import { createHealthState, getHealthSnapshot, recordKeeperCycle } from '../lib/keeper-health.js';
import { createNotifier } from '../lib/keeper-notifier.js';
import { runKeeperCycle } from '../lib/keeper-scanner.js';

function fakeAdapter(orders, options = {}) {
  const sends = [];
  const reads = new Map();
  return {
    sends,
    keeperAddress: '0x0000000000000000000000000000000000000001',
    getChainId: async () => 11155111,
    getBlockTimestamp: async () => options.blockTimestamp ?? 100,
    getBalance: async () => options.balanceWei ?? parseEther('0.1'),
    listOrderIds: async () => orders.map((_, index) => index + 1),
    getOrder: async (id) => {
      if (options.orderReadError === id) throw new Error('RPC unavailable');
      const count = (reads.get(id) ?? 0) + 1;
      reads.set(id, count);
      if (options.staleOrder === id && count > 1) return { ...orders[id - 1], status: 1 };
      return orders[id - 1];
    },
    canExecute: async (id) => {
      if (options.oracleError === id) throw new Error('stale oracle');
      return Boolean(options.executable?.includes(id));
    },
    simulate: async () => 100000n,
    send: async (action, id) => {
      sends.push({ action, id });
      return { hash: `0x${id}`, wait: async () => ({ blockNumber: 123 + id }) };
    },
  };
}

const config = { dryRun: false, expireOrders: true, maxActions: 2, minBalanceWei: parseEther('0.005') };
const silent = () => {};
const notify = async () => {};

test('keeper decision engine maps executable, expired, non-open, waiting, and oracle errors', () => {
  assert.equal(decideOrder({ status: 0, blockTimestamp: 100, expiry: 200, canExecute: true }).action, 'execute');
  assert.equal(decideOrder({ status: 0, blockTimestamp: 201, expiry: 200 }).action, 'expire');
  assert.equal(decideOrder({ status: 1, blockTimestamp: 100, expiry: 200 }).reason, 'not-open');
  assert.equal(decideOrder({ status: 0, blockTimestamp: 100, expiry: 200 }).reason, 'trigger-not-reached');
  assert.equal(decideOrder({ status: 0, blockTimestamp: 100, expiry: 200, oracleError: 'offline' }).action, 'retry');
});

test('keeper executes trigger-ready orders and expires old orders sequentially', async () => {
  const adapter = fakeAdapter([{ status: 0, expiry: 200 }, { status: 0, expiry: 99 }], { executable: [1] });
  const result = await runKeeperCycle({ adapter, config, health: createHealthState({ minBalanceWei: config.minBalanceWei }), log: silent, notify });
  assert.deepEqual(adapter.sends, [{ action: 'execute', id: 1 }, { action: 'expire', id: 2 }]);
  assert.equal(result.actions, 2);
});

test('dry run and low keeper balance never write', async () => {
  const dryAdapter = fakeAdapter([{ status: 0, expiry: 200 }], { executable: [1] });
  await runKeeperCycle({ adapter: dryAdapter, config: { ...config, dryRun: true }, health: createHealthState({ minBalanceWei: config.minBalanceWei }), log: silent, notify });
  assert.equal(dryAdapter.sends.length, 0);
  const lowAdapter = fakeAdapter([{ status: 0, expiry: 99 }], { balanceWei: 1n });
  const result = await runKeeperCycle({ adapter: lowAdapter, config, health: createHealthState({ minBalanceWei: config.minBalanceWei }), log: silent, notify });
  assert.equal(lowAdapter.sends.length, 0);
  assert.equal(result.lowBalance, true);
});

test('oracle errors retry later and competing keeper stale status does not crash', async () => {
  const oracleAdapter = fakeAdapter([{ status: 0, expiry: 200 }], { oracleError: 1 });
  await runKeeperCycle({ adapter: oracleAdapter, config, health: createHealthState(), log: silent, notify });
  assert.equal(oracleAdapter.sends.length, 0);
  const staleAdapter = fakeAdapter([{ status: 0, expiry: 200 }], { executable: [1], staleOrder: 1 });
  await runKeeperCycle({ adapter: staleAdapter, config, health: createHealthState(), log: silent, notify });
  assert.equal(staleAdapter.sends.length, 0);
});

test('max actions caps writes and keeper exposes no cancel or decrypt path', async () => {
  const adapter = fakeAdapter([{ status: 0, expiry: 200 }, { status: 0, expiry: 200 }], { executable: [1, 2] });
  await runKeeperCycle({ adapter, config: { ...config, maxActions: 1 }, health: createHealthState(), log: silent, notify });
  assert.deepEqual(adapter.sends, [{ action: 'execute', id: 1 }]);
  assert(adapter.sends.every(({ action }) => ['execute', 'expire'].includes(action)));
  assert.equal('cancel' in adapter, false);
  assert.equal('decrypt' in adapter, false);
});

test('webhook failure is isolated from the confirmed transaction result', async () => {
  const logs = [];
  const notifier = createNotifier({
    webhookUrl: 'https://invalid.test',
    fetchImpl: async () => { throw new Error('webhook down'); },
    log: (entry) => logs.push(entry),
  });
  const result = await notifier({ orderId: '1', action: 'execute', transactionHash: '0x1' });
  assert.equal(result.delivered, false);
  assert(logs.some((entry) => entry.result === 'webhook-failed'));
});

test('AI observer cannot gate deterministic keeper writes and failures stay isolated', async () => {
  const adapter = fakeAdapter([{ status: 0, expiry: 200 }], { executable: [1] });
  const observations = [];
  await runKeeperCycle({
    adapter,
    config,
    health: createHealthState(),
    log: silent,
    notify,
    observe: async (event) => {
      observations.push(event);
      throw new Error('AI offline');
    },
  });
  assert.deepEqual(adapter.sends, [{ action: 'execute', id: 1 }]);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].result, 'confirmed');
  assert.equal('encryptedAmount' in observations[0], false);
});

test('health transitions between ok, degraded, and error without exposing secrets', () => {
  const health = createHealthState({ keeperAddress: '0x1', minBalanceWei: 10n, errorThreshold: 2 });
  recordKeeperCycle(health, { balanceWei: 20n, rpcSuccess: true });
  assert.equal(getHealthSnapshot(health).status, 'ok');
  recordKeeperCycle(health, { balanceWei: 1n, rpcSuccess: true });
  assert.equal(getHealthSnapshot(health).status, 'degraded');
  recordKeeperCycle(health, { balanceWei: 20n, rpcSuccess: false });
  recordKeeperCycle(health, { balanceWei: 20n, rpcSuccess: false });
  const snapshot = getHealthSnapshot(health);
  assert.equal(snapshot.status, 'error');
  assert.equal('privateKey' in snapshot, false);
});
