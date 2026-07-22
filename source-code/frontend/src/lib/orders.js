export const CONTRACT_ORDER_STATUS = Object.freeze({
  OPEN: 0,
  EXECUTED: 1,
  CANCELLED: 2,
  EXPIRED: 3,
});

export const ORDER_STATE = Object.freeze({
  OPEN: 'open',
  EXECUTABLE: 'executable',
  EXPIRED: 'expired',
  EXECUTED: 'executed',
  CANCELLED: 'cancelled',
  ORACLE_UNAVAILABLE: 'oracle-unavailable',
});

export const ORDER_STATE_LABEL = Object.freeze({
  [ORDER_STATE.OPEN]: 'Open',
  [ORDER_STATE.EXECUTABLE]: 'Executable',
  [ORDER_STATE.EXPIRED]: 'Expired',
  [ORDER_STATE.EXECUTED]: 'Executed',
  [ORDER_STATE.CANCELLED]: 'Cancelled',
  [ORDER_STATE.ORACLE_UNAVAILABLE]: 'Oracle unavailable',
});

export function deriveOrderState({ contractStatus, blockTimestamp, expiry, canExecute, oracleAvailable = true }) {
  if (contractStatus === CONTRACT_ORDER_STATUS.EXECUTED) return ORDER_STATE.EXECUTED;
  if (contractStatus === CONTRACT_ORDER_STATUS.CANCELLED) return ORDER_STATE.CANCELLED;
  if (contractStatus === CONTRACT_ORDER_STATUS.EXPIRED) return ORDER_STATE.EXPIRED;
  if (Number(blockTimestamp) > Number(expiry)) return ORDER_STATE.EXPIRED;
  if (!oracleAvailable) return ORDER_STATE.ORACLE_UNAVAILABLE;
  return canExecute ? ORDER_STATE.EXECUTABLE : ORDER_STATE.OPEN;
}

export function getOrderSide(tokenIn) {
  return tokenIn === 'cUSDC' ? 'buy' : 'sell';
}

export function isOrderOwner(account, owner) {
  return Boolean(account && owner && account.toLowerCase() === owner.toLowerCase());
}

export function getOrderPermissions({ account, contractStatus, owner, state }) {
  const connected = Boolean(account);
  const ownerMatch = isOrderOwner(account, owner);
  const contractOpen = contractStatus === undefined
    ? ![ORDER_STATE.EXECUTED, ORDER_STATE.CANCELLED, ORDER_STATE.EXPIRED].includes(state)
    : contractStatus === CONTRACT_ORDER_STATUS.OPEN;
  return {
    canCancel: ownerMatch && contractOpen,
    canExecute: connected && state === ORDER_STATE.EXECUTABLE,
    canExpire: connected && state === ORDER_STATE.EXPIRED,
    canReveal: ownerMatch,
    isOwner: ownerMatch,
  };
}

export function shouldDecryptSettlement({ caller, owner, transactionConfirmed }) {
  return Boolean(transactionConfirmed && isOrderOwner(caller, owner));
}

export function settlementOutcome({ transactionHash, decryptionError = '', decrypted = null }) {
  return {
    confirmed: Boolean(transactionHash),
    transactionHash,
    decrypted,
    decryptionWarning: transactionHash && decryptionError ? decryptionError : '',
  };
}
