import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadPendingNoxJobs,
  removePendingNoxJob,
  savePendingNoxJob,
} from './pending-nox-jobs.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('pending jobs persist only allowlisted public recovery metadata', () => {
  const storage = memoryStorage();
  const saved = savePendingNoxJob(storage, {
    account: '0xABC',
    chainId: 11155111,
    contract: '0xcontract',
    createdAt: 1,
    handles: ['0xhandle'],
    operationType: 'personal-swap',
    transactionHash: '0xtx',
    decryptedValue: 'must-not-persist',
    inputProof: 'must-not-persist',
    privateKey: 'must-not-persist',
  });
  assert.deepEqual(Object.keys(saved).sort(), [
    'account',
    'chainId',
    'contract',
    'createdAt',
    'handles',
    'operationType',
    'transactionHash',
  ]);
  const raw = JSON.stringify(loadPendingNoxJobs(storage));
  assert.doesNotMatch(raw, /decryptedValue|inputProof|privateKey|must-not-persist/);
  assert.equal(loadPendingNoxJobs(storage, { account: '0xabc', chainId: 11155111 }).length, 1);
  removePendingNoxJob(storage, saved);
  assert.deepEqual(loadPendingNoxJobs(storage), []);
});

test('pending job schema rejects secret-bearing or unknown operation shapes', () => {
  const storage = memoryStorage();
  assert.throws(() => savePendingNoxJob(storage, {
    account: '0xabc',
    chainId: 11155111,
    contract: '0xcontract',
    handles: [],
    operationType: 'arbitrary-call',
    transactionHash: '0xtx',
  }), /Invalid pending Nox job/);
});
