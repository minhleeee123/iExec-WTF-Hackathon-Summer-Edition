import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendOperationStep,
  createOperationProgress,
  finishOperationProgress,
} from './operation-progress.js';

test('progress identifies Safe and personal operations with an active first step', () => {
  const safe = createOperationProgress('safe-unwrap');
  const personal = createOperationProgress('swap');
  assert.equal(safe.title, 'Safe unwrap');
  assert.equal(personal.title, 'Protected swap');
  assert.equal(safe.steps[0].state, 'active');
});

test('progress preserves completed stages and advances one active stage', () => {
  const started = createOperationProgress('safe-swap');
  const submitted = appendOperationStep(started, {
    type: 'info',
    text: 'Transaction submitted. Waiting for Sepolia confirmation…',
    href: 'https://sepolia.etherscan.io/tx/0x1',
  });
  assert.equal(submitted.steps.length, 2);
  assert.equal(submitted.steps[0].state, 'complete');
  assert.equal(submitted.steps[1].state, 'active');
  assert.equal(submitted.href, 'https://sepolia.etherscan.io/tx/0x1');
});

test('finishing progress resolves its active stage without losing history', () => {
  const progress = appendOperationStep(createOperationProgress('unwrap'), {
    type: 'info',
    text: 'Waiting for the public decryption proof…',
  });
  const finished = finishOperationProgress(progress);
  assert.equal(finished.complete, true);
  assert.equal(finished.type, 'success');
  assert(progress.steps.every((step) => step.state !== 'failed'));
  assert(finished.steps.every((step) => step.state === 'complete'));
});

test('failed stages remain explicit for recovery', () => {
  const progress = appendOperationStep(createOperationProgress('safe-fund'), {
    type: 'error',
    text: 'Wallet rejected the transaction.',
  });
  const finished = finishOperationProgress(progress, true);
  assert.equal(finished.type, 'error');
  assert.equal(finished.steps.at(-1).state, 'failed');
});
