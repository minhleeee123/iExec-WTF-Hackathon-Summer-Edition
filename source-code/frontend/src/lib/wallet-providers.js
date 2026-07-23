const WALLET_MATCHERS = {
  metamask: ({ info, provider }) => (
    /metamask/i.test(`${info?.name ?? ''} ${info?.rdns ?? ''}`)
    || (
      provider?.isMetaMask === true
      && provider?.isCoinbaseWallet !== true
      && provider?.isRabby !== true
    )
  ),
  coinbase: ({ info, provider }) => (
    /coinbase/i.test(`${info?.name ?? ''} ${info?.rdns ?? ''}`)
    || provider?.isCoinbaseWallet === true
  ),
  rabby: ({ info, provider }) => (
    /rabby/i.test(`${info?.name ?? ''} ${info?.rdns ?? ''}`)
    || provider?.isRabby === true
  ),
};

function uniqueProviders(providers) {
  const seen = new Set();
  return providers.filter((entry) => {
    if (!entry?.provider || seen.has(entry.provider)) return false;
    seen.add(entry.provider);
    return true;
  });
}

export function legacyProviderEntries(ethereum) {
  if (!ethereum) return [];
  const providers = Array.isArray(ethereum.providers) && ethereum.providers.length > 0
    ? ethereum.providers
    : [ethereum];
  return uniqueProviders(providers.map((provider) => ({ info: null, provider })));
}

export function selectWalletProvider(walletId, announced = [], ethereum = null) {
  const candidates = uniqueProviders([...announced, ...legacyProviderEntries(ethereum)]);
  if (walletId === 'injected') return candidates[0]?.provider ?? null;
  const matcher = WALLET_MATCHERS[walletId];
  if (!matcher) return null;
  return candidates.find(matcher)?.provider ?? null;
}

export async function discoverWalletProvider(walletId, windowObject = window, waitMs = 250) {
  const announced = [];
  const onProvider = (event) => {
    if (event?.detail?.provider) announced.push(event.detail);
  };
  windowObject.addEventListener?.('eip6963:announceProvider', onProvider);
  windowObject.dispatchEvent?.(new Event('eip6963:requestProvider'));
  await new Promise((resolve) => windowObject.setTimeout(resolve, waitMs));
  windowObject.removeEventListener?.('eip6963:announceProvider', onProvider);

  const provider = selectWalletProvider(walletId, announced, windowObject.ethereum);
  if (provider) return provider;
  const label = { metamask: 'MetaMask', coinbase: 'Coinbase Wallet', rabby: 'Rabby Wallet' }[walletId]
    ?? 'an injected wallet';
  throw new Error(`${label} was not detected. Install or unlock it, then try again.`);
}
