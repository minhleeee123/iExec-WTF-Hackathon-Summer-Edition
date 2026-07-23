export const ORDER_INDEX_VERSION = 1;
export const ORDER_INDEX_FINALITY_BLOCKS = 12;
export const ORDER_INDEX_HEAD_LAG_BLOCKS = 3;
export const ORDER_LOG_CHUNK_SIZE = 5_000;

const TERMINAL_STATUS = Object.freeze({
  OrderExecuted: 1,
  OrderCancelled: 2,
  OrderExpired: 3,
});

export function createOrderIndex({ chainId, contractAddress, deploymentBlock }) {
  return {
    version: ORDER_INDEX_VERSION,
    chainId: Number(chainId),
    contractAddress: contractAddress.toLowerCase(),
    deploymentBlock: Number(deploymentBlock),
    checkpointBlock: Number(deploymentBlock) - 1,
    orders: {},
  };
}

export function orderIndexCacheKey({ chainId, contractAddress }) {
  return `noxswap:order-index:v${ORDER_INDEX_VERSION}:${chainId}:${contractAddress.toLowerCase()}`;
}

export function loadOrderIndex(storage, identity) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(orderIndexCacheKey(identity)));
    if (
      value?.version !== ORDER_INDEX_VERSION
      || value.chainId !== Number(identity.chainId)
      || value.contractAddress !== identity.contractAddress.toLowerCase()
      || value.deploymentBlock !== Number(identity.deploymentBlock)
      || !Number.isInteger(value.checkpointBlock)
      || !value.orders
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveOrderIndex(storage, index) {
  if (!storage) return false;
  try {
    storage.setItem(orderIndexCacheKey(index), JSON.stringify(index));
    return true;
  } catch {
    return false;
  }
}

export function normalizeOrderLog(log, contractInterface) {
  const parsed = contractInterface.parseLog(log);
  if (!parsed) return null;
  const orderId = parsed.args.orderId.toString();
  const common = {
    name: parsed.name,
    orderId,
    blockNumber: Number(log.blockNumber),
    transactionHash: log.transactionHash,
    logIndex: Number(log.index ?? log.logIndex ?? 0),
  };
  if (parsed.name !== 'OrderCreated') return common;
  return {
    ...common,
    owner: parsed.args.owner,
    tokenIn: parsed.args.tokenIn,
    tokenOut: parsed.args.tokenOut,
    amountHandle: parsed.args.encryptedAmountIn,
    minOutHandle: parsed.args.encryptedMinOut,
    triggerPrice: parsed.args.triggerPrice.toString(),
    expiry: Number(parsed.args.expiry),
  };
}

export function applyOrderEvents(index, events, checkpointBlock = index.checkpointBlock) {
  const next = {
    ...index,
    checkpointBlock: Number(checkpointBlock),
    orders: Object.fromEntries(Object.entries(index.orders).map(([id, order]) => [id, { ...order }])),
  };
  const sorted = [...events].sort((left, right) => (
    left.blockNumber - right.blockNumber || left.logIndex - right.logIndex
  ));
  for (const event of sorted) {
    if (event.name === 'OrderCreated') {
      next.orders[event.orderId] = {
        id: event.orderId,
        owner: event.owner,
        tokenIn: event.tokenIn,
        tokenOut: event.tokenOut,
        amountHandle: event.amountHandle,
        minOutHandle: event.minOutHandle,
        triggerPrice: event.triggerPrice,
        expiry: event.expiry,
        contractStatus: 0,
        createdTransactionHash: event.transactionHash,
        createdBlock: event.blockNumber,
        terminalTransactionHash: '',
        terminalBlock: null,
      };
      continue;
    }
    const order = next.orders[event.orderId];
    if (!order || TERMINAL_STATUS[event.name] === undefined) continue;
    order.contractStatus = TERMINAL_STATUS[event.name];
    order.terminalTransactionHash = event.transactionHash;
    order.terminalBlock = event.blockNumber;
  }
  return next;
}

export function splitFinalizedEvents(events, finalizedBlock) {
  return events.reduce((result, event) => {
    result[event.blockNumber <= finalizedBlock ? 0 : 1].push(event);
    return result;
  }, [[], []]);
}

export function orderIndexValues(index) {
  return Object.values(index.orders);
}

export async function queryLogsInChunks(provider, filter, fromBlock, toBlock, chunkSize = ORDER_LOG_CHUNK_SIZE) {
  if (fromBlock > toBlock) return [];
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(toBlock, start + chunkSize - 1);
    logs.push(...await provider.getLogs({ ...filter, fromBlock: start, toBlock: end }));
  }
  return logs;
}
