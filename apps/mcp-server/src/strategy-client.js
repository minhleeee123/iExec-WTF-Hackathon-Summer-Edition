const DEFAULT_TIMEOUT_MS = 8_000;

function assertEndpoint(endpoint) {
  if (!endpoint) throw new Error('Agent endpoint is not configured. Set NOXSWAP_AGENT_API_URL.');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) {
    throw new Error('Agent endpoint must use HTTPS, except for localhost development.');
  }
  return url.toString();
}

async function postJson(endpoint, body, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, token = '' } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(assertEndpoint(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || `Agent endpoint failed with HTTP ${response.status}.`);
  }
  return response.json();
}

export async function requestStrategyPlan({ endpoint, intent, market, fetchImpl, timeoutMs }) {
  const payload = await postJson(endpoint, { intent, market }, { fetchImpl, timeoutMs });
  if (!payload?.plan || payload.plan.action !== 'limit_order' || typeof payload.plan.supported !== 'boolean') {
    throw new Error('Agent endpoint returned an invalid strategy plan.');
  }
  return payload;
}
