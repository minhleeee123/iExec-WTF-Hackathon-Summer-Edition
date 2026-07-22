import { ethers } from 'ethers';

export const getCooldownRemaining = (nextClaimAt, now) =>
  Math.max(0, Math.ceil(Number(nextClaimAt) - Number(now)));

export function validateTokenAmount(value, decimals, available) {
  const normalized = value.trim();
  if (!normalized) return { amount: null, error: 'Enter an amount.' };

  let amount;
  try {
    amount = ethers.parseUnits(normalized, decimals);
  } catch {
    return { amount: null, error: `Enter a valid amount with at most ${decimals} decimal places.` };
  }

  if (amount <= 0n) return { amount, error: 'Enter an amount greater than zero.' };
  if (available === null) return { amount, error: 'Reveal your private balance to validate this amount.' };
  if (amount > available) return { amount, error: 'Amount exceeds your available balance.' };
  return { amount, error: '' };
}

export function validateNonNegativeAmount(value, decimals) {
  const normalized = value.trim();
  if (!normalized) return { amount: null, error: 'Enter a minimum output.' };
  try {
    const amount = ethers.parseUnits(normalized, decimals);
    if (amount < 0n) return { amount, error: 'Minimum output cannot be negative.' };
    return { amount, error: '' };
  } catch {
    return { amount: null, error: `Enter a valid amount with at most ${decimals} decimal places.` };
  }
}

export function validateMinimumOutput(value, decimals, allowZeroProtection = false) {
  const result = validateNonNegativeAmount(value, decimals);
  if (result.error) return result;
  if (result.amount === 0n && !allowZeroProtection) {
    return { amount: result.amount, error: 'Minimum output must be positive, or explicitly confirm zero protection.' };
  }
  return result;
}
