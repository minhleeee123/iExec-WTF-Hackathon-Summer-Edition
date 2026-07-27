import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import { waitForBlockOrTimeout } from '../src/keeper-wakeup.js';

test('keeper wakes on a new block and removes its listener', async () => {
  const provider = new EventEmitter();
  const waiting = waitForBlockOrTimeout({ provider, timeoutMs: 1_000 });
  provider.emit('block', 123);
  assert.equal(await waiting, 'block');
  assert.equal(provider.listenerCount('block'), 0);
});

test('keeper polling timeout remains a fallback when no block event arrives', async () => {
  const provider = new EventEmitter();
  assert.equal(await waitForBlockOrTimeout({ provider, timeoutMs: 1 }), 'timeout');
});

test('keeper shutdown aborts an outstanding wakeup', async () => {
  const provider = new EventEmitter();
  const controller = new AbortController();
  const waiting = waitForBlockOrTimeout({ provider, timeoutMs: 1_000, signal: controller.signal });
  controller.abort();
  assert.equal(await waiting, 'abort');
});
