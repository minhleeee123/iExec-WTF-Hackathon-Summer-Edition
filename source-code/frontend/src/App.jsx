import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Droplets,
  ExternalLink,
  Eye,
  EyeOff,
  FileKey2,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import deployment from './deployment.json';
import {
  CHAINLINK_ETH_USD,
  CHAINLINK_FEED_ABI,
  CONFIDENTIAL_TOKEN_ABI,
  NOX_SWAP_ABI,
  TEST_TOKEN_ABI,
} from './contracts';
import hero from './assets/hero.png';
import './App.css';

const ZERO_HANDLE = `0x${'0'.repeat(64)}`;
const SEPOLIA_HEX = '0xaa36a7';
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const TOKENS = {
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

const shorten = (value, head = 6, tail = 4) =>
  value ? `${value.slice(0, head)}...${value.slice(-tail)}` : '--';

const isHandle = (value) => value && value !== ZERO_HANDLE;

const formatToken = (value, decimals, maximumFractionDigits = 6) =>
  Number(ethers.formatUnits(value, decimals)).toLocaleString(undefined, { maximumFractionDigits });

const decodeReceiptImage = (tokenUri) => {
  if (!tokenUri?.startsWith('data:application/json;base64,')) return '';
  const json = JSON.parse(atob(tokenUri.split(',')[1]));
  return json.image ?? '';
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const createHandleClient = async (signer) => {
  const { createEthersHandleClient } = await import('@iexec-nox/handle');
  return createEthersHandleClient(signer);
};

async function retry(operation, attempts = 12, delay = 8000) {
  let lastError;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) await sleep(delay);
    }
  }
  throw lastError;
}

export default function App() {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [tokenIn, setTokenIn] = useState('cUSDC');
  const [amountIn, setAmountIn] = useState('100');
  const [asset, setAsset] = useState('cUSDC');
  const [assetAmount, setAssetAmount] = useState('100');
  const [assetMode, setAssetMode] = useState('wrap');
  const [balances, setBalances] = useState({
    cUSDC: { public: 0n, handle: ZERO_HANDLE, decrypted: null },
    cETH: { public: 0n, handle: ZERO_HANDLE, decrypted: null },
  });
  const [ethBalance, setEthBalance] = useState(0n);
  const [pool, setPool] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [auditor, setAuditor] = useState('');
  const [aclResult, setAclResult] = useState(null);
  const [lastProof, setLastProof] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [showProof, setShowProof] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHandles, setShowHandles] = useState(true);

  const tokenOut = tokenIn === 'cUSDC' ? 'cETH' : 'cUSDC';
  const connected = Boolean(account);
  const correctNetwork = chainId === deployment.chainId;

  const referenceOutput = useMemo(() => {
    const amount = Number(amountIn);
    if (!ethPrice || !Number.isFinite(amount) || amount <= 0) return '--';
    const output = tokenIn === 'cUSDC' ? (amount / ethPrice) * 0.997 : amount * ethPrice * 0.997;
    return output.toLocaleString(undefined, { maximumFractionDigits: tokenOut === 'cETH' ? 6 : 2 });
  }, [amountIn, ethPrice, tokenIn, tokenOut]);

  const addLog = (message, transactionHash = '') => {
    setLogs((current) => [{ time: new Date().toLocaleTimeString(), message, transactionHash }, ...current]);
  };

  const fail = (error) => {
    console.error(error);
    setNotice({ type: 'error', text: error.shortMessage ?? error.reason ?? error.message ?? 'Transaction failed.' });
  };

  const getWallet = async () => {
    if (!window.ethereum) throw new Error('MetaMask is required for write operations.');
    let browserProvider = new ethers.BrowserProvider(window.ethereum);
    let network = await browserProvider.getNetwork();
    if (network.chainId !== BigInt(deployment.chainId)) {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_HEX }] });
      browserProvider = new ethers.BrowserProvider(window.ethereum);
      network = await browserProvider.getNetwork();
    }
    const signer = await browserProvider.getSigner();
    return { provider: browserProvider, signer, address: await signer.getAddress() };
  };

  const connect = async () => {
    try {
      setBusy('connect');
      await window.ethereum?.request({ method: 'eth_requestAccounts' });
      const wallet = await getWallet();
      setAccount(wallet.address);
      setChainId(Number((await wallet.provider.getNetwork()).chainId));
      setNotice({ type: 'success', text: 'Wallet connected to Ethereum Sepolia.' });
      addLog(`Wallet connected: ${shorten(wallet.address)}`);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const loadMarket = async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL, deployment.chainId, { staticNetwork: true });
    const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, provider);
    const feed = new ethers.Contract(CHAINLINK_ETH_USD, CHAINLINK_FEED_ABI, provider);
    const [poolData, round, feedDecimals] = await Promise.all([
      router.getPoolHandles(deployment.contracts.cUSDC, deployment.contracts.cETH),
      feed.latestRoundData(),
      feed.decimals(),
    ]);
    setPool({ token0: poolData.token0, token1: poolData.token1, reserve0: poolData.reserve0, reserve1: poolData.reserve1 });
    setEthPrice(Number(ethers.formatUnits(round.answer, feedDecimals)));
    setPriceUpdatedAt(Number(round.updatedAt));
  };

  const loadAccount = async (address = account) => {
    if (!address || !window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const next = {};
    await Promise.all(Object.values(TOKENS).map(async (token) => {
      const underlying = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, provider);
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, provider);
      const [publicBalance, handle] = await Promise.all([
        underlying.balanceOf(address),
        wrapper.confidentialBalanceOf(address),
      ]);
      next[token.symbol] = { public: publicBalance, handle, decrypted: null };
    }));
    setBalances(next);
    setEthBalance(await provider.getBalance(address));

    const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, provider);
    const deploymentReceipt = await provider.getTransactionReceipt(deployment.deploymentTransactions.noxSwapRouter);
    const events = await router.queryFilter(
      router.filters.SwapExecuted(address),
      deploymentReceipt.blockNumber,
      'latest',
    );
    setHistory(events.slice(-12).reverse().map((event) => ({
      hash: event.transactionHash,
      block: event.blockNumber,
      tokenIn: event.args.tokenIn,
      tokenOut: event.args.tokenOut,
      inputHandle: event.args.encryptedInput,
      outputHandle: event.args.encryptedOutput,
      receiptId: event.args.receiptId.toString(),
    })));
  };

  const refresh = async () => {
    try {
      setBusy('refresh');
      await Promise.all([loadMarket(), loadAccount()]);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    loadMarket().catch(fail);
    if (!window.ethereum) return undefined;
    const sync = async () => {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });
      setAccount(accounts[0] ?? '');
      setChainId(Number(BigInt(chain)));
    };
    const onAccounts = (accounts) => setAccount(accounts[0] ?? '');
    const onChain = (chain) => setChainId(Number(BigInt(chain)));
    sync().catch(fail);
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, []);

  useEffect(() => {
    if (account && correctNetwork) loadAccount(account).catch(fail);
  }, [account, correctNetwork]);

  const faucet = async (symbol) => {
    try {
      setBusy(`faucet-${symbol}`);
      const wallet = await getWallet();
      const token = TOKENS[symbol];
      const contract = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, wallet.signer);
      const transaction = await contract.faucet();
      addLog(`${token.publicSymbol} faucet submitted`, transaction.hash);
      await transaction.wait();
      setNotice({ type: 'success', text: `${token.publicSymbol} faucet confirmed.` });
      await loadAccount(wallet.address);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const manageAsset = async () => {
    try {
      const token = TOKENS[asset];
      const amount = ethers.parseUnits(assetAmount, token.decimals);
      if (amount <= 0n) throw new Error('Enter an amount greater than zero.');
      setBusy(assetMode);
      const wallet = await getWallet();
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const underlying = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, wallet.signer);

      if (assetMode === 'wrap') {
        const approval = await underlying.approve(token.wrapper, amount);
        addLog(`Approve ${token.publicSymbol}`, approval.hash);
        await approval.wait();
        const transaction = await wrapper.wrap(wallet.address, amount);
        addLog(`Wrap ${assetAmount} ${token.publicSymbol}`, transaction.hash);
        await transaction.wait();
      } else {
        const client = await createHandleClient(wallet.signer);
        const encrypted = await client.encryptInput(amount, 'uint256', token.wrapper);
        const request = await wrapper['unwrap(address,address,bytes32,bytes)'](
          wallet.address,
          wallet.address,
          encrypted.handle,
          encrypted.handleProof,
        );
        addLog(`Unwrap request for ${assetAmount} ${token.symbol}`, request.hash);
        const requestReceipt = await request.wait();
        const event = requestReceipt.logs
          .map((log) => { try { return wrapper.interface.parseLog(log); } catch { return null; } })
          .find((item) => item?.name === 'UnwrapRequested');
        if (!event) throw new Error('UnwrapRequested event was not found.');
        setNotice({ type: 'info', text: 'Waiting for public decryption proof from Nox Gateway...' });
        const publicResult = await retry(() => client.publicDecrypt(event.args.amount));
        const finalize = await wrapper.finalizeUnwrap(event.args.amount, publicResult.decryptionProof);
        addLog(`Finalize unwrap: ${formatToken(publicResult.value, token.decimals)} ${token.publicSymbol}`, finalize.hash);
        await finalize.wait();
      }

      setNotice({ type: 'success', text: `${assetMode === 'wrap' ? 'Wrap' : 'Unwrap'} completed on Sepolia.` });
      await loadAccount(wallet.address);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const decryptBalances = async () => {
    try {
      setBusy('decrypt');
      const wallet = await getWallet();
      const client = await createHandleClient(wallet.signer);
      const next = { ...balances };
      for (const token of Object.values(TOKENS)) {
        const current = balances[token.symbol];
        if (isHandle(current.handle)) {
          const result = await retry(() => client.decrypt(current.handle), 5, 3000);
          next[token.symbol] = { ...current, decrypted: result.value };
        }
      }
      setBalances(next);
      setNotice({ type: 'success', text: 'Authorized balances decrypted with an EIP-712 signature.' });
      addLog('Nox Gateway returned authorized balance plaintexts');
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const swap = async () => {
    try {
      const input = TOKENS[tokenIn];
      const output = TOKENS[tokenOut];
      const amount = ethers.parseUnits(amountIn, input.decimals);
      if (amount <= 0n) throw new Error('Enter an amount greater than zero.');
      setBusy('swap');
      setNotice({ type: 'info', text: 'Preparing confidential input with Nox Gateway...' });
      const wallet = await getWallet();
      const inputContract = new ethers.Contract(input.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, wallet.signer);
      if (!(await inputContract.isOperator(wallet.address, deployment.contracts.noxSwapRouter))) {
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
        const operatorTx = await inputContract.setOperator(deployment.contracts.noxSwapRouter, expiry);
        addLog(`Authorize router for ${input.symbol}`, operatorTx.hash);
        await operatorTx.wait();
      }

      const client = await createHandleClient(wallet.signer);
      const encrypted = await client.encryptInput(amount, 'uint256', deployment.contracts.noxSwapRouter);
      addLog(`Nox input created: ${shorten(encrypted.handle, 10, 8)}`);
      const transaction = await router.confidentialSwap(
        input.wrapper,
        output.wrapper,
        encrypted.handle,
        encrypted.handleProof,
      );
      addLog('Confidential swap submitted', transaction.hash);
      const mined = await transaction.wait();
      const event = mined.logs
        .map((log) => { try { return router.interface.parseLog(log); } catch { return null; } })
        .find((item) => item?.name === 'SwapExecuted');
      if (!event) throw new Error('SwapExecuted event was not found.');

      setNotice({ type: 'info', text: 'Swap settled. Waiting for authorized output decryption...' });
      const decrypted = await retry(() => client.decrypt(event.args.encryptedOutput));
      const tokenUri = await router.tokenURI(event.args.receiptId);
      const receiptData = {
        id: event.args.receiptId.toString(),
        owner: await router.ownerOf(event.args.receiptId),
        image: decodeReceiptImage(tokenUri),
        transactionHash: transaction.hash,
      };
      setReceipt(receiptData);
      setLastProof({
        transactionHash: transaction.hash,
        contract: deployment.contracts.noxSwapRouter,
        inputHandle: encrypted.handle,
        inputProofBytes: (encrypted.handleProof.length - 2) / 2,
        outputHandle: event.args.encryptedOutput,
        calldata: transaction.data,
        blockNumber: mined.blockNumber,
      });
      setNotice({
        type: 'success',
        text: `Swap confirmed. Received ${formatToken(decrypted.value, output.decimals)} ${output.symbol}; receipt #${receiptData.id} minted.`,
      });
      addLog(`Output decrypted: ${formatToken(decrypted.value, output.decimals)} ${output.symbol}`, transaction.hash);
      await Promise.all([loadAccount(wallet.address), loadMarket()]);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const grantAuditor = async () => {
    try {
      if (!ethers.isAddress(auditor)) throw new Error('Enter a valid Ethereum address.');
      setBusy('acl');
      const wallet = await getWallet();
      const client = await createHandleClient(wallet.signer);
      const results = [];
      for (const token of Object.values(TOKENS)) {
        const handle = balances[token.symbol].handle;
        if (!isHandle(handle)) continue;
        const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
        const transaction = await wrapper.grantBalanceViewer(auditor);
        addLog(`Grant ${token.symbol} balance viewer`, transaction.hash);
        await transaction.wait();
        const acl = await retry(() => client.viewACL(handle), 6, 4000);
        const viewers = [...acl.admins, ...acl.viewers].map((entry) => entry.toLowerCase());
        results.push({ symbol: token.symbol, handle, confirmed: viewers.includes(auditor.toLowerCase()) });
      }
      setAclResult(results);
      setNotice({ type: 'success', text: 'ACL transactions confirmed and checked against the Nox subgraph.' });
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const openHistoryReceipt = async (item) => {
    try {
      setBusy(`receipt-${item.receiptId}`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, provider);
      const tokenUri = await router.tokenURI(item.receiptId);
      setReceipt({
        id: item.receiptId,
        owner: await router.ownerOf(item.receiptId),
        image: decodeReceiptImage(tokenUri),
        transactionHash: item.hash,
      });
      setShowReceipt(true);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#swap" aria-label="NoxSwap home">
          <span className="brand-mark"><LockKeyhole size={20} /></span>
          <span>NoxSwap</span>
          <span className="network-chip">Sepolia</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#swap">Swap</a>
          <a href="#assets">Assets</a>
          <a href="#activity">Activity</a>
        </nav>
        <button className="wallet-button" onClick={connect} disabled={busy === 'connect'}>
          {busy === 'connect' ? <LoaderCircle className="spin" size={17} /> : <Wallet size={17} />}
          {connected ? shorten(account) : 'Connect wallet'}
        </button>
      </header>

      <main>
        <section className="status-band">
          <div>
            <p className="eyebrow">CONFIDENTIAL AMM ON ETHEREUM SEPOLIA</p>
            <h1>Swap without publishing amounts.</h1>
            <p className="lede">Real ERC-7984 balances, Nox encrypted handles, constant-product settlement, and on-chain receipt NFTs.</p>
            <div className="status-row">
              <span><CheckCircle2 size={16} /> NoxCompute deployed</span>
              <span><CheckCircle2 size={16} /> Encrypted pool live</span>
              <a href={deployment.explorerUrl} target="_blank" rel="noreferrer">Router <ExternalLink size={14} /></a>
            </div>
          </div>
          <div className="protocol-visual" aria-label="Nox encrypted execution architecture">
            <img src={hero} alt="Two protocol layers representing encrypted input and settlement" />
            <dl>
              <div><dt>Gateway</dt><dd>gateway-testnets.noxprotocol.dev</dd></div>
              <div><dt>Network</dt><dd>Chain ID 11155111</dd></div>
              <div><dt>ETH / USD</dt><dd>{ethPrice ? `$${ethPrice.toLocaleString()}` : 'Loading...'}</dd></div>
            </dl>
          </div>
        </section>

        {notice && (
          <div className={`notice ${notice.type}`} role="status">
            <span>{notice.text}</span>
            <button className="icon-button" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        )}
        {!window.ethereum && <div className="notice error">MetaMask is not installed. Read-only market data remains available.</div>}
        {connected && !correctNetwork && <div className="notice error">Switch MetaMask to Ethereum Sepolia to use NoxSwap.</div>}

        <section id="swap" className="workspace-grid">
          <div className="swap-panel">
            <div className="section-heading">
              <div><p className="eyebrow">LIVE CONTRACT</p><h2>Confidential swap</h2></div>
              <button className="icon-button" onClick={refresh} aria-label="Refresh chain data" title="Refresh chain data">
                <RefreshCw className={busy === 'refresh' ? 'spin' : ''} size={18} />
              </button>
            </div>

            <div className="amount-box">
              <div className="amount-meta"><span>You encrypt</span><span>{connected ? `Handle ${shorten(balances[tokenIn].handle, 8, 6)}` : 'Connect wallet'}</span></div>
              <div className="amount-row">
                <input value={amountIn} onChange={(event) => setAmountIn(event.target.value)} inputMode="decimal" aria-label="Swap amount" />
                <select value={tokenIn} onChange={(event) => setTokenIn(event.target.value)} aria-label="Input token">
                  <option value="cUSDC">cUSDC</option><option value="cETH">cETH</option>
                </select>
              </div>
            </div>
            <div className="direction"><ArrowDown size={18} /></div>
            <div className="amount-box output">
              <div className="amount-meta"><span>Reference output</span><span>Chainlink price, 0.30% fee</span></div>
              <div className="amount-row"><strong>{referenceOutput}</strong><span className="token-pill">{tokenOut}</span></div>
            </div>
            <p className="field-note">The reference is public UI guidance. The contract computes the final amount from encrypted pool reserves.</p>

            <button className="primary-action" onClick={connected ? swap : connect} disabled={Boolean(busy)}>
              {busy === 'swap' ? <LoaderCircle className="spin" size={19} /> : <ShieldCheck size={19} />}
              {connected ? 'Encrypt and swap' : 'Connect wallet to swap'}
            </button>
            <div className="contract-strip">
              <span>Router {shorten(deployment.contracts.noxSwapRouter, 10, 8)}</span>
              <span>Fee 0.30%</span>
              <span>{priceUpdatedAt ? `Oracle ${new Date(priceUpdatedAt * 1000).toLocaleTimeString()}` : 'Oracle loading'}</span>
            </div>
          </div>

          <aside className="account-panel">
            <div className="section-heading">
              <div><p className="eyebrow">PRIVATE WALLET</p><h2>Encrypted balances</h2></div>
              <button className="icon-button" onClick={() => setShowHandles((value) => !value)} aria-label="Toggle handle display" title="Toggle handle display">
                {showHandles ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="wallet-line">{connected ? account : 'No wallet connected'}</p>
            {Object.values(TOKENS).map((token) => (
              <div className="balance-row" key={token.symbol}>
                <div><span>{token.symbol}</span><small>{showHandles ? shorten(balances[token.symbol].handle, 12, 8) : 'Encrypted handle hidden'}</small></div>
                <strong>{balances[token.symbol].decrypted === null ? 'Encrypted' : formatToken(balances[token.symbol].decrypted, token.decimals)}</strong>
              </div>
            ))}
            <button className="secondary-action" onClick={decryptBalances} disabled={!connected || Boolean(busy)}>
              {busy === 'decrypt' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Decrypt my balances
            </button>
            <div className="native-balance"><span>Sepolia ETH for gas</span><strong>{formatToken(ethBalance, 18, 4)}</strong></div>
          </aside>
        </section>

        <section id="assets" className="section-band">
          <div className="section-title"><div><p className="eyebrow">ASSET OPERATIONS</p><h2>Fund, wrap, and unwrap</h2></div><p>Test faucets enforce a one-hour cooldown. Wrapping is 1:1; unwrapping finalizes with a Nox public decryption proof.</p></div>
          <div className="asset-layout">
            <div className="faucet-list">
              {Object.values(TOKENS).map((token) => (
                <div className="faucet-item" key={token.symbol}>
                  <div><span>{token.publicSymbol}</span><small>Public balance {formatToken(balances[token.symbol].public, token.decimals)}</small></div>
                  <button onClick={() => faucet(token.symbol)} disabled={!connected || Boolean(busy)}>
                    <Droplets size={16} /> Faucet
                  </button>
                </div>
              ))}
            </div>
            <div className="asset-form">
              <div className="segmented" role="group" aria-label="Asset operation">
                <button className={assetMode === 'wrap' ? 'active' : ''} onClick={() => setAssetMode('wrap')}>Wrap</button>
                <button className={assetMode === 'unwrap' ? 'active' : ''} onClick={() => setAssetMode('unwrap')}>Unwrap</button>
              </div>
              <div className="inline-fields">
                <input value={assetAmount} onChange={(event) => setAssetAmount(event.target.value)} inputMode="decimal" aria-label="Asset amount" />
                <select value={asset} onChange={(event) => setAsset(event.target.value)} aria-label="Asset">
                  <option value="cUSDC">{assetMode === 'wrap' ? 'nUSDC' : 'cUSDC'}</option>
                  <option value="cETH">{assetMode === 'wrap' ? 'nWETH' : 'cETH'}</option>
                </select>
              </div>
              <button className="primary-action compact" onClick={manageAsset} disabled={!connected || Boolean(busy)}>
                {busy === assetMode ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />} {assetMode === 'wrap' ? 'Approve and wrap' : 'Request and finalize unwrap'}
              </button>
            </div>
          </div>
        </section>

        <section className="section-band acl-band">
          <div className="section-title"><div><p className="eyebrow">SELECTIVE DISCLOSURE</p><h2>Grant an auditor access</h2></div><p>The viewer is written to the ACL of each initialized balance handle. Public explorers still see only bytes32 handles.</p></div>
          <div className="acl-form">
            <FileKey2 size={22} />
            <input value={auditor} onChange={(event) => setAuditor(event.target.value)} placeholder="0x auditor address" aria-label="Auditor address" />
            <button onClick={grantAuditor} disabled={!connected || Boolean(busy)}>{busy === 'acl' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Grant viewer</button>
          </div>
          {aclResult && <div className="acl-results">{aclResult.map((item) => <span key={item.symbol} className={item.confirmed ? 'pass' : 'pending'}>{item.symbol}: {item.confirmed ? 'confirmed' : 'indexing'}</span>)}</div>}
        </section>

        <section id="activity" className="activity-grid">
          <div className="history-panel">
            <div className="section-heading"><div><p className="eyebrow">ON-CHAIN EVENTS</p><h2>Swap history</h2></div><History size={20} /></div>
            {history.length === 0 ? <p className="empty-state">No SwapExecuted events found for this wallet.</p> : (
              <div className="history-table" role="table">
                {history.map((item) => (
                  <div className="history-item" key={item.hash} role="row">
                    <div><strong>Receipt #{item.receiptId}</strong><small>Block {item.block}</small></div>
                    <code>{shorten(item.outputHandle, 12, 8)}</code>
                    <a href={`https://sepolia.etherscan.io/tx/${item.hash}`} target="_blank" rel="noreferrer" aria-label="Open transaction"><ArrowUpRight size={17} /></a>
                    <button className="icon-button" onClick={() => openHistoryReceipt(item)} aria-label={`Open receipt ${item.receiptId}`}><FileKey2 size={17} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="log-panel">
            <div className="section-heading"><div><p className="eyebrow">CLIENT LOG</p><h2>Execution evidence</h2></div><Activity size={20} /></div>
            {logs.length === 0 ? <p className="empty-state">Wallet actions will appear here as they occur.</p> : logs.map((entry, index) => (
              <div className="log-entry" key={`${entry.time}-${index}`}><time>{entry.time}</time><span>{entry.message}</span>{entry.transactionHash && <a href={`https://sepolia.etherscan.io/tx/${entry.transactionHash}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}</div>
            ))}
          </div>
        </section>

        <section className="evidence-band">
          <div><p className="eyebrow">VERIFIABLE DEPLOYMENT</p><h2>Inspect what the wallet submitted.</h2><p>Input proofs, calldata, output handles, block numbers, and receipt metadata come from the most recent confirmed transaction.</p></div>
          <div className="evidence-actions">
            <button onClick={() => setShowProof(true)} disabled={!lastProof}><ShieldCheck size={17} /> Inspect last proof</button>
            <button onClick={() => setShowReceipt(true)} disabled={!receipt}><FileKey2 size={17} /> Open receipt NFT</button>
          </div>
          <div className="deployment-facts">
            <span><LockKeyhole size={16} /> Router bytecode live</span>
            <span><ShieldCheck size={16} /> NoxCompute {shorten(deployment.contracts.noxCompute, 8, 6)}</span>
            <span><KeyRound size={16} /> Pool handles {pool ? 'initialized' : 'loading'}</span>
          </div>
        </section>
      </main>

      <footer><span>NoxSwap</span><span>Ethereum Sepolia / iExec Nox</span><a href={deployment.explorerUrl} target="_blank" rel="noreferrer">Contract <ExternalLink size={13} /></a></footer>

      {showProof && lastProof && (
        <div className="modal-backdrop" onMouseDown={() => setShowProof(false)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Privacy proof inspector">
            <div className="section-heading"><div><p className="eyebrow">TRANSACTION EVIDENCE</p><h2>Privacy proof inspector</h2></div><button className="icon-button" onClick={() => setShowProof(false)}><X size={18} /></button></div>
            <dl className="proof-list">
              <div><dt>Transaction</dt><dd>{lastProof.transactionHash}</dd></div>
              <div><dt>Router</dt><dd>{lastProof.contract}</dd></div>
              <div><dt>Input handle</dt><dd>{lastProof.inputHandle}</dd></div>
              <div><dt>Input proof</dt><dd>{lastProof.inputProofBytes} bytes</dd></div>
              <div><dt>Output handle</dt><dd>{lastProof.outputHandle}</dd></div>
              <div><dt>Block</dt><dd>{lastProof.blockNumber}</dd></div>
              <div><dt>Calldata</dt><dd className="calldata">{lastProof.calldata}</dd></div>
            </dl>
            <button className="secondary-action" onClick={() => navigator.clipboard.writeText(lastProof.transactionHash)}><Copy size={16} /> Copy transaction hash</button>
          </div>
        </div>
      )}

      {showReceipt && receipt && (
        <div className="modal-backdrop" onMouseDown={() => setShowReceipt(false)}>
          <div className="modal receipt-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Receipt NFT">
            <div className="section-heading"><div><p className="eyebrow">ERC-721 ON SEPOLIA</p><h2>Receipt #{receipt.id}</h2></div><button className="icon-button" onClick={() => setShowReceipt(false)}><X size={18} /></button></div>
            {receipt.image && <img src={receipt.image} alt={`On-chain NoxSwap receipt ${receipt.id}`} />}
            <p>Owner <code>{receipt.owner}</code></p>
            <a className="secondary-action" href={`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">View mint transaction <ExternalLink size={16} /></a>
          </div>
        </div>
      )}
    </div>
  );
}
