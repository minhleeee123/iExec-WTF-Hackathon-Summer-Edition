export async function decryptChangedBalances({
  client,
  current = {},
  decrypt,
  isEncryptedHandle,
  snapshot,
  tokenSymbols,
}) {
  const next = { ...snapshot };
  const changed = [];
  for (const symbol of tokenSymbols) {
    const balance = snapshot[symbol];
    if (!balance) continue;
    if (!isEncryptedHandle(balance.handle)) {
      next[symbol] = { ...balance, decrypted: 0n };
    } else if (
      current[symbol]?.handle === balance.handle
      && typeof current[symbol]?.decrypted === 'bigint'
    ) {
      next[symbol] = { ...balance, decrypted: current[symbol].decrypted };
    } else {
      changed.push({ symbol, handle: balance.handle });
    }
  }

  const results = await Promise.allSettled(
    changed.map(({ handle }) => decrypt(client, handle)),
  );
  const errors = [];
  results.forEach((result, index) => {
    const { symbol } = changed[index];
    if (result.status === 'fulfilled') {
      next[symbol] = { ...snapshot[symbol], decrypted: result.value.value };
    } else {
      next[symbol] = { ...snapshot[symbol], decrypted: null };
      errors.push({ symbol, error: result.reason });
    }
  });
  return { balances: next, decryptedCount: changed.length - errors.length, errors };
}

export function applySwapBalanceDelta({
  balances,
  amountIn,
  outputAmount,
  refundAmount,
  tokenIn,
  tokenOut,
}) {
  const inputBalance = balances[tokenIn]?.decrypted;
  const outputBalance = balances[tokenOut]?.decrypted;
  if (typeof inputBalance !== 'bigint' || typeof outputBalance !== 'bigint') return balances;
  const spent = amountIn - refundAmount;
  if (spent < 0n || spent > inputBalance) return balances;
  return {
    ...balances,
    [tokenIn]: {
      ...balances[tokenIn],
      decrypted: inputBalance - spent,
    },
    [tokenOut]: {
      ...balances[tokenOut],
      decrypted: outputBalance + outputAmount,
    },
  };
}
