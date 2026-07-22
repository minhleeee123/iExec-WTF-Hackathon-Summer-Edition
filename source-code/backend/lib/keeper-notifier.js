export function writeStructuredLog(entry, stream = process.stdout) {
  stream.write(`${JSON.stringify({ time: new Date().toISOString(), network: 'ethereum-sepolia', ...entry })}\n`);
}

export function createNotifier({ webhookUrl = '', fetchImpl = fetch, log = writeStructuredLog } = {}) {
  return async function notify(payload) {
    log({ ...payload, notification: 'console' });
    if (!webhookUrl) return { delivered: false, reason: 'not-configured' };
    try {
      const response = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      return { delivered: true };
    } catch (error) {
      log({ orderId: payload.orderId, decision: payload.action, result: 'webhook-failed', error: error.message });
      return { delivered: false, reason: error.message };
    }
  };
}
