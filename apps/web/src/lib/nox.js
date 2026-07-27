const sleep = (milliseconds, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(signal.reason ?? new DOMException('Operation aborted.', 'AbortError'));
    return;
  }
  const timer = setTimeout(resolve, milliseconds);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(signal.reason ?? new DOMException('Operation aborted.', 'AbortError'));
  }, { once: true });
});
const handleClients = new Map();
const pendingOperations = new Map();

const NON_RETRYABLE_PATTERNS = [
  /user rejected|user denied|action_rejected|4001/i,
  /invalid (?:input |decryption )?proof/i,
  /handle (?:chain id|type) mismatch/i,
  /owner mismatch|app mismatch/i,
  /unsupported|invalid address/i,
];

export function isRetryableNoxError(error) {
  if (error?.name === 'AbortError') return false;
  const message = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.code,
    error?.status,
  ].filter(Boolean).join(' ');
  return !NON_RETRYABLE_PATTERNS.some((pattern) => pattern.test(message));
}

function normalizeRetryOptions(attemptsOrOptions, legacyDelay) {
  if (typeof attemptsOrOptions === 'object' && attemptsOrOptions !== null) {
    return {
      attempts: 12,
      baseDelayMs: 1_000,
      maxDelayMs: 12_000,
      jitterRatio: 0.2,
      ...attemptsOrOptions,
    };
  }
  return {
    attempts: attemptsOrOptions ?? 12,
    baseDelayMs: legacyDelay ?? 8_000,
    maxDelayMs: legacyDelay ?? 8_000,
    jitterRatio: 0,
  };
}

function retryDelay(index, { baseDelayMs, maxDelayMs, jitterRatio, random = Math.random }) {
  const exponential = Math.min(maxDelayMs, baseDelayMs * (2 ** index));
  const spread = exponential * jitterRatio;
  return Math.max(0, Math.round(exponential - spread + (2 * spread * random())));
}

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

export async function retry(operation, attemptsOrOptions = 12, legacyDelay = 8000) {
  const options = normalizeRetryOptions(attemptsOrOptions, legacyDelay);
  const execute = async () => {
    let lastError;
    for (let index = 0; index < options.attempts; index += 1) {
      if (options.signal?.aborted) {
        throw options.signal.reason ?? new DOMException('Operation aborted.', 'AbortError');
      }
      try {
        return await operation({ attempt: index + 1, signal: options.signal });
      } catch (error) {
        lastError = error;
        if (
          index >= options.attempts - 1
          || !(options.shouldRetry ?? isRetryableNoxError)(error)
        ) {
          throw error;
        }
        const delay = retryDelay(index, options);
        await (options.sleepFn ?? sleep)(delay, options.signal);
      }
    }
    throw lastError;
  };

  if (!options.key) return execute();
  const pending = pendingOperations.get(options.key);
  if (pending) return pending;
  const operationPromise = execute().finally(() => {
    if (pendingOperations.get(options.key) === operationPromise) {
      pendingOperations.delete(options.key);
    }
  });
  pendingOperations.set(options.key, operationPromise);
  return operationPromise;
}

export function decryptWithRetry(client, handle, options = {}) {
  return retry(() => client.decrypt(handle), {
    key: `decrypt:${handle}`,
    ...options,
  });
}

export function publicDecryptWithRetry(client, handle, options = {}) {
  return retry(() => client.publicDecrypt(handle), {
    key: `public-decrypt:${handle}`,
    ...options,
  });
}
