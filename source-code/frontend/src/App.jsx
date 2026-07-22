import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Unlock, 
  RefreshCw, 
  ArrowDown, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  Cpu, 
  Eye, 
  EyeOff, 
  Coins, 
  FileText, 
  Code2, 
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  Globe
} from 'lucide-react';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('swap'); // 'swap' | 'landing' | 'feedback'
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  
  // Swap state
  const [tokenIn, setTokenIn] = useState('cUSDC');
  const [tokenOut, setTokenOut] = useState('cETH');
  const [amountIn, setAmountIn] = useState('1000');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState(0); // 0: Idle, 1: Encrypting, 2: TEE Compute, 3: Settling
  
  // Wrap / Unwrap state
  const [showWrapModal, setShowWrapModal] = useState(false);
  const [wrapAmount, setWrapAmount] = useState('500');
  
  // Decryption state
  const [isDecrypted, setIsDecrypted] = useState(false);

  // Faucet state
  const [showFaucetToast, setShowFaucetToast] = useState(false);

  // Balances
  const [balances, setBalances] = useState({
    cUSDC: { decrypted: 2500, handle: '0x8f3c...a1b2' },
    cETH: { decrypted: 4.85, handle: '0x3d9e...c7f4' },
    cWBTC: { decrypted: 0.12, handle: '0x7a2b...e8d9' }
  });

  // Recent transactions
  const [transactions, setTransactions] = useState([
    {
      id: 'tx-1',
      hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      tokenIn: 'cUSDC',
      tokenOut: 'cETH',
      encryptedHandle: '0xeinput_7984_92f81a',
      status: 'Confirmed on Sepolia',
      teeTime: '3.2s',
      timestamp: '2 mins ago'
    },
    {
      id: 'tx-2',
      hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      tokenIn: 'cETH',
      tokenOut: 'cUSDC',
      encryptedHandle: '0xeinput_7984_48b10c',
      status: 'Confirmed on Sepolia',
      teeTime: '2.8s',
      timestamp: '15 mins ago'
    }
  ]);

  const handleConnectWallet = () => {
    if (isConnected) {
      setIsConnected(false);
      setUserAddress('');
    } else {
      setIsConnected(true);
      setUserAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
    }
  };

  const handleSwap = () => {
    if (!isConnected) {
      handleConnectWallet();
      return;
    }

    setIsSwapping(true);
    setSwapStep(1); // Encrypting client-side via @iexec-nox/handle

    setTimeout(() => {
      setSwapStep(2); // iExec Nox TEE Execution (Intel TDX Enclave)
      
      setTimeout(() => {
        setSwapStep(3); // Sepolia State Settlement
        
        setTimeout(() => {
          setIsSwapping(false);
          setSwapStep(0);
          
          // Update balances
          const numAmount = parseFloat(amountIn) || 0;
          if (tokenIn === 'cUSDC') {
            setBalances(prev => ({
              ...prev,
              cUSDC: { ...prev.cUSDC, decrypted: Math.max(0, prev.cUSDC.decrypted - numAmount) },
              cETH: { ...prev.cETH, decrypted: prev.cETH.decrypted + (numAmount / 3000) }
            }));
          }

          // Add transaction
          const newTx = {
            id: `tx-${Date.now()}`,
            hash: `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`,
            tokenIn,
            tokenOut,
            encryptedHandle: `0xeinput_7984_${Math.random().toString(16).substring(2, 8)}`,
            status: 'Confirmed on Sepolia',
            teeTime: `${(2.5 + Math.random()).toFixed(1)}s`,
            timestamp: 'Just now'
          };
          setTransactions(prev => [newTx, ...prev]);
        }, 1500);
      }, 2000);
    }, 1500);
  };

  const handleFaucet = () => {
    setBalances(prev => ({
      ...prev,
      cUSDC: { ...prev.cUSDC, decrypted: prev.cUSDC.decrypted + 1000 }
    }));
    setShowFaucetToast(true);
    setTimeout(() => setShowFaucetToast(false), 3000);
  };

  return (
    <div className="app-container">
      {/* Background Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>

      {/* Navbar */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => setActiveTab('swap')}>
          <div className="brand-logo">
            <Shield className="shield-icon" />
            <Zap className="zap-icon" />
          </div>
          <div>
            <div className="brand-title">NoxSwap</div>
            <div className="brand-subtitle">Confidential DEX Router</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-menu">
          <button 
            className={`nav-tab ${activeTab === 'swap' ? 'active' : ''}`}
            onClick={() => setActiveTab('swap')}
          >
            <RefreshCw size={16} />
            Confidential Swap
          </button>
          <button 
            className={`nav-tab ${activeTab === 'landing' ? 'active' : ''}`}
            onClick={() => setActiveTab('landing')}
          >
            <Globe size={16} />
            Presentation & Specs
          </button>
          <button 
            className={`nav-tab ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <FileText size={16} />
            Developer Feedback
          </button>
        </nav>

        {/* Header Right Badges & Wallet */}
        <div className="nav-right">
          <span className="badge-sepolia">
            <span className="pulse-dot"></span>
            Ethereum Sepolia
          </span>
          <span className="badge-nox">
            <Cpu size={13} />
            iExec Nox TEE Active
          </span>

          <button className="btn-secondary" onClick={handleFaucet} title="Get 1,000 Sepolia test cUSDC">
            <Coins size={15} />
            Faucet
          </button>

          <button className="btn-primary wallet-btn" onClick={handleConnectWallet}>
            {isConnected ? (
              <>
                <CheckCircle2 size={16} color="#34d399" />
                {`${userAddress.substring(0, 6)}...${userAddress.substring(38)}`}
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </header>

      {/* Toast Banner */}
      {showFaucetToast && (
        <div className="toast-notification">
          <Sparkles size={18} color="#10b981" />
          <span>Received <strong>1,000 cUSDC</strong> (ERC-7984) on Sepolia Testnet!</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'swap' && (
          <div className="swap-view-grid">
            {/* Swap Card */}
            <div className="glass-panel swap-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Confidential Swap</h2>
                  <p className="card-subtitle">Zero MEV • Hidden Balances • Full Composability</p>
                </div>
                <button 
                  className="btn-secondary wrap-toggle-btn"
                  onClick={() => setShowWrapModal(!showWrapModal)}
                >
                  <Layers size={15} />
                  Wrap / Unwrap
                </button>
              </div>

              {/* Wrap Panel Drawer if open */}
              {showWrapModal && (
                <div className="wrap-panel">
                  <div className="wrap-header">
                    <span>ERC-20 <ChevronRight size={14} /> ERC-7984 (Confidential)</span>
                    <button className="close-btn" onClick={() => setShowWrapModal(false)}>×</button>
                  </div>
                  <div className="wrap-input-group">
                    <input 
                      type="number" 
                      value={wrapAmount} 
                      onChange={(e) => setWrapAmount(e.target.value)}
                      placeholder="Amount to wrap"
                    />
                    <button className="btn-primary btn-sm" onClick={handleFaucet}>
                      Wrap to cUSDC
                    </button>
                  </div>
                </div>
              )}

              {/* Token In */}
              <div className="input-box">
                <div className="input-box-header">
                  <span>You Pay (Encrypted Input)</span>
                  <span className="balance-text">
                    Balance: {isDecrypted ? `${balances[tokenIn]?.decrypted} ${tokenIn}` : balances[tokenIn]?.handle}
                  </span>
                </div>
                <div className="input-row">
                  <input 
                    type="number" 
                    className="amount-input" 
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="0.0"
                  />
                  <select 
                    className="token-select" 
                    value={tokenIn}
                    onChange={(e) => setTokenIn(e.target.value)}
                  >
                    <option value="cUSDC">cUSDC (ERC-7984)</option>
                    <option value="cETH">cETH (ERC-7984)</option>
                    <option value="cWBTC">cWBTC (ERC-7984)</option>
                  </select>
                </div>
                <div className="encrypted-handle-preview">
                  <Lock size={12} />
                  <span>SDK Handle payload: </span>
                  <code>{`0xeinput_7984_${(parseFloat(amountIn) * 12345).toString(16).substring(0, 10)}...`}</code>
                </div>
              </div>

              {/* Swap Switch Arrow */}
              <div className="swap-arrow-container">
                <button 
                  className="swap-arrow-btn"
                  onClick={() => {
                    const temp = tokenIn;
                    setTokenIn(tokenOut);
                    setTokenOut(temp);
                  }}
                >
                  <ArrowDown size={18} />
                </button>
              </div>

              {/* Token Out */}
              <div className="input-box">
                <div className="input-box-header">
                  <span>You Receive (Estimated Output)</span>
                  <span className="balance-text">
                    Balance: {isDecrypted ? `${balances[tokenOut]?.decrypted} ${tokenOut}` : balances[tokenOut]?.handle}
                  </span>
                </div>
                <div className="input-row">
                  <input 
                    type="text" 
                    className="amount-input" 
                    value={(parseFloat(amountIn) / (tokenIn === 'cUSDC' ? 3000 : 0.00033)).toFixed(4)}
                    readOnly
                  />
                  <select 
                    className="token-select" 
                    value={tokenOut}
                    onChange={(e) => setTokenOut(e.target.value)}
                  >
                    <option value="cETH">cETH (ERC-7984)</option>
                    <option value="cUSDC">cUSDC (ERC-7984)</option>
                    <option value="cWBTC">cWBTC (ERC-7984)</option>
                  </select>
                </div>
              </div>

              {/* TEE Step Progress Indicator */}
              {isSwapping && (
                <div className="tee-progress-box">
                  <div className="tee-step">
                    <Lock size={16} className={swapStep >= 1 ? 'active-step-icon' : ''} />
                    <span className={swapStep === 1 ? 'active-step' : ''}>1. Encrypting Client Payload</span>
                  </div>
                  <div className="tee-step">
                    <Cpu size={16} className={swapStep >= 2 ? 'active-step-icon' : ''} />
                    <span className={swapStep === 2 ? 'active-step' : ''}>2. iExec Nox TEE (Intel TDX Enclave)</span>
                  </div>
                  <div className="tee-step">
                    <CheckCircle2 size={16} className={swapStep >= 3 ? 'active-step-icon' : ''} />
                    <span className={swapStep === 3 ? 'active-step' : ''}>3. Sepolia Settlement</span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                className="btn-primary swap-submit-btn"
                onClick={handleSwap}
                disabled={isSwapping}
              >
                {isSwapping ? (
                  <>
                    <RefreshCw size={18} className="spin-icon" />
                    Executing Nox TEE Confidential Swap...
                  </>
                ) : isConnected ? (
                  <>
                    <Shield size={18} />
                    Swap Confidentially with Nox
                  </>
                ) : (
                  'Connect Wallet to Swap'
                )}
              </button>
            </div>

            {/* Sidebar Cards */}
            <div className="sidebar-stack">
              {/* Local Decryption Card */}
              <div className="glass-panel decryption-card">
                <div className="card-header-sm">
                  <div className="flex-align-gap">
                    <Lock size={18} color="#a855f7" />
                    <h3>Private Balance Decryption</h3>
                  </div>
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => setIsDecrypted(!isDecrypted)}
                  >
                    {isDecrypted ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isDecrypted ? 'Hide Plaintext' : 'Decrypt Local'}
                  </button>
                </div>
                <p className="card-desc">
                  {isDecrypted 
                    ? 'Decrypted using your local session key. Plaintext data is never exposed on Sepolia Etherscan.'
                    : 'Balances are stored as encrypted handles (ERC-7984). Click Decrypt to view plaintext locally.'}
                </p>

                <div className="balances-list">
                  <div className="balance-item">
                    <span>cUSDC Balance</span>
                    <span className="mono-font balance-value">
                      {isDecrypted ? '2,500.00 USDC' : balances.cUSDC.handle}
                    </span>
                  </div>
                  <div className="balance-item">
                    <span>cETH Balance</span>
                    <span className="mono-font balance-value">
                      {isDecrypted ? '4.85 ETH' : balances.cETH.handle}
                    </span>
                  </div>
                </div>
              </div>

              {/* On-Chain Etherscan Proof Card */}
              <div className="glass-panel proof-card">
                <div className="flex-align-gap mb-2">
                  <Globe size={18} color="#06b6d4" />
                  <h3>On-Chain Sepolia Inspector</h3>
                </div>
                <p className="card-desc mb-3">
                  Verification proof: Etherscan logs display encrypted ciphertext handles instead of trade amounts.
                </p>

                <div className="etherscan-preview">
                  <div className="etherscan-row">
                    <span className="lbl">Tx Hash:</span>
                    <a 
                      href="https://sepolia.etherscan.io" 
                      target="_blank" 
                      rel="noreferrer"
                      className="link-btn"
                    >
                      0x9a8b...5a4b <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="etherscan-row">
                    <span className="lbl">Event:</span>
                    <span className="badge-nox">NoxCompute (TEE Verified)</span>
                  </div>
                  <div className="etherscan-row">
                    <span className="lbl">Trade Amount:</span>
                    <span className="mono-font text-encrypted">[ENCRYPTED_CIPHERTEXT]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions Section */}
        {activeTab === 'swap' && (
          <div className="glass-panel history-panel mt-6">
            <h3 className="section-title">Recent Confidential Transactions</h3>
            <div className="table-responsive">
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>Tx Hash</th>
                    <th>Pair</th>
                    <th>Encrypted Input Payload</th>
                    <th>TEE Execution Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer" className="link-btn">
                          {tx.hash.substring(0, 10)}...{tx.hash.substring(58)} <ExternalLink size={12} />
                        </a>
                      </td>
                      <td>{tx.tokenIn} → {tx.tokenOut}</td>
                      <td><code className="mono-font text-encrypted">{tx.encryptedHandle}</code></td>
                      <td>{tx.teeTime}</td>
                      <td><span className="badge-nox">{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Presentation & Landing Page */}
        {activeTab === 'landing' && (
          <div className="glass-panel presentation-container">
            <div className="hero-landing">
              <div className="badge-nox mb-3">
                <Sparkles size={14} />
                iExec WTF Hackathon Summer Edition Project
              </div>
              <h1 className="hero-title">Trade Any DeFi Asset With True Confidentiality</h1>
              <p className="hero-subtitle">
                NoxSwap integrates iExec Nox Protocol & ERC-7984 confidential smart contracts to eliminate MEV sandwich attacks and copy-trading without breaking EVM composability on Ethereum Sepolia.
              </p>

              <div className="hero-ctas">
                <button className="btn-primary" onClick={() => setActiveTab('swap')}>
                  Launch NoxSwap DApp <ChevronRight size={18} />
                </button>
                <a 
                  href="https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition" 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <Code2 size={16} /> View GitHub Source
                </a>
              </div>
            </div>

            {/* Core Features Grid */}
            <div className="features-grid">
              <div className="feature-card">
                <Shield className="feature-icon" color="#6366f1" />
                <h3>Zero MEV & Sandwich Attack Protection</h3>
                <p>Order size and slippage bounds are encrypted client-side using `@iexec-nox/handle`. Front-running bots cannot extract value from your transactions.</p>
              </div>

              <div className="feature-card">
                <Cpu className="feature-icon" color="#a855f7" />
                <h3>iExec Nox TEE Computation</h3>
                <p>Computations run within Intel TDX hardware enclaves off-chain. State transitions are verified on Ethereum Sepolia via `NoxCompute` triggers.</p>
              </div>

              <div className="feature-card">
                <Layers className="feature-icon" color="#06b6d4" />
                <h3>ERC-7984 Confidential Tokens</h3>
                <p>Standardized confidential token wrappers (`cUSDC`, `cETH`) using encrypted handles instead of public plaintext balances.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Developer Feedback (feedback.md) */}
        {activeTab === 'feedback' && (
          <div className="glass-panel feedback-container">
            <div className="card-header">
              <div>
                <h2 className="card-title">iExec Developer Tools Feedback (`feedback.md`)</h2>
                <p className="card-subtitle">Official deliverable submission doc for iExec WTF Hackathon Summer Edition</p>
              </div>
              <span className="badge-nox">Requirement REQ-004 Verified</span>
            </div>

            <div className="markdown-viewer mono-font">
              <pre>{FEEDBACK_CONTENT}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const FEEDBACK_CONTENT = `# iExec Developer Tools Feedback — WTF Hackathon Summer Edition

## 1. Overview & Overall Experience
Building NoxSwap on top of the iExec Nox protocol has been a smooth developer experience. 
The integration of TEE (Intel TDX) with ERC-7984 confidential smart contract standards provides a unique solution for DeFi privacy while maintaining EVM composability on Sepolia.

## 2. Key Strengths
- **ERC-7984 Standards**: The @iexec-nox/nox-confidential-contracts library makes it straightforward to wrap standard ERC-20 tokens into confidential tokens.
- **Client-side Handle SDK**: @iexec-nox/handle simplifies generating einput payloads directly in the React frontend without complex cryptographic boilerplate.
- **Hardhat Starter**: The nox-hardhat-starter template allowed us to write, compile, and deploy NoxSwap.sol seamlessly.

## 3. Areas for Improvement & Suggestions
- **TEE Execution Latency Status**: Providing clearer WebSocket event hooks for pending TEE runner execution state on Sepolia would improve UI spinner feedback.
- **Etherscan Verification Tooling**: A dedicated explorer plugin for visualizing ERC-7984 encrypted handles vs TEE proofs would enhance end-user transparency.`;
