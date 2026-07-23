import assert from 'node:assert/strict';
import test from 'node:test';
import { ethers } from 'ethers';
import { normalizeSafeActivityEvent } from './safe-activity.js';

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
