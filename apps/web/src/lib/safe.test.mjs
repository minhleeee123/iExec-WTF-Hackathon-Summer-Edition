import assert from 'node:assert/strict';
import test from 'node:test';
import { ethers } from 'ethers';
import { createPrevalidatedSafeSignature, normalizeSafeEthSign, parseSafeCreatedEvent, resolveOwnedSafe } from './safe.js';

test('Safe browser signature is normalized to the eth_sign v=31/32 format', async () => {
  const owner = ethers.Wallet.createRandom();
  const hash = ethers.keccak256(ethers.toUtf8Bytes('safe transaction hash'));
  const personal = await owner.signMessage(ethers.getBytes(hash));
  const normalized = normalizeSafeEthSign(personal);
  const safeV = Number.parseInt(normalized.slice(-2), 16);
  assert.ok(safeV === 31 || safeV === 32);
  assert.equal(ethers.recoverAddress(ethers.hashMessage(ethers.getBytes(hash)), personal), owner.address);
});

test('Safe prevalidated signature encodes the submitting 1-of-1 owner', () => {
  const owner = ethers.Wallet.createRandom().address;
  const signature = createPrevalidatedSafeSignature(owner);
  assert.equal(ethers.dataLength(signature), 65);
  assert.equal(ethers.getAddress(ethers.dataSlice(signature, 12, 32)), owner);
  assert.equal(ethers.dataSlice(signature, 32, 64), ethers.ZeroHash);
  assert.equal(signature.slice(-2), '01');
});

test('Safe registry resolves one Safe and bound module for the connected owner', async () => {
  const owner = ethers.Wallet.createRandom().address;
  const safeAddress = ethers.Wallet.createRandom().address;
  const moduleAddress = ethers.Wallet.createRandom().address;
  const calls = [];
  const factory = {
    safeOf: async (value, overrides) => { calls.push(['safe', value, overrides]); return safeAddress; },
    moduleOf: async (value, overrides) => { calls.push(['module', value, overrides]); return moduleAddress; },
  };
  const registration = await resolveOwnedSafe(factory, owner, { blockTag: 42 });
  assert.deepEqual(registration, { safeAddress, moduleAddress });
  assert.deepEqual(calls, [
    ['safe', owner, { blockTag: 42 }],
    ['module', safeAddress, { blockTag: 42 }],
  ]);
});

test('Safe registry distinguishes missing accounts and invalid module bindings', async () => {
  assert.equal(await resolveOwnedSafe({ safeOf: async () => ethers.ZeroAddress }, ethers.Wallet.createRandom().address), null);
  await assert.rejects(
    resolveOwnedSafe({ safeOf: async () => ethers.Wallet.createRandom().address, moduleOf: async () => ethers.ZeroAddress }, ethers.Wallet.createRandom().address),
    /no Nox module/i,
  );
});

test('Safe creation parser ignores unrelated logs and returns the factory event', () => {
  const expected = { name: 'NoxSafeCreated', args: { safe: ethers.Wallet.createRandom().address } };
  const factory = { interface: { parseLog: (log) => { if (log.kind === 'created') return expected; throw new Error('unknown'); } } };
  assert.equal(parseSafeCreatedEvent({ logs: [{ kind: 'other' }, { kind: 'created' }] }, factory), expected);
  assert.equal(parseSafeCreatedEvent({ logs: [{ kind: 'other' }] }, factory), null);
});
