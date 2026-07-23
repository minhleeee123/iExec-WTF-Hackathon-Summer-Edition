import { ExternalLink, Eye, EyeOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { formatToken, isHandle, shorten } from '../lib/format';

export default function PrivateWallet({
  account,
  balances,
  busy,
  compact = false,
  ethBalance,
  onRefresh,
  onToggleBalances,
  privateBalancesVisible,
  tokens,
}) {
  return (
    <aside className={`account-panel${compact ? ' compact-wallet' : ''}`}>
      <div className="section-heading">
        <div><p className="eyebrow">PRIVATE WALLET</p><h2>Encrypted balances</h2></div>
        <div className="wallet-actions">
          {onRefresh && <button className="icon-button" onClick={onRefresh} disabled={!account || Boolean(busy)} aria-label="Refresh wallet balances" title="Refresh wallet balances"><RefreshCw className={busy === 'refresh' ? 'spin' : ''} size={17} /></button>}
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
      </div>
      {!compact && <p className="wallet-line">{account || 'No wallet connected'}</p>}
      {Object.values(tokens).map((token) => {
        const balance = balances[token.symbol];
        const value = privateBalancesVisible
          ? formatToken(balance.decrypted ?? 0n, token.decimals)
          : '••••••';
        return (
          <div className="balance-row" key={token.symbol}>
            <div>
              <span>{token.symbol}</span>
              {!compact && <small>{isHandle(balance.handle) ? `Handle ${shorten(balance.handle, 12, 8)}` : 'No initialized handle'}</small>}
            </div>
            <strong>{value}</strong>
          </div>
        );
      })}
      {!compact && <p className="privacy-note">The eye requests an EIP-712 signature before revealing authorized plaintext balances.</p>}
      <div className="native-balance">
        <div className="eth-gas-label">
          <span>Sepolia ETH for gas</span>
          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noreferrer"
            className="faucet-inline-link"
            title="Claim free Sepolia ETH for gas from Google Cloud Faucet"
          >
            Get ETH <ExternalLink size={11} />
          </a>
        </div>
        <strong>{formatToken(ethBalance, 18, 4)}</strong>
      </div>
    </aside>
  );
}
