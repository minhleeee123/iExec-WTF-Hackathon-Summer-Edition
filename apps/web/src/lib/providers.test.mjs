import assert from 'node:assert/strict';
import test from 'node:test';

import { cachedImmutableRead, clearProviderCachesForTests } from './providers.js';

test('immutable public reads are shared and rejected reads are evicted', async () => {
  clearProviderCachesForTests();
  let calls = 0;
  const read = () => cachedImmutableRead('faucet:cUSDC', async () => {
    calls += 1;
    return 42n;
  });
  assert.deepEqual(await Promise.all([read(), read()]), [42n, 42n]);
  assert.equal(calls, 1);

  let failures = 0;
  await assert.rejects(cachedImmutableRead('failure', async () => {
    failures += 1;
    throw new Error('temporary');
  }));
  await assert.rejects(cachedImmutableRead('failure', async () => {
    failures += 1;
    throw new Error('temporary');
  }));
  assert.equal(failures, 2);
});
