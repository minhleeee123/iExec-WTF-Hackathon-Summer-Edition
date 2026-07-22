import assert from 'node:assert/strict';
import test from 'node:test';
import { getCooldownRemaining, validateNonNegativeAmount, validateTokenAmount } from './validation.js';

test('faucet cooldown reaches zero and never becomes negative', () => {
  assert.equal(getCooldownRemaining(4600, 1000), 3600);
  assert.equal(getCooldownRemaining(1000, 1000), 0);
  assert.equal(getCooldownRemaining(900, 1000), 0);
});

test('token amount validation accepts an amount within the balance', () => {
  assert.deepEqual(validateTokenAmount('1.25', 6, 2_000_000n), {
    amount: 1_250_000n,
    error: '',
  });
});

test('token amount validation rejects missing private balance and excess amounts', () => {
  assert.match(validateTokenAmount('1', 18, null).error, /Reveal/);
  assert.match(validateTokenAmount('2.1', 6, 2_000_000n).error, /exceeds/);
});

test('token amount validation rejects zero and excessive precision', () => {
  assert.match(validateTokenAmount('0', 6, 1n).error, /greater than zero/);
  assert.match(validateTokenAmount('0.0000001', 6, 1n).error, /at most 6/);
});

test('minimum output accepts zero and rejects invalid precision', () => {
  assert.deepEqual(validateNonNegativeAmount('0', 18), { amount: 0n, error: '' });
  assert.match(validateNonNegativeAmount('0.0000001', 6).error, /at most 6/);
});
