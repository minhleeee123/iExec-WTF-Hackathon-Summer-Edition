const DEFAULT_TIMEOUT_MS = 8_000;

function assertEndpoint(endpoint) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
    throw new Error('Observer endpoint must use HTTPS, except for localhost development.');
  }
  return url.toString();
}

export function createRemoteKeeperObserver({ endpoint, token = '', fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!endpoint || !token) return null;
  const observerUrl = assertEndpoint(endpoint);
  return async (event) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(observerUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error?.message || `Observer endpoint failed with HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (!payload?.observation || payload.observation.version !== 1) {
      throw new Error('Observer endpoint returned an invalid keeper observation.');
    }
    return payload.observation;
  };
}
