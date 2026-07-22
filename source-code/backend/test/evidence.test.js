import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assertEvidenceSafe, resolveSourceState, writeEvidence } from '../scripts/lib/evidence.js';

test('evidence schema rejects confidential or secret-bearing fields', () => {
  assert.throws(() => assertEvidenceSafe({ privateKey: 'redacted' }), /Unsafe evidence field/);
  assert.throws(() => assertEvidenceSafe({ result: { decryptedOutput: '1' } }), /Unsafe evidence field/);
  assert.throws(() => assertEvidenceSafe({ orderHandle: '0x00' }), /Unsafe evidence field/);
});

test('evidence writer accepts public verification metadata', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'noxswap-evidence-'));
  const file = path.join(directory, 'evidence.json');
  writeEvidence(file, {
    commitSha: 'abc123',
    chainId: 11155111,
    transactions: { swap: '0x1234' },
    assertions: { swapConfirmed: true },
  });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).assertions.swapConfirmed, true);
});

test('source state records the commit and whether evidence came from dirty code', () => {
  const state = resolveSourceState(path.resolve(import.meta.dirname, '../../..'));
  assert.match(state.commitSha, /^[0-9a-f]{40}$/);
  assert.equal(typeof state.dirty, 'boolean');
});
