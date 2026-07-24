import { ExternalLink, Eye, EyeOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { formatToken, isHandle, shorten } from '../lib/format';
import { CardHelpButton } from './CardHelpModal';

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
  const tokenList = Object.values(tokens);

  return (
    <aside className={`account-panel${compact ? ' compact-wallet' : ''}`}>
      <div className="section-heading">
        <div><p className="eyebrow">CONNECTED WALLET</p><h2>Wallet balances</h2></div>
        <div className="wallet-actions">
          <CardHelpButton
            category="PRIVATE WALLET GUIDE"
            title="Encrypted Balances & Privacy"
            description="Your balances are stored on Sepolia as encrypted ciphertext handles protected by iExec Nox TEE."
            steps={[
              { heading: 'Step 1 - Gas Fee', detail: 'Ensure your wallet has Sepolia ETH for transaction gas (click "Get ETH" if low).' },
              { heading: 'Step 2 - Reveal Balances', detail: 'Click the Eye icon to sign EIP-712 and decrypt your plaintext balances in your browser.' },
              { heading: 'Step 3 - Refresh State', detail: 'Click the Refresh icon to re-query the latest Sepolia blockchain state.' },
            ]}
          />
          {onRefresh && <button className="icon-button" onClick={onRefresh} disabled={!account || Boolean(busy)} aria-label="Refresh wallet balances" title="Refresh wallet balances"><RefreshCw className={busy === 'refresh' ? 'spin' : ''} size={17} /></button>}
        </div>
      </div>
      {!compact && <p className="wallet-line">{account || 'No wallet connected'}</p>}
      <div className="native-balance">
        <div className="eth-gas-label">
          <span>Sepolia ETH</span>
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
        <strong>{account ? formatToken(ethBalance, 18, 4) : '—'}</strong>
      </div>
      <section className="wallet-balance-group public-balance-group" aria-label="Public n-asset balances">
        <div className="wallet-balance-label"><span>Public assets</span><small>n-assets</small></div>
        <div className="public-balance-list" data-testid="public-asset-balances">
          {tokenList.map((token) => (
            <div className="balance-row public-balance-item" key={token.publicSymbol}>
              <div><span>{token.publicSymbol}</span></div>
              <strong>{account ? formatToken(balances[token.symbol].public, token.decimals, 4) : '—'}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="wallet-balance-group confidential-balance-group" aria-label="Confidential c-asset balances">
        <div className="wallet-balance-label">
          <span>Confidential assets</span>
          <div className="wallet-balance-label-actions">
            <small>Encrypted</small>
            <button
              className="icon-button wallet-reveal-button"
              onClick={onToggleBalances}
              disabled={!account || Boolean(busy)}
              aria-label={privateBalancesVisible ? 'Hide private balances' : 'Decrypt and show private balances'}
              title={privateBalancesVisible ? 'Hide private balances' : 'Decrypt and show private balances'}
            >
              {busy === 'decrypt'
                ? <LoaderCircle className="spin" size={15} />
                : privateBalancesVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {tokenList.map((token) => {
          const balance = balances[token.symbol];
          const value = !account
            ? '—'
            : privateBalancesVisible
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
      </section>
      {!compact && <p className="privacy-note">The eye requests an EIP-712 signature before revealing authorized plaintext balances.</p>}
    </aside>
  );
}
