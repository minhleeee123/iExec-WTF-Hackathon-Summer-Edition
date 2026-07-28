export async function inspectSharedHandles({
  holder,
  isEncryptedHandle,
  isViewer,
  readHandle,
  tokenSymbols,
  viewer,
}) {
  return Promise.all(tokenSymbols.map(async (symbol) => {
    try {
      const handle = await readHandle(symbol, holder);
      if (!isEncryptedHandle(handle)) {
        return { decrypted: null, handle, status: 'uninitialized', symbol };
      }
      const allowed = await isViewer(handle, viewer);
      return {
        decrypted: null,
        handle,
        status: allowed ? 'shared' : 'not-shared',
        symbol,
      };
    } catch (error) {
      return {
        decrypted: null,
        error: error?.shortMessage ?? error?.message ?? 'Shared access is temporarily unavailable.',
        handle: '',
        status: 'error',
        symbol,
      };
    }
  }));
}

export function storeSharedPlaintext(entries, { handle, symbol, value }) {
  return entries.map((entry) => (
    entry.symbol === symbol && entry.handle === handle
      ? { ...entry, decrypted: value, status: 'shared' }
      : entry
  ));
}

export function markChangedSharedHandle(entries, { currentHandle, symbol }) {
  return entries.map((entry) => (
    entry.symbol === symbol
      ? { ...entry, currentHandle, decrypted: null, status: 'changed' }
      : entry
  ));
}
