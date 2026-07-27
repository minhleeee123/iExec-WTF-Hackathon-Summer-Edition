import { ethers } from 'ethers';
import { CONFIDENTIAL_TOKEN_ABI, SAFE_ABI, SAFE_MODULE_ABI } from '../contracts.js';

const LOG_CHUNK_SIZE = 500;
const INDEX_VERSION = 1;
const FINALITY_BLOCKS = 12;
const MAX_CACHED_ACTIVITY = 200;

function short(value, leading = 8, trailing = 6) {
  if (!value || value.length <= leading + trailing + 1) return value ?? '';
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}

async function getAddressLogs(provider, address, fromBlock, toBlock) {
  if (fromBlock > toBlock) return [];
  try {
    return await provider.getLogs({ address, fromBlock, toBlock });
  } catch {
    if (Array.isArray(address)) {
      const logsByAddress = await Promise.all(
        address.map((singleAddress) => getAddressLogs(provider, singleAddress, fromBlock, toBlock)),
      );
      return logsByAddress.flat();
    }
    const logs = [];
    for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
      const end = Math.min(toBlock, start + LOG_CHUNK_SIZE - 1);
      logs.push(...await provider.getLogs({ address, fromBlock: start, toBlock: end }));
    }
    return logs;
  }
}

function indexKey({ chainId, safeAddress }) {
  return `noxswap:safe-activity:v${INDEX_VERSION}:${chainId}:${safeAddress.toLowerCase()}`;
}

export function loadSafeActivityIndex(storage, identity) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(indexKey(identity)));
    if (
      value?.version !== INDEX_VERSION
      || value.chainId !== Number(identity.chainId)
      || value.safeAddress !== identity.safeAddress.toLowerCase()
      || value.deploymentBlock !== Number(identity.deploymentBlock)
      || !Number.isInteger(value.checkpointBlock)
      || !Array.isArray(value.items)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveSafeActivityIndex(storage, index) {
  if (!storage) return false;
  try {
    storage.setItem(indexKey(index), JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

function dedupeAndSort(items) {
  const unique = new Map();
  for (const item of items) unique.set(item.id, item);
  return [...unique.values()].sort((left, right) => (
    right.blockNumber - left.blockNumber || right.logIndex - left.logIndex
  ));
}

export function normalizeSafeActivityEvent({ eventName, args, source, tokenSymbol = '' }) {
  if (source === 'wrapper' && eventName === 'ConfidentialTransfer' && args.from === ethers.ZeroAddress) {
    return { type: 'fund', title: `Funded ${tokenSymbol}`, detail: `Encrypted ${tokenSymbol} minted to the Safe treasury.` };
  }
  if (eventName === 'SafeSwapExecuted') {
    return { type: 'swap', title: 'Protected Safe swap', detail: `${short(args.tokenIn)} → ${short(args.tokenOut)} · receipt #${args.receiptId}` };
  }
  if (eventName === 'SafeOrderCreated') {
    return { type: 'order', title: `Safe order #${args.orderId} created`, detail: 'Amount and minimum output remain encrypted.' };
  }
  if (eventName === 'SafeOrderCancelled') {
    return { type: 'cancel', title: `Safe order #${args.orderId} cancelled`, detail: 'Encrypted escrow was returned to the Safe.' };
  }
  if (eventName === 'SafeUnwrapRequested') {
    return {
      type: 'unwrap-request',
      title: `Unwrap ${tokenSymbol || 'asset'} requested`,
      detail: `Public release to ${short(args.recipient)} is waiting for Nox proof finalization.`,
      recipient: args.recipient,
      requestId: args.unwrapRequestId,
      token: args.token,
      tokenSymbol,
    };
  }
  if (source === 'wrapper' && eventName === 'UnwrapFinalized') {
    return {
      type: 'unwrap-finalized',
      title: `Unwrap ${tokenSymbol} finalized`,
      detail: `Public ${tokenSymbol} underlying was released to ${short(args.receiver)}.`,
      recipient: args.receiver,
      requestId: args.encryptedAmount,
      tokenSymbol,
    };
  }
  if (eventName === 'SafeViewerAdded') {
    return { type: 'viewer', title: 'Viewer access granted', detail: `${short(args.viewer)} can inspect handle ${short(args.handle)}.` };
  }
  if (eventName === 'SafeTokenOperatorUpdated') {
    const active = args.until > 0n;
    return { type: 'operator', title: active ? 'Token operator authorized' : 'Token operator revoked', detail: `${short(args.operator)} · token ${short(args.token)}` };
  }
  if (eventName === 'SafeModuleRevoked' || eventName === 'DisabledModule') {
    return { type: 'security', title: 'Nox module revoked', detail: 'Safe custody and owner threshold remained unchanged.' };
  }
  if (eventName === 'EnabledModule') {
    return { type: 'security', title: 'Nox module enabled', detail: `Module ${short(args.module)} can route allowlisted Nox operations.` };
  }
  return null;
}

export async function querySafeActivity({
  provider,
  safeAddress,
  moduleAddress,
  moduleAddresses = [moduleAddress],
  tokens,
  deploymentBlock,
  latestBlock,
  limit = 50,
  chainId = 11155111,
  storage,
}) {
  const moduleInterface = new ethers.Interface(SAFE_MODULE_ABI);
  const safeInterface = new ethers.Interface(SAFE_ABI);
  const wrapperInterface = new ethers.Interface(CONFIDENTIAL_TOKEN_ABI);
  const tokenByAddress = new Map(Object.values(tokens).map((token) => [token.wrapper.toLowerCase(), token]));
  const normalizedModules = new Set(moduleAddresses.map((address) => address.toLowerCase()));
  const addresses = [...new Set([...moduleAddresses, safeAddress, ...tokenByAddress.keys()])];
  const identity = { chainId, safeAddress, deploymentBlock };
  let index = loadSafeActivityIndex(storage, identity) ?? {
    version: INDEX_VERSION,
    chainId: Number(chainId),
    safeAddress: safeAddress.toLowerCase(),
    deploymentBlock: Number(deploymentBlock),
    checkpointBlock: Number(deploymentBlock) - 1,
    items: [],
  };
  if (index.checkpointBlock > latestBlock) {
    index = {
      ...index,
      checkpointBlock: Number(deploymentBlock) - 1,
      items: [],
    };
  }
  const fromBlock = Math.max(Number(deploymentBlock), index.checkpointBlock + 1);
  const logs = await getAddressLogs(provider, addresses, fromBlock, latestBlock);
  const candidates = [];

  for (const log of logs) {
      const address = log.address.toLowerCase();
      const source = normalizedModules.has(address) ? 'module' : address === safeAddress.toLowerCase() ? 'safe' : 'wrapper';
      const parser = source === 'module' ? moduleInterface : source === 'safe' ? safeInterface : wrapperInterface;
      let parsed;
      try {
        parsed = parser.parseLog(log);
      } catch {
        continue;
      }
      if (!parsed) continue;
      if (source === 'module' && parsed.args.safe?.toLowerCase() !== safeAddress.toLowerCase()) continue;
      if (source === 'safe' && !normalizedModules.has(parsed.args.module?.toLowerCase())) continue;
      if (source === 'wrapper' && parsed.name === 'ConfidentialTransfer' && parsed.args.to?.toLowerCase() !== safeAddress.toLowerCase()) continue;
      const normalized = normalizeSafeActivityEvent({
        eventName: parsed.name,
        args: parsed.args,
        source,
        tokenSymbol: tokenByAddress.get((parsed.args.token ?? log.address).toLowerCase())?.symbol,
      });
      if (!normalized) continue;
      candidates.push({
        ...normalized,
        id: `${log.transactionHash}-${log.index}`,
        hash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.index,
      });
  }

  const safeUnwrapIds = new Set(
    [...index.items, ...candidates]
      .filter((item) => item.type === 'unwrap-request')
      .map((item) => item.requestId),
  );
  const normalizedCandidates = candidates
    .filter((item) => item.type !== 'unwrap-finalized' || safeUnwrapIds.has(item.requestId))
    .filter((item, itemIndex, all) => all.findIndex((candidate) => candidate.hash === item.hash && candidate.title === item.title) === itemIndex);
  const blocks = new Map();
  await Promise.all([...new Set(normalizedCandidates.map((item) => item.blockNumber))].map(async (blockNumber) => {
    blocks.set(blockNumber, await provider.getBlock(blockNumber));
  }));
  const timestamped = normalizedCandidates.map((item) => ({
    ...item,
    timestamp: Number(blocks.get(item.blockNumber)?.timestamp ?? 0),
  }));
  const checkpointBlock = Math.max(
    Number(deploymentBlock) - 1,
    Number(latestBlock) - FINALITY_BLOCKS,
  );
  const finalized = timestamped.filter((item) => item.blockNumber <= checkpointBlock);
  const overlay = timestamped.filter((item) => item.blockNumber > checkpointBlock);
  index = {
    ...index,
    checkpointBlock,
    items: dedupeAndSort([...index.items, ...finalized]).slice(0, MAX_CACHED_ACTIVITY),
  };
  saveSafeActivityIndex(storage, index);
  return dedupeAndSort([...index.items, ...overlay]).slice(0, limit);
}
