const OPERATION_LABELS = [
  [/^connect$/, 'Wallet connection'],
  [/^refresh$/, 'Data refresh'],
  [/^faucet-/, 'Token faucet'],
  [/^(wrap|unwrap)$/, 'Asset conversion'],
  [/^decrypt$/, 'Balance reveal'],
  [/^swap$/, 'Protected swap'],
  [/^authorize-orderbook$/, 'OrderBook authorization'],
  [/^revoke-orderbook$/, 'OrderBook authorization'],
  [/^create-order$/, 'Limit order'],
  [/^(execute|cancel|expire)-order-/, 'Limit order settlement'],
  [/^reveal-order-/, 'Order terms reveal'],
  [/^safe-fund$/, 'Safe funding'],
  [/^safe-reveal$/, 'Safe balance reveal'],
  [/^safe-unwrap$/, 'Safe unwrap'],
  [/^safe-finalize-/, 'Safe unwrap finalization'],
  [/^safe-swap$/, 'Safe protected swap'],
  [/^safe-order$/, 'Safe limit order'],
  [/^safe-cancel-/, 'Safe order cancellation'],
  [/^(execute|expire)-safe-order-/, 'Safe order settlement'],
  [/^safe-viewer$/, 'Safe viewer access'],
  [/^safe-operator-/, 'Safe operator authorization'],
  [/^safe-enable$/, 'Safe module enable'],
  [/^safe-revoke$/, 'Safe module revoke'],
  [/^acl$/, 'Viewer access'],
];

function operationLabel(busyKey) {
  return OPERATION_LABELS.find(([pattern]) => pattern.test(busyKey))?.[1] ?? 'Transaction progress';
}

function initialStep(busyKey) {
  if (/^(refresh)$/.test(busyKey)) return 'Reading the latest Sepolia state…';
  if (/^faucet-/.test(busyKey)) return 'Checking faucet eligibility and cooldown…';
  if (/^(decrypt|safe-reveal|reveal-order-)/.test(busyKey)) return 'Requesting authorized Nox decryption…';
  if (/^connect$/.test(busyKey)) return 'Waiting for the selected wallet…';
  return 'Preparing the request; review your wallet when prompted…';
}

export function createOperationProgress(busyKey) {
  return {
    id: 'progress',
    type: 'info',
    title: operationLabel(busyKey),
    busyKey,
    complete: false,
    steps: [{ text: initialStep(busyKey), state: 'active' }],
  };
}

export function appendOperationStep(progress, notice) {
  if (!progress || !notice?.text) return progress;
  const state = notice.type === 'error' ? 'failed' : notice.type === 'success' ? 'complete' : 'active';
  const previous = progress.steps.at(-1);
  if (previous?.text === notice.text) {
    return {
      ...progress,
      type: notice.type ?? progress.type,
      href: notice.href ?? progress.href,
      steps: [...progress.steps.slice(0, -1), { ...previous, state }],
    };
  }
  const completed = progress.steps.map((step) => step.state === 'active' ? { ...step, state: 'complete' } : step);
  const steps = [...completed, { text: notice.text, state }].slice(-6);
  return {
    ...progress,
    type: notice.type ?? progress.type,
    href: notice.href ?? progress.href,
    steps,
  };
}

export function finishOperationProgress(progress, failed = false) {
  if (!progress) return null;
  return {
    ...progress,
    type: failed ? 'error' : 'success',
    complete: true,
    steps: progress.steps.map((step, index) => (
      index === progress.steps.length - 1 && step.state === 'active'
        ? { ...step, state: failed ? 'failed' : 'complete' }
        : step
    )),
  };
}
