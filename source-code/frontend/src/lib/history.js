const FALLBACK_BLOCK_WINDOW = 1200;
const FALLBACK_CHUNK_SIZE = 100;

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
