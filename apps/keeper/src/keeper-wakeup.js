export function waitForBlockOrTimeout({ provider, timeoutMs, signal }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      provider?.off?.('block', onBlock);
      signal?.removeEventListener('abort', onAbort);
      resolve(reason);
    };
    const onBlock = () => finish('block');
    const onAbort = () => finish('abort');
    const timer = setTimeout(() => finish('timeout'), timeoutMs);
    provider?.once?.('block', onBlock);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
