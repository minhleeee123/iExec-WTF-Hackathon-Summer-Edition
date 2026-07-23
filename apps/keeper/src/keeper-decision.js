export const OPEN_ORDER_STATUS = 0;

export function decideOrder({ status, blockTimestamp, expiry, canExecute = false, oracleError = '' }) {
  if (Number(status) !== OPEN_ORDER_STATUS) return { action: 'skip', reason: 'not-open' };
  if (Number(blockTimestamp) > Number(expiry)) return { action: 'expire', reason: 'past-expiry' };
  if (oracleError) return { action: 'retry', reason: 'oracle-unavailable', error: oracleError };
  if (canExecute) return { action: 'execute', reason: 'trigger-ready' };
  return { action: 'skip', reason: 'trigger-not-reached' };
}
