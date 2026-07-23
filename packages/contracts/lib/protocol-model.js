export const ORDER_STATUS = Object.freeze({
  OPEN: 0,
  EXECUTED: 1,
  CANCELLED: 2,
  EXPIRED: 3,
});

export function quoteConstantProduct({
  amountIn,
  reserveIn,
  reserveOut,
  feeNumerator = 997n,
  feeDenominator = 1000n,
}) {
  if (amountIn < 0n || reserveIn <= 0n || reserveOut <= 0n) {
    throw new RangeError('Swap inputs and reserves must be valid non-negative values.');
  }
  const feeAdjusted = amountIn * feeNumerator / feeDenominator;
  return feeAdjusted * reserveOut / (reserveIn + feeAdjusted);
}

export function settleSwapReference({ amountIn, minimumOut, reserveIn, reserveOut }) {
  if (minimumOut < 0n) throw new RangeError('Minimum output cannot be negative.');
  const quotedOut = quoteConstantProduct({ amountIn, reserveIn, reserveOut });
  const accepted = quotedOut >= minimumOut;
  const output = accepted ? quotedOut : 0n;
  const refund = accepted ? 0n : amountIn;
  const acceptedInput = amountIn - refund;
  return {
    accepted,
    acceptedInput,
    output,
    quotedOut,
    refund,
    reserveInAfter: reserveIn + acceptedInput,
    reserveOutAfter: reserveOut - output,
  };
}

export function transitionOrder({
  action,
  blockTimestamp,
  caller,
  expiry,
  owner,
  status,
  triggerReached = false,
}) {
  if (status !== ORDER_STATUS.OPEN) throw new Error('not-open');

  if (action === 'cancel') {
    if (caller.toLowerCase() !== owner.toLowerCase()) throw new Error('not-owner');
    return ORDER_STATUS.CANCELLED;
  }
  if (action === 'expire') {
    if (blockTimestamp <= expiry) throw new Error('not-expired');
    return ORDER_STATUS.EXPIRED;
  }
  if (action === 'execute') {
    if (blockTimestamp > expiry) throw new Error('expired');
    if (!triggerReached) throw new Error('trigger-not-reached');
    return ORDER_STATUS.EXECUTED;
  }
  throw new Error('unknown-action');
}
