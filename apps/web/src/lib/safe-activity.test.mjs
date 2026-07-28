import assert from 'node:assert/strict';
import test from 'node:test';
import { ethers } from 'ethers';
import {
  loadSafeActivityIndex,
  normalizeSafeActivityEvent,
  querySafeActivity,
  saveSafeActivityIndex,
} from './safe-activity.js';

test('normalizes Safe treasury funding without exposing an amount', () => {
  const activity = normalizeSafeActivityEvent({
    eventName: 'ConfidentialTransfer',
    source: 'wrapper',
    tokenSymbol: 'cUSDC',
    args: { from: ethers.ZeroAddress },
  });
  assert.equal(activity.type, 'fund');
  assert.equal(activity.title, 'Funded cUSDC');
  assert.doesNotMatch(activity.detail, /\d{2,}/);
});

test('normalizes Safe module lifecycle events', () => {
  const enabled = normalizeSafeActivityEvent({
    eventName: 'EnabledModule',
    source: 'safe',
    args: { module: '0x9233DF9de3f81E7442e3539eC1620Ef9adF0664c' },
  });
  const revoked = normalizeSafeActivityEvent({
    eventName: 'SafeModuleRevoked',
    source: 'module',
    args: {},
  });
  assert.equal(enabled.type, 'security');
  assert.equal(revoked.title, 'Nox module revoked');
});

test('normalizes private swap and order activity using only public metadata', () => {
  const swap = normalizeSafeActivityEvent({
    eventName: 'SafeSwapExecuted',
    source: 'module',
    args: { tokenIn: '0x1111111111111111111111111111111111111111', tokenOut: '0x2222222222222222222222222222222222222222', receiptId: 31n },
  });
  const order = normalizeSafeActivityEvent({
    eventName: 'SafeOrderCreated',
    source: 'module',
    args: { orderId: 7n },
  });
  assert.match(swap.detail, /receipt #31/);
  assert.equal(order.title, 'Safe order #7 created');
  assert.deepEqual(Object.keys(swap).sort(), ['detail', 'title', 'type']);
  assert.doesNotMatch(JSON.stringify([swap, order]), /plaintext|1000|0\.5/i);
});

test('keeps Safe unwrap recovery identifiers in public activity metadata', () => {
  const requestId = `0x${'44'.repeat(32)}`;
  const activity = normalizeSafeActivityEvent({
    eventName: 'SafeUnwrapRequested',
    source: 'module',
    tokenSymbol: 'cUSDC',
    args: {
      recipient: '0x1111111111111111111111111111111111111111',
      token: '0x2222222222222222222222222222222222222222',
      unwrapRequestId: requestId,
    },
  });
  assert.equal(activity.type, 'unwrap-request');
  assert.equal(activity.requestId, requestId);
  assert.equal(activity.tokenSymbol, 'cUSDC');
});

test('Safe activity checkpoint cache is deployment-scoped and public-only', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const identity = {
    chainId: 11155111,
    safeAddress: '0x1111111111111111111111111111111111111111',
    deploymentBlock: 100,
  };
  const index = {
    version: 1,
    chainId: identity.chainId,
    safeAddress: identity.safeAddress,
    deploymentBlock: identity.deploymentBlock,
    checkpointBlock: 120,
    items: [{
      id: '0xtx-0',
      hash: '0xtx',
      blockNumber: 110,
      logIndex: 0,
      timestamp: 1,
      type: 'order',
      title: 'Safe order #1 created',
      detail: 'Amount and minimum output remain encrypted.',
    }],
  };
  assert.equal(saveSafeActivityIndex(storage, index), true);
  assert.deepEqual(loadSafeActivityIndex(storage, identity), index);
  assert.doesNotMatch(JSON.stringify(index), /plaintext|proof|signature|privateKey/i);
});

test('Safe activity queries each source address separately for RPC compatibility', async () => {
  const calls = [];
  const provider = {
    getLogs: async (filter) => {
      calls.push(filter);
      return [];
    },
  };
  const tokens = {
    cUSDC: { symbol: 'cUSDC', wrapper: '0x1111111111111111111111111111111111111111' },
    cETH: { symbol: 'cETH', wrapper: '0x2222222222222222222222222222222222222222' },
  };
  const items = await querySafeActivity({
    provider,
    safeAddress: '0x3333333333333333333333333333333333333333',
    moduleAddress: '0x4444444444444444444444444444444444444444',
    moduleAddresses: ['0x4444444444444444444444444444444444444444'],
    tokens,
    deploymentBlock: 100,
    latestBlock: 120,
    storage: null,
  });
  assert.deepEqual(items, []);
  assert.equal(calls.length, 4);
  assert(calls.every(({ address }) => typeof address === 'string'));
});
