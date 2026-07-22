const FALLBACK_BLOCK_WINDOW = 1200;
const FALLBACK_CHUNK_SIZE = 100;

export async function queryRecentSwapEvents(router, address, deploymentBlock, latestBlock) {
  const filter = router.filters.SwapExecuted(address);
  try {
    return await router.queryFilter(filter, deploymentBlock, latestBlock);
  } catch {
    const firstBlock = Math.max(deploymentBlock, latestBlock - FALLBACK_BLOCK_WINDOW);
    const events = [];
    for (let fromBlock = firstBlock; fromBlock <= latestBlock; fromBlock += FALLBACK_CHUNK_SIZE) {
      const toBlock = Math.min(latestBlock, fromBlock + FALLBACK_CHUNK_SIZE - 1);
      events.push(...await router.queryFilter(filter, fromBlock, toBlock));
    }
    return events;
  }
}
