import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyProviderEntries, selectWalletProvider } from './wallet-providers.js';

test('selects MetaMask instead of a Coinbase-owned window.ethereum provider', () => {
  const coinbase = { isCoinbaseWallet: true, isMetaMask: true };
  const metamask = { isMetaMask: true };
  const ethereum = { providers: [coinbase, metamask] };

  assert.equal(selectWalletProvider('metamask', [], ethereum), metamask);
  assert.equal(selectWalletProvider('coinbase', [], ethereum), coinbase);
});

test('prefers the requested EIP-6963 provider identity', () => {
  const injected = { name: 'legacy' };
  const rabby = { name: 'rabby' };
  const announced = [{ info: { name: 'Rabby Wallet', rdns: 'io.rabby' }, provider: rabby }];

  assert.equal(selectWalletProvider('rabby', announced, injected), rabby);
  assert.equal(selectWalletProvider('injected', announced, injected), rabby);
});

test('legacy provider discovery removes duplicate provider objects', () => {
  const provider = { isMetaMask: true };
  assert.deepEqual(legacyProviderEntries({ providers: [provider, provider] }), [{ info: null, provider }]);
  assert.equal(selectWalletProvider('coinbase', [], provider), null);
});
