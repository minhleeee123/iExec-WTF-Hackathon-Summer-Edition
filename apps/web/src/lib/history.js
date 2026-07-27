const FALLBACK_BLOCK_WINDOW = 1200;
const FALLBACK_CHUNK_SIZE = 100;
const SWAP_INDEX_VERSION = 1;
const SWAP_FINALITY_BLOCKS = 12;
const MAX_SWAP_HISTORY = 100;

export async function queryEventsWithFallback(contract, filter, deploymentBlock, latestBlock) {
  try {
    return await contract.queryFilter(filter, deploymentBlock, latestBlock);
  } catch {
    const firstBlock = Math.max(deploymentBlock, latestBlock - FALLBACK_BLOCK_WINDOW);
    const events = [];
    for (let fromBlock = firstBlock; fromBlock <= latestBlock; fromBlock += FALLBACK_CHUNK_SIZE) {
      const toBlock = Math.min(latestBlock, fromBlock + FALLBACK_CHUNK_SIZE - 1);
      events.push(...await contract.queryFilter(filter, fromBlock, toBlock));
    }
    return events;
  }
}


export async function queryRecentSwapEvents(router, address, deploymentBlock, latestBlock) {
  return queryEventsWithFallback(
    router,
    router.filters.SwapExecuted(address),
    deploymentBlock,
    latestBlock,
  );
}

function swapIndexKey({ chainId, routerAddress, trader }) {
  return `noxswap:swap-index:v${SWAP_INDEX_VERSION}:${chainId}:${routerAddress.toLowerCase()}:${trader.toLowerCase()}`;
}

export function loadSwapIndex(storage, identity) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(swapIndexKey(identity)));
    if (
      value?.version !== SWAP_INDEX_VERSION
      || value.chainId !== Number(identity.chainId)
      || value.routerAddress !== identity.routerAddress.toLowerCase()
      || value.trader !== identity.trader.toLowerCase()
      || value.deploymentBlock !== Number(identity.deploymentBlock)
      || !Number.isInteger(value.checkpointBlock)
      || !Array.isArray(value.events)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveSwapIndex(storage, index) {
  if (!storage) return false;
  try {
    storage.setItem(swapIndexKey(index), JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

function normalizeSwapEvent(event) {
  return {
    hash: event.transactionHash,
    block: Number(event.blockNumber),
    logIndex: Number(event.index ?? event.logIndex ?? 0),
    tokenIn: event.args.tokenIn,
    tokenOut: event.args.tokenOut,
    inputHandle: event.args.encryptedInput,
    outputHandle: event.args.encryptedOutput,
    refundHandle: event.args.encryptedRefund,
    receiptId: event.args.receiptId.toString(),
  };
}

function mergeSwapEvents(events) {
  const merged = new Map();
  for (const event of events) merged.set(`${event.hash}:${event.logIndex}`, event);
  return [...merged.values()].sort((left, right) => (
    left.block - right.block || left.logIndex - right.logIndex
  ));
}

export async function queryRecentSwapHistory({
  address,
  chainId,
  deploymentBlock,
  latestBlock,
  router,
  routerAddress,
  storage,
}) {
  const identity = { address, chainId, deploymentBlock, routerAddress, trader: address };
  let index = loadSwapIndex(storage, identity) ?? {
    version: SWAP_INDEX_VERSION,
    chainId: Number(chainId),
    routerAddress: routerAddress.toLowerCase(),
    trader: address.toLowerCase(),
    deploymentBlock: Number(deploymentBlock),
    checkpointBlock: Number(deploymentBlock) - 1,
    events: [],
  };
  if (index.checkpointBlock > latestBlock) {
    index = { ...index, checkpointBlock: Number(deploymentBlock) - 1, events: [] };
  }
  const fromBlock = Math.max(Number(deploymentBlock), index.checkpointBlock + 1);
  const queried = fromBlock > latestBlock
    ? []
    : await queryEventsWithFallback(router, router.filters.SwapExecuted(address), fromBlock, latestBlock);
  const normalized = queried.map(normalizeSwapEvent);
  const checkpointBlock = Math.max(Number(deploymentBlock) - 1, Number(latestBlock) - SWAP_FINALITY_BLOCKS);
  const finalized = normalized.filter((event) => event.block <= checkpointBlock);
  const overlay = normalized.filter((event) => event.block > checkpointBlock);
  index = {
    ...index,
    checkpointBlock,
    events: mergeSwapEvents([...index.events, ...finalized]).slice(-MAX_SWAP_HISTORY),
  };
  saveSwapIndex(storage, index);
  return mergeSwapEvents([...index.events, ...overlay]);
}
