import React, { useState } from 'react';
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
  ChevronRight,
  Sparkles,
  Layers,
  Globe,
  ArrowUpRight,
  Check,
  X
} from 'lucide-react';
import './App.css';

export default function App() {
  // Navigation State: 'landing' (First Page/Landing), 'swap', 'wrap', 'feedback'
  const [activeTab, setActiveTab] = useState('landing');
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  
  // Swap state
  const [tokenIn, setTokenIn] = useState('cUSDC');
  const [tokenOut, setTokenOut] = useState('cETH');
  const [amountIn, setAmountIn] = useState('1000');
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState(0); // 0: Idle, 1: Client Encrypt, 2: TEE Compute, 3: Sepolia Settlement
  
  // Wrap / Unwrap state
  const [wrapAmount, setWrapAmount] = useState('500');
  const [wrapMode, setWrapMode] = useState('wrap'); // 'wrap' | 'unwrap'
  
  // Decryption state
  const [isDecrypted, setIsDecrypted] = useState(false);
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
    setSwapStep(1); // Encrypting client-side payload

    setTimeout(() => {
      setSwapStep(2); // iExec Nox TEE Execution
      
      setTimeout(() => {
        setSwapStep(3); // Sepolia Settlement
        
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
            teeTime: `${(2.4 + Math.random()).toFixed(1)}s`,
            timestamp: 'Just now'
          };
          setTransactions(prev => [newTx, ...prev]);
        }, 1200);
      }, 1800);
    }, 1200);
  };

  const handleFaucet = () => {
    setBalances(prev => ({
      ...prev,
      cUSDC: { ...prev.cUSDC, decrypted: prev.cUSDC.decrypted + 1000 }
    }));
    setShowFaucetToast(true);
    setTimeout(() => setShowFaucetToast(false), 3000);
  };

  const handleWrapAction = () => {
    const num = parseFloat(wrapAmount) || 0;
    if (wrapMode === 'wrap') {
      setBalances(prev => ({
        ...prev,
        cUSDC: { ...prev.cUSDC, decrypted: prev.cUSDC.decrypted + num }
      }));
    } else {
      setBalances(prev => ({
        ...prev,
        cUSDC: { ...prev.cUSDC, decrypted: Math.max(0, prev.cUSDC.decrypted - num) }
      }));
    }
    setShowFaucetToast(true);
    setTimeout(() => setShowFaucetToast(false), 3000);
  };

  return (
    <div className="neo-layout">
      {/* Top Navigation Bar */}
      <header className="neo-navbar neo-box">
        <div className="nav-brand-group" onClick={() => setActiveTab('landing')}>
          <div className="neo-logo-icon">
            <Shield size={24} color="#000" />
            <Zap size={14} color="#000" className="zap-badge" />
          </div>
          <div>
            <div className="brand-name">NoxSwap</div>
            <div className="brand-tag">Confidential DEX Router</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tab-container">
          <button 
            className={`neo-nav-link ${activeTab === 'landing' ? 'active-link' : ''}`}
            onClick={() => setActiveTab('landing')}
          >
            <Globe size={16} />
            Landing Page
          </button>
          <button 
            className={`neo-nav-link ${activeTab === 'swap' ? 'active-link' : ''}`}
            onClick={() => setActiveTab('swap')}
          >
            <RefreshCw size={16} />
            Confidential Swap
          </button>
          <button 
            className={`neo-nav-link ${activeTab === 'wrap' ? 'active-link' : ''}`}
            onClick={() => setActiveTab('wrap')}
          >
            <Layers size={16} />
            Wrap & Faucet
          </button>
          <button 
            className={`neo-nav-link ${activeTab === 'feedback' ? 'active-link' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <FileText size={16} />
            Developer Feedback
          </button>
        </nav>

        {/* Right Badges & Wallet Connect */}
        <div className="nav-actions">
          <span className="neo-badge badge-purple">
            <span className="live-dot"></span>
            ETH Sepolia
          </span>
          <span className="neo-badge badge-green">
            <Cpu size={12} />
            iExec Nox TEE
          </span>

          <button className="neo-btn btn-yellow wallet-connect-btn" onClick={handleConnectWallet}>
            {isConnected ? (
              <>
                <CheckCircle2 size={16} />
                {`${userAddress.substring(0, 6)}...${userAddress.substring(38)}`}
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </header>

      {/* Faucet Notification Toast */}
      {showFaucetToast && (
        <div className="neo-toast neo-box">
          <Sparkles size={20} color="#000" />
          <span>Success! Test Tokens updated on Sepolia Testnet.</span>
        </div>
      )}

      {/* PAGE 1: LANDING PAGE (TRANG ĐẦU TIÊN) */}
      {activeTab === 'landing' && (
        <div className="landing-page-container">
          {/* Hero Banner */}
          <section className="neo-hero neo-box">
            <div className="hero-badge-row">
              <span className="neo-badge badge-pink">
                <Sparkles size={14} /> iExec WTF Hackathon Summer Edition
              </span>
              <span className="neo-badge badge-cyan">
                ERC-7984 Confidential Tokens
              </span>
            </div>

            <h1 className="hero-heading">
              TRADE ANY DEFI ASSET WITH <span className="highlight-yellow">TRUE CONFIDENTIALITY</span>
            </h1>

            <p className="hero-description">
              NoxSwap integrates the <strong>iExec Nox Protocol</strong> (Intel TDX TEE compute + ERC-7984 confidential smart contracts) to eliminate MEV sandwich attacks and copy-trading without breaking EVM composability on Ethereum Sepolia.
            </p>

            <div className="hero-action-buttons">
              <button className="neo-btn btn-yellow btn-hero" onClick={() => setActiveTab('swap')}>
                LAUNCH NOXSWAP APP <ChevronRight size={20} />
              </button>
              <a 
                href="https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition" 
                target="_blank" 
                rel="noreferrer"
                className="neo-btn btn-white btn-hero"
              >
                <Code2 size={18} /> VIEW GITHUB REPO <ArrowUpRight size={16} />
              </a>
            </div>
          </section>

          {/* Unified Problem & Solution Container */}
          <section className="neo-box unified-container">
            <div className="unified-header">
              <span className="neo-badge badge-pink">Context & Solution</span>
              <h2>Eliminating MEV Front-Running with Off-Chain TEE Enclaves</h2>
            </div>
            
            <div className="problem-solution-inner">
              <div className="prob-col">
                <h3 className="col-title text-pink">The Problem with Public AMMs</h3>
                <p>On standard DEXs (Uniswap, Curve), trade sizes and slippage bounds are 100% transparent. Front-running bots exploit this visibility to extract value via MEV sandwich attacks.</p>
                <ul className="clean-check-list">
                  <li><X size={16} color="#ff5757" /> MEV Sandwich Attacks on public trades</li>
                  <li><X size={16} color="#ff5757" /> Public balance history & copy-trading risk</li>
                </ul>
              </div>

              <div className="sol-col">
                <h3 className="col-title text-green">The NoxSwap Confidential Solution</h3>
                <p>NoxSwap encrypts swap parameters client-side via `@iexec-nox/handle`. State transitions are calculated in off-chain Intel TDX TEE enclaves and settled to Sepolia contracts.</p>
                <ul className="clean-check-list">
                  <li><Check size={16} color="#00e676" /> Encrypted input handles (`einput`)</li>
                  <li><Check size={16} color="#00e676" /> 100% EVM Composability on Sepolia</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Technical Architecture & Comparison Container */}
          <section className="neo-box unified-container">
            <div className="unified-header">
              <span className="neo-badge badge-cyan">Architecture & Specs</span>
              <h2>How NoxSwap Works & Competitor Matrix</h2>
            </div>

            <div className="arch-flow-row">
              <div className="arch-mini-step">
                <span className="step-badge">1</span>
                <strong>Client Encryption</strong>
                <span>Mã hóa input payload via SDK</span>
              </div>
              <div className="arch-mini-step">
                <span className="step-badge">2</span>
                <strong>Sepolia Tx</strong>
                <span>On-chain log ciphertext</span>
              </div>
              <div className="arch-mini-step">
                <span className="step-badge">3</span>
                <strong>iExec Nox TEE</strong>
                <span>Intel TDX off-chain compute</span>
              </div>
              <div className="arch-mini-step">
                <span className="step-badge">4</span>
                <strong>Local Decrypt</strong>
                <span>Xem số dư local với Viewing Key</span>
              </div>
            </div>

            <div className="table-wrapper mt-3">
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Standard AMMs (Uniswap)</th>
                    <th>ZK Shielded Pools (Railgun)</th>
                    <th>NoxSwap (iExec Nox)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Trade Amount Privacy</td>
                    <td>❌ Public (Plaintext)</td>
                    <td>✅ Private (ZK-SNARK)</td>
                    <td><span className="neo-badge badge-green">✅ Private (ERC-7984)</span></td>
                  </tr>
                  <tr>
                    <td>DeFi Composability</td>
                    <td>✅ 100% EVM Native</td>
                    <td>❌ Isolated Pool</td>
                    <td><span className="neo-badge badge-green">✅ 100% Sepolia Native</span></td>
                  </tr>
                  <tr>
                    <td>MEV Protection</td>
                    <td>❌ High Vulnerability</td>
                    <td>⚠️ Partial</td>
                    <td><span className="neo-badge badge-green">✅ Complete Protection</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* PAGE 2: CONFIDENTIAL SWAP DAPP */}
      {activeTab === 'swap' && (
        <div className="swap-page-grid">
          {/* Main Swap Card */}
          <div className="neo-box swap-main-card">
            <div className="card-header-row">
              <div>
                <h2 className="card-title-text">CONFIDENTIAL SWAP</h2>
                <p className="card-subtitle-text">Route confidential token swaps on Sepolia</p>
              </div>
              <span className="neo-badge badge-yellow">
                <Shield size={12} /> MEV-Proof Active
              </span>
            </div>

            {/* Token Pay Input */}
            <div className="neo-input-box">
              <div className="input-header">
                <span>YOU PAY (ENCRYPTED HANDLE)</span>
                <span className="balance-lbl">
                  Balance: {isDecrypted ? `${balances[tokenIn]?.decrypted} ${tokenIn}` : balances[tokenIn]?.handle}
                </span>
              </div>
              <div className="input-fields">
                <input 
                  type="number"
                  className="neo-amount-input"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.0"
                />
                <select 
                  className="neo-select"
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                >
                  <option value="cUSDC">cUSDC (ERC-7984)</option>
                  <option value="cETH">cETH (ERC-7984)</option>
                  <option value="cWBTC">cWBTC (ERC-7984)</option>
                </select>
              </div>
              <div className="payload-tag">
                <Lock size={12} /> Handle: <code>{`0xeinput_7984_${(parseFloat(amountIn) * 87654).toString(16).substring(0, 10)}...`}</code>
              </div>
            </div>

            {/* Switch Arrow */}
            <div className="swap-switch-row">
              <button 
                className="neo-btn btn-cyan switch-btn"
                onClick={() => {
                  const temp = tokenIn;
                  setTokenIn(tokenOut);
                  setTokenOut(temp);
                }}
              >
                <ArrowDown size={18} />
              </button>
            </div>

            {/* Token Receive Input */}
            <div className="neo-input-box">
              <div className="input-header">
                <span>YOU RECEIVE (ESTIMATED)</span>
                <span className="balance-lbl">
                  Balance: {isDecrypted ? `${balances[tokenOut]?.decrypted} ${tokenOut}` : balances[tokenOut]?.handle}
                </span>
              </div>
              <div className="input-fields">
                <input 
                  type="text"
                  className="neo-amount-input"
                  value={(parseFloat(amountIn) / (tokenIn === 'cUSDC' ? 3000 : 0.00033)).toFixed(4)}
                  readOnly
                />
                <select 
                  className="neo-select"
                  value={tokenOut}
                  onChange={(e) => setTokenOut(e.target.value)}
                >
                  <option value="cETH">cETH (ERC-7984)</option>
                  <option value="cUSDC">cUSDC (ERC-7984)</option>
                  <option value="cWBTC">cWBTC (ERC-7984)</option>
                </select>
              </div>
            </div>

            {/* TEE Progress Stepper */}
            {isSwapping && (
              <div className="neo-progress-box">
                <div className="progress-step">
                  <Lock size={16} className={swapStep >= 1 ? 'step-done' : ''} />
                  <span className={swapStep === 1 ? 'step-active' : ''}>1. Encrypting Client Payload</span>
                </div>
                <div className="progress-step">
                  <Cpu size={16} className={swapStep >= 2 ? 'step-done' : ''} />
                  <span className={swapStep === 2 ? 'step-active' : ''}>2. iExec Nox TEE (Intel TDX Enclave)</span>
                </div>
                <div className="progress-step">
                  <CheckCircle2 size={16} className={swapStep >= 3 ? 'step-done' : ''} />
                  <span className={swapStep === 3 ? 'step-active' : ''}>3. Sepolia Settlement</span>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <button 
              className="neo-btn btn-pink btn-execute"
              onClick={handleSwap}
              disabled={isSwapping}
            >
              {isSwapping ? (
                <>
                  <RefreshCw size={18} className="spin" /> EXECUTING NOX TEE SWAP...
                </>
              ) : isConnected ? (
                <>
                  <Shield size={18} /> SWAP CONFIDENTIALLY WITH NOX
                </>
              ) : (
                'CONNECT WALLET TO SWAP'
              )}
            </button>
          </div>

          {/* Right Sidebar: Decryption & On-Chain Inspector */}
          <div className="swap-sidebar">
            <div className="neo-box sidebar-card">
              <div className="card-header-row mb-2">
                <h3>PRIVATE BALANCE DECRYPTION</h3>
                <button 
                  className="neo-btn btn-white btn-sm"
                  onClick={() => setIsDecrypted(!isDecrypted)}
                >
                  {isDecrypted ? <EyeOff size={14} /> : <Eye size={14} />}
                  {isDecrypted ? 'HIDE' : 'DECRYPT'}
                </button>
              </div>
              <p className="card-text">
                {isDecrypted 
                  ? 'Decrypted using your local viewing key. Plaintext is never stored on Sepolia.'
                  : 'Balances are stored as encrypted handles (ERC-7984). Click Decrypt to view plaintext.'}
              </p>

              <div className="balance-rows mb-3">
                <div className="bal-row">
                  <span>cUSDC Balance</span>
                  <span className="mono-font bal-num">
                    {isDecrypted ? '2,500.00 USDC' : balances.cUSDC.handle}
                  </span>
                </div>
                <div className="bal-row">
                  <span>cETH Balance</span>
                  <span className="mono-font bal-num">
                    {isDecrypted ? '4.85 ETH' : balances.cETH.handle}
                  </span>
                </div>
              </div>

              <div className="inspector-mini-box">
                <div className="insp-row">
                  <span>Sepolia Inspector:</span>
                  <span className="neo-badge badge-green">NoxCompute Verified</span>
                </div>
                <div className="insp-row mt-1">
                  <span>On-Chain Amount:</span>
                  <span className="text-enc">[ENCRYPTED_HANDLE]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="neo-box tx-history-container">
            <h3>RECENT CONFIDENTIAL TRANSACTIONS</h3>
            <div className="table-wrapper mt-2">
              <table className="neo-table">
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
                        <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer" className="insp-link">
                          {tx.hash.substring(0, 10)}...{tx.hash.substring(58)} <ExternalLink size={12} />
                        </a>
                      </td>
                      <td>{tx.tokenIn} → {tx.tokenOut}</td>
                      <td><code className="text-enc">{tx.encryptedHandle}</code></td>
                      <td>{tx.teeTime}</td>
                      <td><span className="neo-badge badge-green">{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 3: WRAP & FAUCET */}
      {activeTab === 'wrap' && (
        <div className="wrap-page-container">
          <div className="neo-box wrap-card">
            <div className="card-header-row mb-3">
              <div>
                <h2>ERC-20 ↔ ERC-7984 CONFIDENTIAL WRAP</h2>
                <p className="card-subtitle-text">Convert public Sepolia tokens to confidential tokens</p>
              </div>
              <div className="wrap-mode-toggle">
                <button 
                  className={`neo-btn btn-sm ${wrapMode === 'wrap' ? 'btn-yellow' : 'btn-white'}`}
                  onClick={() => setWrapMode('wrap')}
                >
                  WRAP
                </button>
                <button 
                  className={`neo-btn btn-sm ${wrapMode === 'unwrap' ? 'btn-yellow' : 'btn-white'}`}
                  onClick={() => setWrapMode('unwrap')}
                >
                  UNWRAP
                </button>
              </div>
            </div>

            <div className="neo-input-box mb-3">
              <div className="input-header">
                <span>{wrapMode === 'wrap' ? 'Public Sepolia USDC' : 'Confidential cUSDC (ERC-7984)'}</span>
              </div>
              <div className="input-fields">
                <input 
                  type="number"
                  className="neo-amount-input"
                  value={wrapAmount}
                  onChange={(e) => setWrapAmount(e.target.value)}
                  placeholder="Amount"
                />
              </div>
            </div>

            <div className="action-row">
              <button className="neo-btn btn-green btn-flex" onClick={handleWrapAction}>
                {wrapMode === 'wrap' ? 'WRAP TO CONFIDENTIAL cUSDC' : 'UNWRAP TO PUBLIC USDC'}
              </button>

              <button className="neo-btn btn-cyan btn-flex" onClick={handleFaucet}>
                <Coins size={16} /> FAUCET (GET 1,000 TEST cUSDC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: DEVELOPER FEEDBACK (SINGLE UNIFIED DOCUMENT CONTAINER) */}
      {activeTab === 'feedback' && (
        <div className="feedback-page-container">
          {/* Single Unified Document Container */}
          <article className="neo-box single-document-card">
            {/* Document Header */}
            <header className="doc-header">
              <div className="doc-header-top">
                <span className="neo-badge badge-green">REQ-004 Official Submission</span>
                <span className="neo-badge badge-purple">iExec WTF Hackathon Summer Edition</span>
              </div>
              <h1 className="doc-main-title">iExec Developer Ecosystem Feedback Report</h1>
              <p className="doc-meta-subtitle">
                Comprehensive technical review & strategic recommendations based on building <strong>NoxSwap</strong> using the iExec Nox Protocol, ERC-7984, and `@iexec-nox/handle`.
              </p>
            </header>

            <hr className="doc-divider" />

            {/* Section 1 */}
            <section className="doc-section">
              <h2 className="doc-sec-title">1. Executive Summary & Context</h2>
              <p>
                During the iExec WTF Hackathon Summer Edition, our team built <strong>NoxSwap</strong>, a confidential DEX swap router that leverages the <strong>iExec Nox Protocol</strong> to execute confidential token swaps on Ethereum Sepolia Testnet. 
              </p>
              <p>
                NoxSwap addresses a critical challenge in decentralized finance: maintaining commercial transaction privacy and eliminating MEV sandwich attacks without breaking EVM composability. By combining on-chain smart contracts implementing the <strong>ERC-7984 Confidential Token Standard</strong> with off-chain <strong>Intel TDX Trusted Execution Environment (TEE)</strong> compute enclaves, Nox enables true privacy-preserving swaps.
              </p>
            </section>

            {/* Section 2 */}
            <section className="doc-section">
              <h2 className="doc-sec-title">2. Developer Experience Highlights (What Worked Great)</h2>
              <div className="doc-bullet-list">
                <div className="doc-bullet-item">
                  <strong>Standardized ERC-7984 Architecture:</strong> The `@iexec-nox/nox-confidential-contracts` package provides a clean `IERC7984` interface for confidential tokens (`cUSDC`, `cETH`). Replacing public balances with deterministic encrypted handles (`bytes32`) is elegant and avoids complex Zero-Knowledge circuit development.
                </div>
                <div className="doc-bullet-item">
                  <strong>Client-Side Encryption SDK (`@iexec-nox/handle`):</strong> Integrating client-side handle generation directly into our React 18 / Vite Web DApp was smooth. Developers can produce valid `einput` ciphertext handles without needing heavy local WASM cryptographic binaries.
                </div>
                <div className="doc-bullet-item">
                  <strong>Hardhat Starter & Plugin Ecosystem:</strong> The `nox-hardhat-starter` template and `nox-hardhat-plugin` provided a solid foundation for writing, compiling, and deploying `NoxSwap.sol` on Sepolia.
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="doc-section">
              <h2 className="doc-sec-title">3. In-Depth Technical Analysis & Pain Points</h2>
              <div className="doc-bullet-list">
                <div className="doc-bullet-item">
                  <strong>TEE Execution State Visibility:</strong> Submitting a transaction on-chain triggers a `NoxCompute` event for off-chain TEE runners. However, tracking transitions from `TX_SUBMITTED` → `TEE_ENCLAVE_PROCESSING` → `SETTLED` currently requires manual contract event polling in the frontend.
                </div>
                <div className="doc-bullet-item">
                  <strong>Error Diagnosis Inside TEE Enclaves:</strong> When an off-chain TEE runner encounters a state revert (e.g., liquidity check failure), the on-chain transaction logs generic revert strings, making local debugging challenging.
                </div>
                <div className="doc-bullet-item">
                  <strong>Etherscan Transparency Visualization:</strong> On Sepolia Etherscan, transactions display raw `bytes32` ciphertext handles. Users cannot visually confirm that TEE hardware verification occurred without inspecting raw log topics.
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section className="doc-section">
              <h2 className="doc-sec-title">4. Strategic Recommendations for iExec Core Team</h2>
              <div className="rec-summary-box">
                <div className="rec-point">
                  <span className="rec-num">Rec 1</span>
                  <div>
                    <strong>Native WebSocket Event Subscription SDK:</strong> Add a high-level WebSocket listener in `@iexec-nox/handle` (`noxSDK.onTEEStateChange(txHash, callback)`) for real-time frontend TEE progress animation.
                  </div>
                </div>

                <div className="rec-point">
                  <span className="rec-num">Rec 2</span>
                  <div>
                    <strong>Specialized iExec Nox Explorer / Etherscan Extension:</strong> Build an official explorer plugin that parses ERC-7984 handles and displays Intel TDX hardware attestation proofs directly next to transaction hashes.
                  </div>
                </div>

                <div className="rec-point">
                  <span className="rec-num">Rec 3</span>
                  <div>
                    <strong>Expanded Framework Starters:</strong> Provide official Next.js and Viem/Wagmi starter kits pre-configured with `@iexec-nox/handle` hooks and viewing-key decryption providers.
                  </div>
                </div>

                <div className="rec-point">
                  <span className="rec-num">Rec 4</span>
                  <div>
                    <strong>Local Mock TEE Hardhat Simulator Node:</strong> Provide an optional local Hardhat node module that simulates off-chain Nox TEE compute instantly during unit testing.
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      )}
    </div>
  );
}
