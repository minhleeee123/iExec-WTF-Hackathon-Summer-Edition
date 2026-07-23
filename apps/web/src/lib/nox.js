const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const createHandleClient = async (signer) => {
  const { createEthersHandleClient } = await import('@iexec-nox/handle');
  return createEthersHandleClient(signer);
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
