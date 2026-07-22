import fs from 'node:fs/promises';
import path from 'node:path';

export const KEEPER_INDEX_VERSION = 1;
export const KEEPER_INDEX_FINALITY_BLOCKS = 12;
export const KEEPER_LOG_CHUNK_SIZE = 5_000;

const TERMINAL_EVENTS = new Set(['OrderExecuted', 'OrderCancelled', 'OrderExpired']);

export function createKeeperIndex({ chainId, contractAddress, deploymentBlock }) {
  return {
    version: KEEPER_INDEX_VERSION,
    chainId: Number(chainId),
    contractAddress: contractAddress.toLowerCase(),
    deploymentBlock: Number(deploymentBlock),
    checkpointBlock: Number(deploymentBlock) - 1,
    lastOrderId: 0,
    activeOrderIds: [],
  };
}

export function applyKeeperEvents(index, events, checkpointBlock = index.checkpointBlock) {
  const active = new Set(index.activeOrderIds.map(Number));
  let lastOrderId = Number(index.lastOrderId);
  const sorted = [...events].sort((left, right) => (
    left.blockNumber - right.blockNumber || left.logIndex - right.logIndex
  ));
  for (const event of sorted) {
    const orderId = Number(event.orderId);
    if (event.name === 'OrderCreated') {
      active.add(orderId);
      lastOrderId = Math.max(lastOrderId, orderId);
    } else if (TERMINAL_EVENTS.has(event.name)) {
      active.delete(orderId);
    }
  }
  return {
    ...index,
    checkpointBlock: Number(checkpointBlock),
    lastOrderId,
    activeOrderIds: [...active].sort((left, right) => left - right),
  };
}

export function normalizeKeeperLog(log, contractInterface) {
  const parsed = contractInterface.parseLog(log);
  if (!parsed) return null;
  return {
    name: parsed.name,
    orderId: Number(parsed.args.orderId),
    blockNumber: Number(log.blockNumber),
    logIndex: Number(log.index ?? log.logIndex ?? 0),
  };
}

export async function loadKeeperCheckpoint(file, identity) {
  if (!file) return null;
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    if (
      value?.version !== KEEPER_INDEX_VERSION
      || value.chainId !== Number(identity.chainId)
      || value.contractAddress !== identity.contractAddress.toLowerCase()
      || value.deploymentBlock !== Number(identity.deploymentBlock)
      || !Number.isInteger(value.checkpointBlock)
      || !Array.isArray(value.activeOrderIds)
    ) return null;
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return null;
  }
}

export async function saveKeeperCheckpoint(file, index) {
  if (!file) return false;
  const temporary = `${file}.tmp`;
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(temporary, `${JSON.stringify(index, null, 2)}\n`, { mode: 0o600 });
    await fs.rename(temporary, file);
    return true;
  } catch {
    await fs.rm(temporary, { force: true }).catch(() => {});
    return false;
  }
}

export async function queryKeeperLogs(provider, filter, fromBlock, toBlock, chunkSize = KEEPER_LOG_CHUNK_SIZE) {
  if (fromBlock > toBlock) return [];
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(toBlock, start + chunkSize - 1);
    logs.push(...await provider.getLogs({ ...filter, fromBlock: start, toBlock: end }));
  }
  return logs;
}

export function createKeeperOrderSource({
  chainId,
  checkpointFile,
  contract,
  contractAddress,
  deploymentBlock,
  finalityBlocks = KEEPER_INDEX_FINALITY_BLOCKS,
  headLagBlocks = 3,
  log = () => {},
  provider,
}) {
  const identity = { chainId, contractAddress, deploymentBlock };
  const topics = ['OrderCreated', 'OrderExecuted', 'OrderCancelled', 'OrderExpired']
    .map((eventName) => contract.interface.getEvent(eventName).topicHash);
  let finalizedIndex = null;

  async function scanFrom(base, latestBlock) {
    const fromBlock = Math.max(deploymentBlock, base.checkpointBlock + 1);
    const rawLogs = await queryKeeperLogs(provider, { address: contractAddress, topics: [topics] }, fromBlock, latestBlock);
    const events = rawLogs.map((event) => normalizeKeeperLog(event, contract.interface)).filter(Boolean);
    const nextCheckpoint = Math.max(base.checkpointBlock, latestBlock - finalityBlocks);
    const newlyFinalized = events.filter((event) => event.blockNumber <= nextCheckpoint);
    const overlay = events.filter((event) => event.blockNumber > nextCheckpoint);
    const nextBase = applyKeeperEvents(base, newlyFinalized, nextCheckpoint);
    return { nextBase, display: applyKeeperEvents(nextBase, overlay), fromBlock };
  }

  async function listActiveOrderIds() {
    const latestBlock = Math.max(deploymentBlock, await provider.getBlockNumber() - headLagBlocks);
    let base = finalizedIndex ?? await loadKeeperCheckpoint(checkpointFile, identity) ?? createKeeperIndex(identity);
    if (base.checkpointBlock > latestBlock) base = createKeeperIndex(identity);
    let result = await scanFrom(base, latestBlock);
    const expectedLastOrderId = Number(await contract.nextOrderId({ blockTag: latestBlock })) - 1;

    if (result.display.lastOrderId !== expectedLastOrderId && result.fromBlock > deploymentBlock) {
      log({ decision: 'index', result: 'checkpoint-mismatch-rebuild', indexedLastOrderId: result.display.lastOrderId, expectedLastOrderId });
      result = await scanFrom(createKeeperIndex(identity), latestBlock);
    }
    if (result.display.lastOrderId !== expectedLastOrderId) {
      throw new Error(`Order event index has ${result.display.lastOrderId} of ${expectedLastOrderId} created orders.`);
    }

    finalizedIndex = result.nextBase;
    if (!await saveKeeperCheckpoint(checkpointFile, finalizedIndex)) {
      log({ decision: 'index', result: 'checkpoint-write-skipped' });
    }
    return result.display.activeOrderIds;
  }

  return { listActiveOrderIds };
}
