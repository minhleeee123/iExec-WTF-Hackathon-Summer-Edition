import deployment from './deployment.json';

export const ZERO_HANDLE = `0x${'0'.repeat(64)}`;
export const SEPOLIA_HEX = '0xaa36a7';
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const FAUCET_COOLDOWN_SECONDS = 60 * 60;

export const TOKENS = {
  cUSDC: {
    symbol: 'cUSDC',
    publicSymbol: 'nUSDC',
    decimals: 6,
    wrapper: deployment.contracts.cUSDC,
    underlying: deployment.contracts.underlyingUSDC,
  },
  cETH: {
    symbol: 'cETH',
    publicSymbol: 'nWETH',
    decimals: 18,
    wrapper: deployment.contracts.cETH,
    underlying: deployment.contracts.underlyingWETH,
  },
};

export const createInitialBalances = () => Object.fromEntries(
  Object.values(TOKENS).map((token) => [
    token.symbol,
    { public: 0n, handle: ZERO_HANDLE, decrypted: null },
  ]),
);

export const createInitialFaucets = () => Object.fromEntries(
  Object.values(TOKENS).map((token) => [
    token.symbol,
    { amount: 0n, nextClaimAt: 0 },
  ]),
);
