import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decryptWithRetry,
  isRetryableNoxError,
  retry,
} from './nox.js';

test('adaptive retry backs off and eventually returns a Gateway result', async () => {
  const delays = [];
  let calls = 0;
  const result = await retry(async () => {
    calls += 1;
    if (calls < 3) throw new Error('Gateway result is not ready');
    return 'ready';
  }, {
    attempts: 4,
    baseDelayMs: 100,
    jitterRatio: 0,
    maxDelayMs: 1_000,
    sleepFn: async (delay) => { delays.push(delay); },
  });
  assert.equal(result, 'ready');
  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
});

test('invalid proofs fail immediately instead of wasting retries', async () => {
  let calls = 0;
  await assert.rejects(
    retry(async () => {
      calls += 1;
      throw new Error('Invalid input proof');
    }, {
      attempts: 5,
      sleepFn: async () => {},
    }),
    /Invalid input proof/,
  );
  assert.equal(calls, 1);
  assert.equal(isRetryableNoxError(new Error('Invalid input proof')), false);
});

test('concurrent decrypts for the same handle share one in-flight request', async () => {
  let calls = 0;
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const client = {
    decrypt: async () => {
      calls += 1;
      await waiting;
      return { value: 7n };
    },
  };
  const first = decryptWithRetry(client, '0x1234', { attempts: 1 });
  const second = decryptWithRetry(client, '0x1234', { attempts: 1 });
  release();
  const results = await Promise.all([first, second]);
  assert.equal(calls, 1);
  assert.deepEqual(results, [{ value: 7n }, { value: 7n }]);
});
