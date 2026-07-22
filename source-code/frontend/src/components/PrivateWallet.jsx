import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { formatToken, isHandle, shorten } from '../lib/format';

export default function PrivateWallet({
  account,
  balances,
  busy,
  ethBalance,
  onToggleBalances,
  privateBalancesVisible,
  tokens,
}) {
  return (
    <aside className="account-panel">
      <div className="section-heading">
        <div><p className="eyebrow">PRIVATE WALLET</p><h2>Encrypted balances</h2></div>
        <button
          className="icon-button"
          onClick={onToggleBalances}
          disabled={!account || Boolean(busy)}
          aria-label={privateBalancesVisible ? 'Hide private balances' : 'Decrypt and show private balances'}
          title={privateBalancesVisible ? 'Hide private balances' : 'Decrypt and show private balances'}
        >
          {busy === 'decrypt'
            ? <LoaderCircle className="spin" size={18} />
            : privateBalancesVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="wallet-line">{account || 'No wallet connected'}</p>
      {Object.values(tokens).map((token) => {
        const balance = balances[token.symbol];
        const value = privateBalancesVisible
          ? formatToken(balance.decrypted ?? 0n, token.decimals)
          : '••••••';
        return (
          <div className="balance-row" key={token.symbol}>
            <div>
              <span>{token.symbol}</span>
              <small>{isHandle(balance.handle) ? `Handle ${shorten(balance.handle, 12, 8)}` : 'No initialized handle'}</small>
            </div>
            <strong>{value}</strong>
          </div>
        );
      })}
      <p className="privacy-note">The eye requests an EIP-712 signature before revealing authorized plaintext balances.</p>
      <div className="native-balance"><span>Sepolia ETH for gas</span><strong>{formatToken(ethBalance, 18, 4)}</strong></div>
    </aside>
  );
}
