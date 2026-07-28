import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inspectSharedHandles,
  markChangedSharedHandle,
  storeSharedPlaintext,
} from './shared-access.js';

const handle = (suffix) => `0x${suffix.padStart(64, '0')}`;

test('shared access inspection distinguishes current grants and missing ACLs', async () => {
  const entries = await inspectSharedHandles({
    holder: '0xholder',
    isEncryptedHandle: (value) => value !== handle('0'),
    isViewer: async (value) => value === handle('1'),
    readHandle: async (symbol) => symbol === 'cUSDC' ? handle('1') : handle('2'),
    tokenSymbols: ['cUSDC', 'cETH'],
    viewer: '0xviewer',
  });
  assert.deepEqual(entries.map(({ status, symbol }) => ({ status, symbol })), [
    { status: 'shared', symbol: 'cUSDC' },
    { status: 'not-shared', symbol: 'cETH' },
  ]);
});

test('shared access inspection isolates uninitialized handles and RPC errors', async () => {
  let viewerReads = 0;
  const entries = await inspectSharedHandles({
    holder: '0xholder',
    isEncryptedHandle: (value) => value !== handle('0'),
    isViewer: async () => { viewerReads += 1; return true; },
    readHandle: async (symbol) => {
      if (symbol === 'cSOL') throw new Error('temporary RPC failure');
      return handle('0');
    },
    tokenSymbols: ['cWBTC', 'cSOL'],
    viewer: '0xviewer',
  });
  assert.equal(entries[0].status, 'uninitialized');
  assert.equal(entries[1].status, 'error');
  assert.match(entries[1].error, /temporary RPC failure/);
  assert.equal(viewerReads, 0);
});

test('shared plaintext remains scoped to the matching current handle', () => {
  const entries = [{ symbol: 'cUSDC', handle: handle('1'), status: 'shared', decrypted: null }];
  const revealed = storeSharedPlaintext(entries, {
    symbol: 'cUSDC',
    handle: handle('1'),
    value: 42n,
  });
  assert.equal(revealed[0].decrypted, 42n);
  const changed = markChangedSharedHandle(revealed, {
    symbol: 'cUSDC',
    currentHandle: handle('2'),
  });
  assert.equal(changed[0].status, 'changed');
  assert.equal(changed[0].decrypted, null);
  assert.equal(changed[0].currentHandle, handle('2'));
});
