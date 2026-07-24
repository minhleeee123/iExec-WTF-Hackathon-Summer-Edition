import { ethers } from 'ethers';
import { CONFIDENTIAL_TOKEN_ABI, SAFE_ABI, SAFE_MODULE_ABI } from '../contracts.js';

const LOG_CHUNK_SIZE = 500;

function short(value, leading = 8, trailing = 6) {
  if (!value || value.length <= leading + trailing + 1) return value ?? '';
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}

async function getAddressLogs(provider, address, fromBlock, toBlock) {
  try {
    return await provider.getLogs({ address, fromBlock, toBlock });
  } catch {
    const logs = [];
    for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
      const end = Math.min(toBlock, start + LOG_CHUNK_SIZE - 1);
      logs.push(...await provider.getLogs({ address, fromBlock: start, toBlock: end }));
    }
    return logs;
  }
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
}) {
  const moduleInterface = new ethers.Interface(SAFE_MODULE_ABI);
  const safeInterface = new ethers.Interface(SAFE_ABI);
  const wrapperInterface = new ethers.Interface(CONFIDENTIAL_TOKEN_ABI);
  const tokenByAddress = new Map(Object.values(tokens).map((token) => [token.wrapper.toLowerCase(), token]));
  const normalizedModules = new Set(moduleAddresses.map((address) => address.toLowerCase()));
  const addresses = [...moduleAddresses, safeAddress, ...tokenByAddress.keys()];
  const logsByAddress = await Promise.all(addresses.map((address) => getAddressLogs(provider, address, deploymentBlock, latestBlock)));
  const candidates = [];

  for (const logs of logsByAddress) {
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
  }

  const safeUnwrapIds = new Set(candidates.filter((item) => item.type === 'unwrap-request').map((item) => item.requestId));
  const deduped = candidates
    .filter((item) => item.type !== 'unwrap-finalized' || safeUnwrapIds.has(item.requestId))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.hash === item.hash && candidate.title === item.title) === index)
    .sort((left, right) => right.blockNumber - left.blockNumber || right.logIndex - left.logIndex)
    .slice(0, limit);
  const blocks = new Map();
  await Promise.all([...new Set(deduped.map((item) => item.blockNumber))].map(async (blockNumber) => {
    blocks.set(blockNumber, await provider.getBlock(blockNumber));
  }));
  return deduped.map((item) => ({ ...item, timestamp: Number(blocks.get(item.blockNumber)?.timestamp ?? 0) }));
}
