import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ORDER_STATUS,
  quoteConstantProduct,
  settleSwapReference,
  transitionOrder,
} from '../lib/protocol-model.js';

const owner = '0x0000000000000000000000000000000000000001';
const executor = '0x0000000000000000000000000000000000000002';

function deterministicValues(seed = 0x6d2b79f5) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return BigInt(state);
  };
}

test('reference settlement accepts at minOut and refunds the entire input above the quote', () => {
  const quotedOut = quoteConstantProduct({ amountIn: 100n, reserveIn: 10_000n, reserveOut: 5_000n });
  const accepted = settleSwapReference({ amountIn: 100n, minimumOut: quotedOut, reserveIn: 10_000n, reserveOut: 5_000n });
  const rejected = settleSwapReference({ amountIn: 100n, minimumOut: quotedOut + 1n, reserveIn: 10_000n, reserveOut: 5_000n });

  assert.equal(accepted.output, quotedOut);
  assert.equal(accepted.refund, 0n);
  assert.equal(rejected.output, 0n);
  assert.equal(rejected.refund, 100n);
});

test('fuzzed settlement preserves input and reserves across accepted and rejected paths', () => {
  const random = deterministicValues();
  for (let index = 0; index < 2_000; index += 1) {
    const reserveIn = 1n + random() % 10_000_000_000n;
    const reserveOut = 1n + random() % 10_000_000_000n;
    const amountIn = random() % 1_000_000n;
    const quote = quoteConstantProduct({ amountIn, reserveIn, reserveOut });
    const minimumOut = random() % (quote + 2n);
    const result = settleSwapReference({ amountIn, minimumOut, reserveIn, reserveOut });

    assert.equal(result.acceptedInput + result.refund, amountIn);
    assert.equal(result.reserveInAfter, reserveIn + result.acceptedInput);
    assert.equal(result.reserveOutAfter + result.output, reserveOut);
    assert(result.output <= reserveOut);
    if (result.accepted) {
      assert(result.output >= minimumOut);
      assert.equal(result.refund, 0n);
    } else {
      assert.equal(result.output, 0n);
      assert.equal(result.refund, amountIn);
    }
  }
});

test('order permissions distinguish owner cancellation from permissionless execution and expiry', () => {
  assert.equal(transitionOrder({ action: 'execute', status: 0, owner, caller: executor, blockTimestamp: 100, expiry: 200, triggerReached: true }), ORDER_STATUS.EXECUTED);
  assert.equal(transitionOrder({ action: 'expire', status: 0, owner, caller: executor, blockTimestamp: 201, expiry: 200 }), ORDER_STATUS.EXPIRED);
  assert.throws(() => transitionOrder({ action: 'cancel', status: 0, owner, caller: executor, blockTimestamp: 100, expiry: 200 }), /not-owner/);
  assert.equal(transitionOrder({ action: 'cancel', status: 0, owner, caller: owner, blockTimestamp: 100, expiry: 200 }), ORDER_STATUS.CANCELLED);
});

test('an order can enter at most one terminal state and never settles twice', () => {
  for (const firstAction of ['execute', 'cancel', 'expire']) {
    const context = {
      action: firstAction,
      status: ORDER_STATUS.OPEN,
      owner,
      caller: firstAction === 'cancel' ? owner : executor,
      blockTimestamp: firstAction === 'expire' ? 201 : 100,
      expiry: 200,
      triggerReached: true,
    };
    const terminalStatus = transitionOrder(context);
    for (const secondAction of ['execute', 'cancel', 'expire']) {
      assert.throws(() => transitionOrder({ ...context, action: secondAction, status: terminalStatus }), /not-open/);
    }
  }
});
