import assert from 'node:assert/strict';
import test from 'node:test';

import { applySwapBalanceDelta, decryptChangedBalances } from './private-balances.js';

const handle = (suffix) => `0x${suffix.padStart(64, '0')}`;

test('balance reveal preserves unchanged plaintext and decrypts changed handles concurrently', async () => {
  const current = {
    cUSDC: { handle: handle('1'), decrypted: 100n },
    cETH: { handle: handle('2'), decrypted: 3n },
  };
  const snapshot = {
    cUSDC: { handle: handle('1'), decrypted: null },
    cETH: { handle: handle('3'), decrypted: null },
  };
  let calls = 0;
  const result = await decryptChangedBalances({
    client: {},
    current,
    decrypt: async (_client, encryptedHandle) => {
      calls += 1;
      assert.equal(encryptedHandle, handle('3'));
      return { value: 4n };
    },
    isEncryptedHandle: (value) => value !== handle('0'),
    snapshot,
    tokenSymbols: ['cUSDC', 'cETH'],
  });
  assert.equal(calls, 1);
  assert.equal(result.balances.cUSDC.decrypted, 100n);
  assert.equal(result.balances.cETH.decrypted, 4n);
  assert.deepEqual(result.errors, []);
});

test('partial Gateway failure keeps successful token reveals', async () => {
  const snapshot = {
    cUSDC: { handle: handle('1'), decrypted: null },
    cETH: { handle: handle('2'), decrypted: null },
  };
  const result = await decryptChangedBalances({
    client: {},
    current: {},
    decrypt: async (_client, encryptedHandle) => {
      if (encryptedHandle === handle('2')) throw new Error('not ready');
      return { value: 8n };
    },
    isEncryptedHandle: () => true,
    snapshot,
    tokenSymbols: ['cUSDC', 'cETH'],
  });
  assert.equal(result.balances.cUSDC.decrypted, 8n);
  assert.equal(result.balances.cETH.decrypted, null);
  assert.equal(result.errors.length, 1);
});

test('optimistic swap delta preserves conservation for accepted and refunded swaps', () => {
  const balances = {
    cUSDC: { handle: handle('1'), decrypted: 1_000n },
    cETH: { handle: handle('2'), decrypted: 10n },
  };
  const accepted = applySwapBalanceDelta({
    balances,
    amountIn: 200n,
    outputAmount: 5n,
    refundAmount: 0n,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  });
  assert.equal(accepted.cUSDC.decrypted, 800n);
  assert.equal(accepted.cETH.decrypted, 15n);
  const rejected = applySwapBalanceDelta({
    balances,
    amountIn: 200n,
    outputAmount: 0n,
    refundAmount: 200n,
    tokenIn: 'cUSDC',
    tokenOut: 'cETH',
  });
  assert.equal(rejected.cUSDC.decrypted, 1_000n);
  assert.equal(rejected.cETH.decrypted, 10n);
});
