import assert from 'node:assert/strict';
import test from 'node:test';
import { ethers } from 'ethers';
import { normalizeSafeEthSign } from './safe.js';

test('Safe browser signature is normalized to the eth_sign v=31/32 format', async () => {
  const owner = ethers.Wallet.createRandom();
  const hash = ethers.keccak256(ethers.toUtf8Bytes('safe transaction hash'));
  const personal = await owner.signMessage(ethers.getBytes(hash));
  const normalized = normalizeSafeEthSign(personal);
  const safeV = Number.parseInt(normalized.slice(-2), 16);
  assert.ok(safeV === 31 || safeV === 32);
  assert.equal(ethers.recoverAddress(ethers.hashMessage(ethers.getBytes(hash)), personal), owner.address);
});
