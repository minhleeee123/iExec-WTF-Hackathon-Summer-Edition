import { ethers } from 'ethers';

import deployment from '../deployment.json' with { type: 'json' };
import { ORDER_HISTORY_RPC_URL, RPC_URL } from '../config.js';

let publicProvider;
let historyProvider;
const immutableReads = new Map();

function createProvider(url) {
  return new ethers.JsonRpcProvider(url, deployment.chainId, {
    staticNetwork: true,
    batchMaxCount: 20,
    batchStallTime: 10,
  });
}

export function getPublicProvider() {
  publicProvider ??= createProvider(RPC_URL);
  return publicProvider;
}

export function getHistoryProvider() {
  historyProvider ??= createProvider(ORDER_HISTORY_RPC_URL);
  return historyProvider;
}

export async function cachedImmutableRead(key, operation) {
  const cached = immutableReads.get(key);
  if (cached) return cached;
  const pending = Promise.resolve().then(operation);
  immutableReads.set(key, pending);
  try {
    return await pending;
  } catch (error) {
    if (immutableReads.get(key) === pending) immutableReads.delete(key);
    throw error;
  }
}

export function clearProviderCachesForTests() {
  immutableReads.clear();
  publicProvider = undefined;
  historyProvider = undefined;
}
