import { ExternalLink, ShieldCheck, X } from 'lucide-react';

const WALLET_OPTIONS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    badge: 'Popular',
    icon: '🦊',
    description: 'Connect using MetaMask browser extension or mobile app.',
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    badge: 'Security',
    icon: '🛡️',
    description: 'Connect using Rabby DeFi browser extension.',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    badge: 'Self-Custody',
    icon: '🔵',
    description: 'Connect using Coinbase Wallet extension or app.',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect / Rainbow',
    badge: 'Mobile QR',
    icon: '🌈',
    description: 'Scan QR code using Rainbow, Trust, or mobile wallets.',
  },
  {
    id: 'injected',
    name: 'Browser Injected Provider',
    badge: 'Auto-detect',
    icon: '🌐',
    description: 'Connect using any EIP-1193 compatible browser extension.',
  },
];

export default function WalletConnectModal({
  busy,
  onClose,
  onSelectWallet,
  show,
}) {
  if (!show) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal wallet-connect-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Connect your Web3 Wallet"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">MULTI-WALLET CONNECTOR</p>
            <h2>Connect your wallet</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close wallet modal">
            <X size={18} />
          </button>
        </div>

        <p className="modal-intro">
          Select your preferred Web3 provider to interact with NoxSwap on Ethereum Sepolia Testnet.
        </p>

        <div className="wallet-options-grid">
          {WALLET_OPTIONS.map((item) => (
            <button
              key={item.id}
              className="wallet-option-card"
              onClick={() => onSelectWallet(item.id)}
              disabled={busy === 'connect'}
            >
              <div className="option-header">
                <span className="wallet-icon">{item.icon}</span>
                <strong>{item.name}</strong>
                <span className="wallet-badge">{item.badge}</span>
              </div>
              <small>{item.description}</small>
            </button>
          ))}
        </div>

        <div className="modal-footer-strip">
          <div className="network-fact">
            <ShieldCheck size={15} />
            <span>Target network: <strong>Ethereum Sepolia (Chain 11155111)</strong></span>
          </div>
          <a
            href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
            target="_blank"
            rel="noreferrer"
            className="faucet-modal-link"
            title="Claim free Sepolia ETH for transaction gas from Google Cloud Faucet"
          >
            Need Sepolia ETH for gas? Get Faucet <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
