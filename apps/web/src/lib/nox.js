const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const handleClients = new Map();

export const createHandleClient = async (signer) => {
  const [address, network] = await Promise.all([
    signer.getAddress(),
    signer.provider.getNetwork(),
  ]);
  const cacheKey = `${network.chainId}:${address.toLowerCase()}`;
  const cached = handleClients.get(cacheKey);
  if (cached) return cached;
  const { createEthersHandleClient } = await import('@iexec-nox/handle');
  const pending = createEthersHandleClient(signer);
  handleClients.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    handleClients.delete(cacheKey);
    throw error;
  }
};

export async function retry(operation, attempts = 12, delay = 8000) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) await sleep(delay);
    }
  }
  throw lastError;
}
