import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { LoaderCircle } from 'lucide-react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import deployment from './deployment.json';
import {
  CHAINLINK_ETH_USD,
  CHAINLINK_FEED_ABI,
  CONFIDENTIAL_TOKEN_ABI,
  LIMIT_ORDER_ABI,
  NOX_COMPUTE_ABI,
  NOX_SWAP_ABI,
  SAFE_ABI,
  SAFE_MODULE_ABI,
  TEST_TOKEN_ABI,
} from './contracts';
import {
  createInitialBalances,
  createInitialFaucets,
  FAUCET_COOLDOWN_SECONDS,
  OUTPUT_TOKENS,
  RPC_URL,
  SEPOLIA_HEX,
  TOKENS,
} from './config';
import { createHandleClient, retry } from './lib/nox';
import { queryRecentSwapEvents } from './lib/history';
import { DEFAULT_SWAP_PROTECTION_BPS, deriveSwapMinOut } from './lib/min-out';
import { discoverWalletProvider } from './lib/wallet-providers';
import { executeSafeModule, executeSafeTransaction, parseSafeModuleEvent, SAFE_SENTINEL_MODULE } from './lib/safe';
import { querySafeActivity } from './lib/safe-activity';
import {
  decodeReceiptImage,
  formatDuration,
  formatInputAmount,
  formatToken,
  isHandle,
  shorten,
} from './lib/format';
import { getCooldownRemaining, validateMinimumOutput, validateTokenAmount } from './lib/validation';
import AppSidebar from './components/AppSidebar';
import AppModals from './components/AppModals';
import WalletConnectModal from './components/WalletConnectModal';
import LandingFooter from './components/LandingFooter';
import LandingHeader from './components/LandingHeader';
import NoticeBanner from './components/NoticeBanner';
import DocsPage from './pages/DocsPage';
import LandingPage from './pages/LandingPage';
import './App.css';

const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const SafePage = lazy(() => import('./pages/SafePage'));
const TradePage = lazy(() => import('./pages/TradePage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const WALLET_PREFERENCE_KEY = 'noxswap.wallet-provider';
const WALLET_LABELS = { metamask: 'MetaMask', coinbase: 'Coinbase', rabby: 'Rabby', injected: 'Injected wallet' };

function providerLabel(provider, preferredWallet = '') {
  if (preferredWallet && WALLET_LABELS[preferredWallet]) return WALLET_LABELS[preferredWallet];
  if (provider?.isCoinbaseWallet) return 'Coinbase';
  if (provider?.isRabby) return 'Rabby';
  if (provider?.isMetaMask) return 'MetaMask';
  return 'Injected wallet';
}

function readWalletPreference() {
  try { return window.localStorage.getItem(WALLET_PREFERENCE_KEY) ?? ''; } catch { return ''; }
}

function writeWalletPreference(walletId) {
  try { window.localStorage.setItem(WALLET_PREFERENCE_KEY, walletId); } catch { /* Storage can be disabled in privacy mode. */ }
}

function tokenSymbolForAddress(address) {
  const match = Object.values(TOKENS).find((token) => token.wrapper.toLowerCase() === address.toLowerCase());
  return match?.symbol ?? address;
}

export default function App() {
  const location = useLocation();
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null);
  const [tokenIn, setTokenIn] = useState('cUSDC');
  const [tokenOut, setTokenOut] = useState('cETH');
  const [amountIn, setAmountIn] = useState('100');
  const [minOut, setMinOut] = useState('');
  const [minOutAuto, setMinOutAuto] = useState(true);
  const [allowZeroMinOut, setAllowZeroMinOut] = useState(false);
  const [deadlineMinutes, setDeadlineMinutes] = useState('20');
  const [swapProtectionBps, setSwapProtectionBps] = useState(DEFAULT_SWAP_PROTECTION_BPS);
  const [asset, setAsset] = useState('cUSDC');
  const [assetAmount, setAssetAmount] = useState('100');
  const [assetMode, setAssetMode] = useState('wrap');
  const [balances, setBalances] = useState(createInitialBalances);
  const [faucets, setFaucets] = useState(createInitialFaucets);
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
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [privateBalancesVisible, setPrivateBalancesVisible] = useState(false);
  const [clockTick, setClockTick] = useState(() => Math.floor(Date.now() / 1000));
  const [chainTimeOffset, setChainTimeOffset] = useState(0);
  const [gatewayEvidence, setGatewayEvidence] = useState(null);
  const [executionComparison, setExecutionComparison] = useState(null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [walletAvailable, setWalletAvailable] = useState(() => Boolean(window.ethereum));
  const [walletName, setWalletName] = useState('');
  const [safeState, setSafeState] = useState({ address: deployment.safe?.address ?? '', moduleAddress: deployment.safe?.module ?? '', orderBook: deployment.safe?.orderBook ?? '', moduleEnabled: false, owners: [], threshold: 0, isOwner: false });
  const [safeBalances, setSafeBalances] = useState(() => createInitialBalances());
  const [safeOrders, setSafeOrders] = useState([]);
  const [safeActivity, setSafeActivity] = useState([]);
  const [safePendingUnwraps, setSafePendingUnwraps] = useState([]);

  const connected = Boolean(account);
  const correctNetwork = chainId === deployment.chainId;
  const chainNow = clockTick + chainTimeOffset;
  const assetToken = TOKENS[asset];
  const assetAvailable = assetMode === 'wrap'
    ? balances[asset].public
    : privateBalancesVisible ? balances[asset].decrypted : null;
  const swapAvailable = privateBalancesVisible ? balances[tokenIn].decrypted : null;
  const assetValidation = useMemo(
    () => validateTokenAmount(assetAmount, assetToken.decimals, assetAvailable),
    [assetAmount, assetAvailable, assetToken.decimals],
  );
  const swapValidation = useMemo(
    () => validateTokenAmount(amountIn, TOKENS[tokenIn].decimals, swapAvailable),
    [amountIn, swapAvailable, tokenIn],
  );
  const minOutValidation = useMemo(
    () => validateMinimumOutput(minOut, TOKENS[tokenOut].decimals, allowZeroMinOut),
    [allowZeroMinOut, minOut, tokenOut],
  );
  const deadlineError = useMemo(() => {
    if (!/^\d+$/.test(deadlineMinutes)) return 'Deadline must be a whole number of minutes.';
    const value = Number(deadlineMinutes);
    if (value < 1 || value > 1440) return 'Deadline must be between 1 minute and 24 hours.';
    return '';
  }, [deadlineMinutes]);
  const swapError = swapValidation.error || minOutValidation.error || deadlineError;

  const referenceOutputValue = useMemo(() => {
    const amount = Number(amountIn);
    if (!ethPrice || !Number.isFinite(amount) || amount <= 0) return null;
    if (tokenIn === 'cUSDC' && tokenOut === 'cETH') return (amount / ethPrice) * 0.997;
    if (tokenIn === 'cETH' && tokenOut === 'cUSDC') return amount * ethPrice * 0.997;
    return null;
  }, [amountIn, ethPrice, tokenIn, tokenOut]);
  const referenceOutput = referenceOutputValue === null
    ? '--'
    : referenceOutputValue.toLocaleString(undefined, { maximumFractionDigits: tokenOut === 'cETH' ? 6 : 2 });
  const suggestedMinOut = useMemo(() => deriveSwapMinOut({
    amountIn,
    ethPrice,
    outputDecimals: TOKENS[tokenOut].decimals,
    slippageBps: swapProtectionBps,
    tokenIn,
    tokenOut,
  }), [amountIn, ethPrice, swapProtectionBps, tokenIn, tokenOut]);

  useEffect(() => {
    if (!minOutAuto) return;
    setMinOut(suggestedMinOut);
    setAllowZeroMinOut(false);
  }, [minOutAuto, suggestedMinOut]);

  const addLog = (message, transactionHash = '') => {
    setLogs((current) => [{ time: new Date().toLocaleTimeString(), message, transactionHash }, ...current]);
  };

  const fail = (error) => {
    console.error(error);
    setNotice({ type: 'error', text: error.shortMessage ?? error.reason ?? error.message ?? 'Transaction failed.' });
  };

  const getWallet = async (providerOverride = walletProvider) => {
    if (!providerOverride) throw new Error('Connect an injected wallet before using write operations.');
    let browserProvider = new ethers.BrowserProvider(providerOverride);
    let network = await browserProvider.getNetwork();
    if (network.chainId !== BigInt(deployment.chainId)) {
      await providerOverride.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_HEX }] });
      browserProvider = new ethers.BrowserProvider(providerOverride);
      network = await browserProvider.getNetwork();
    }
    const signer = await browserProvider.getSigner();
    return { provider: browserProvider, signer, address: await signer.getAddress() };
  };

  const connect = async (walletId) => {
    try {
      setBusy('connect');
      const selectedProvider = await discoverWalletProvider(walletId);
      setWalletAvailable(true);
      await selectedProvider.request({ method: 'eth_requestAccounts' });
      const wallet = await getWallet(selectedProvider);
      writeWalletPreference(walletId);
      setWalletProvider(selectedProvider);
      setWalletName(providerLabel(selectedProvider, walletId));
      setAccount(wallet.address);
      setChainId(Number((await wallet.provider.getNetwork()).chainId));
      setShowWalletModal(false);
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
    const feed = new ethers.Contract(deployment.feeds?.ethUsd ?? CHAINLINK_ETH_USD, CHAINLINK_FEED_ABI, provider);
    const poolEntries = Object.entries(deployment.pools);
    const [poolData, round, feedDecimals] = await Promise.all([
      Promise.all(poolEntries.map(async ([key, item]) => {
        const handles = await router.getPoolHandles(item.token0, item.token1);
        return [key, { token0: handles.token0, token1: handles.token1, reserve0: handles.reserve0, reserve1: handles.reserve1 }];
      })),
      feed.latestRoundData(),
      feed.decimals(),
    ]);
    setPool(Object.fromEntries(poolData));
    setEthPrice(Number(ethers.formatUnits(round.answer, feedDecimals)));
    setPriceUpdatedAt(Number(round.updatedAt));
  };

  const loadAccount = useCallback(async (address = account) => {
    if (!address || !walletProvider) return;
    const provider = new ethers.BrowserProvider(walletProvider);
    const next = {};
    const nextFaucets = {};
    await Promise.all(Object.values(TOKENS).map(async (token) => {
      const underlying = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, provider);
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, provider);
      const [publicBalance, handle, faucetAmount, lastClaimAt] = await Promise.all([
        underlying.balanceOf(address),
        wrapper.confidentialBalanceOf(address),
        underlying.faucetAmount(),
        underlying.lastClaimAt(address),
      ]);
      next[token.symbol] = { public: publicBalance, handle, decrypted: null };
      nextFaucets[token.symbol] = {
        amount: faucetAmount,
        nextClaimAt: lastClaimAt === 0n ? 0 : Number(lastClaimAt) + FAUCET_COOLDOWN_SECONDS,
      };
    }));
    const [activeAccounts, nativeBalance, latestBlock] = await Promise.all([
      provider.send('eth_accounts', []),
      provider.getBalance(address),
      provider.getBlock('latest'),
    ]);
    if (activeAccounts[0]?.toLowerCase() !== address.toLowerCase()) return;

    setBalances((current) => Object.fromEntries(Object.values(TOKENS).map((token) => {
      const loaded = next[token.symbol];
      const decrypted = current[token.symbol].handle === loaded.handle
        ? current[token.symbol].decrypted
        : null;
      return [token.symbol, { ...loaded, decrypted }];
    })));
    setFaucets(nextFaucets);
    setEthBalance(nativeBalance);
    if (latestBlock) setChainTimeOffset(Number(latestBlock.timestamp) - Math.floor(Date.now() / 1000));

    const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, provider);
    try {
      const deploymentReceipt = await provider.getTransactionReceipt(deployment.deploymentTransactions.noxSwapRouter);
      const events = await queryRecentSwapEvents(router, address, deploymentReceipt.blockNumber, latestBlock.number);
      setHistory(events.slice(-12).reverse().map((event) => ({
        hash: event.transactionHash,
        block: event.blockNumber,
        tokenIn: event.args.tokenIn,
        tokenOut: event.args.tokenOut,
        inputHandle: event.args.encryptedInput,
        outputHandle: event.args.encryptedOutput,
        refundHandle: event.args.encryptedRefund,
        receiptId: event.args.receiptId.toString(),
      })));
    } catch (error) {
      console.warn('Swap history is temporarily unavailable.', error);
      setHistory([]);
    }

    return next;

  }, [account, walletProvider]);

  const loadSafeAccount = useCallback(async () => {
    const configuredSafe = deployment.safe;
    if (!configuredSafe?.address || !configuredSafe.module || !walletProvider) return null;
    const provider = new ethers.BrowserProvider(walletProvider);
    const safeContract = new ethers.Contract(configuredSafe.address, SAFE_ABI, provider);
    const [owners, threshold, moduleEnabled, ownerAddress] = await Promise.all([
      safeContract.getOwners(),
      safeContract.getThreshold(),
      safeContract.isModuleEnabled(configuredSafe.module),
      provider.getSigner().then((signer) => signer.getAddress()),
    ]);
    const nextBalances = createInitialBalances();
    await Promise.all(Object.values(TOKENS).map(async (token) => {
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, provider);
      nextBalances[token.symbol] = {
        ...nextBalances[token.symbol],
        handle: await wrapper.confidentialBalanceOf(configuredSafe.address),
      };
    }));
    const safeOrderBookAddress = configuredSafe.orderBook ?? deployment.contracts.limitOrderBook;
    const orderBook = new ethers.Contract(safeOrderBookAddress, LIMIT_ORDER_ABI, provider);
    const nextOrderId = await orderBook.nextOrderId();
    const orders = [];
    for (let id = 1n; id < nextOrderId && id - 1n < 500n; id++) {
      try {
        const order = await orderBook.getOrder(id);
        if (order.owner.toLowerCase() !== configuredSafe.address.toLowerCase()) continue;
        orders.push({
          id: id.toString(),
          owner: order.owner,
          tokenIn: tokenSymbolForAddress(order.tokenIn),
          tokenOut: tokenSymbolForAddress(order.tokenOut),
          amountHandle: order.encryptedAmountIn,
          minOutHandle: order.encryptedMinOut,
          triggerPrice: order.triggerPrice,
          expiry: Number(order.expiry),
          status: Number(order.status),
        });
      } catch (error) {
        console.warn(`Safe order ${id} could not be read.`, error);
      }
    }
    const nextState = {
      address: configuredSafe.address,
      moduleAddress: configuredSafe.module,
      orderBook: safeOrderBookAddress,
      moduleEnabled,
      owners: [...owners],
      threshold: Number(threshold),
      isOwner: owners.some((owner) => owner.toLowerCase() === ownerAddress.toLowerCase()),
    };
    setSafeState(nextState);
    setSafeBalances(nextBalances);
    setSafeOrders(orders.sort((left, right) => Number(right.id) - Number(left.id)));
    try {
      const moduleDeploymentHash = deployment.deploymentTransactions?.noxSafeModuleV3
        ?? deployment.deploymentTransactions?.noxSafeModuleV2
        ?? deployment.deploymentTransactions?.noxSafeModule
        ?? deployment.deploymentTransactions?.safe;
      const [moduleDeploymentReceipt, latestBlock] = await Promise.all([
        moduleDeploymentHash ? provider.getTransactionReceipt(moduleDeploymentHash) : null,
        provider.getBlockNumber(),
      ]);
      const activity = await querySafeActivity({
        provider,
        safeAddress: configuredSafe.address,
        moduleAddress: configuredSafe.module,
        tokens: TOKENS,
        deploymentBlock: moduleDeploymentReceipt?.blockNumber ?? Math.max(0, latestBlock - 1200),
        latestBlock,
      });
      setSafeActivity(activity);
      const pendingUnwraps = [];
      await Promise.all(activity.filter((item) => item.type === 'unwrap-request').map(async (item) => {
        const token = TOKENS[item.tokenSymbol];
        if (!token) return;
        const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, provider);
        const recipient = await wrapper.unwrapRequester(item.requestId);
        if (recipient === ethers.ZeroAddress) return;
        pendingUnwraps.push({
          id: item.requestId,
          recipient,
          requestedAt: item.timestamp,
          tokenSymbol: item.tokenSymbol,
          transactionHash: item.hash,
        });
      }));
      setSafePendingUnwraps(pendingUnwraps.sort((left, right) => right.requestedAt - left.requestedAt));
    } catch (error) {
      console.warn('Safe activity is temporarily unavailable.', error);
      setSafeActivity([]);
      setSafePendingUnwraps([]);
    }
    return nextBalances;
  }, [walletProvider]);

  const refresh = async () => {
    try {
      setBusy('refresh');
      await Promise.all([loadMarket(), loadAccount(), loadSafeAccount()]);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const routeTitles = {
      '/': 'NoxSwap | Confidential DeFi',
      '/app/trade': 'Trade | NoxSwap',
      '/app/wallet': 'Wallet | NoxSwap',
      '/app/activity': 'Activity | NoxSwap',
      '/app/safe': 'Safe Treasury | NoxSwap',
    };
    document.title = routeTitles[location.pathname] ?? 'NoxSwap | Confidential DeFi';
  }, [location.pathname]);

  useEffect(() => {
    loadMarket().catch(fail);
    if (walletProvider) return undefined;
    let active = true;
    const restoreWallet = async () => {
      const preferredWallet = readWalletPreference();
      const provider = preferredWallet
        ? await discoverWalletProvider(preferredWallet).catch(() => null)
        : window.ethereum;
      if (!active || !provider) return;
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (active && accounts.length > 0) {
          setWalletAvailable(true);
          setWalletProvider(provider);
          setWalletName(providerLabel(provider, preferredWallet));
        }
      } catch {
        // A locked wallet remains available through the explicit connect flow.
      }
    };
    restoreWallet();
    return () => { active = false; };
  }, [walletProvider]);

  useEffect(() => {
    const onProvider = (event) => {
      if (event?.detail?.provider) setWalletAvailable(true);
    };
    window.addEventListener('eip6963:announceProvider', onProvider);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    const timer = window.setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onProvider);
    }, 400);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('eip6963:announceProvider', onProvider);
    };
  }, []);

  useEffect(() => {
    if (!walletProvider) return undefined;
    const sync = async () => {
      const accounts = await walletProvider.request({ method: 'eth_accounts' });
      const chain = await walletProvider.request({ method: 'eth_chainId' });
      setAccount(accounts[0] ?? '');
      setChainId(Number(BigInt(chain)));
    };
    const onAccounts = (accounts) => {
      setPrivateBalancesVisible(false);
      setBalances(createInitialBalances());
      setFaucets(createInitialFaucets());
      setEthBalance(0n);
      setHistory([]);
      setAclResult(null);
      setLastProof(null);
      setReceipt(null);
      setGatewayEvidence(null);
      setExecutionComparison(null);
      setSafeState({ address: deployment.safe?.address ?? '', moduleAddress: deployment.safe?.module ?? '', orderBook: deployment.safe?.orderBook ?? '', moduleEnabled: false, owners: [], threshold: 0, isOwner: false });
      setSafeBalances(createInitialBalances());
      setSafeOrders([]);
      setAccount(accounts[0] ?? '');
    };
    const onChain = (chain) => {
      const nextChainId = Number(BigInt(chain));
      setChainId(nextChainId);
      setPrivateBalancesVisible(false);
      if (nextChainId !== deployment.chainId) {
        setBalances(createInitialBalances());
        setFaucets(createInitialFaucets());
        setEthBalance(0n);
        setHistory([]);
        setSafeState({ address: deployment.safe?.address ?? '', moduleAddress: deployment.safe?.module ?? '', orderBook: deployment.safe?.orderBook ?? '', moduleEnabled: false, owners: [], threshold: 0, isOwner: false });
        setSafeBalances(createInitialBalances());
        setSafeOrders([]);
        setSafeActivity([]);
        setSafePendingUnwraps([]);
      }
    };
    sync().catch(fail);
    walletProvider.on?.('accountsChanged', onAccounts);
    walletProvider.on?.('chainChanged', onChain);
    return () => {
      walletProvider.removeListener?.('accountsChanged', onAccounts);
      walletProvider.removeListener?.('chainChanged', onChain);
    };
  }, [walletProvider]);

  useEffect(() => {
    if (account && correctNetwork) Promise.all([loadAccount(account), loadSafeAccount()]).catch(fail);
  }, [account, correctNetwork, loadAccount, loadSafeAccount]);

  const faucet = async (symbol) => {
    try {
      setBusy(`faucet-${symbol}`);
      const wallet = await getWallet();
      const token = TOKENS[symbol];
      const contract = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, wallet.signer);
      const [lastClaimAt, latestBlock] = await Promise.all([
        contract.lastClaimAt(wallet.address),
        wallet.provider.getBlock('latest'),
      ]);
      const nextClaimAt = lastClaimAt === 0n ? 0 : Number(lastClaimAt) + FAUCET_COOLDOWN_SECONDS;
      const remaining = getCooldownRemaining(nextClaimAt, latestBlock.timestamp);
      setFaucets((current) => ({
        ...current,
        [symbol]: { ...current[symbol], nextClaimAt },
      }));
      if (remaining > 0) {
        setNotice({
          type: 'info',
          text: `${token.publicSymbol} faucet is cooling down. Try again in ${formatDuration(remaining)}.`,
        });
        return;
      }
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
    const restorePrivateBalances = privateBalancesVisible;
    try {
      const token = TOKENS[asset];
      if (assetValidation.error) throw new Error(assetValidation.error);
      const amount = assetValidation.amount;
      setBusy(assetMode);
      const wallet = await getWallet();
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const underlying = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, wallet.signer);

      if (assetMode === 'wrap') {
        const liveBalance = await underlying.balanceOf(wallet.address);
        if (amount > liveBalance) throw new Error('Amount exceeds your current public balance. Refresh and try again.');
        const approval = await underlying.approve(token.wrapper, amount);
        addLog(`Approve ${token.publicSymbol}`, approval.hash);
        await approval.wait();
        const transaction = await wrapper.wrap(wallet.address, amount);
        addLog(`Wrap ${assetAmount} ${token.publicSymbol}`, transaction.hash);
        await transaction.wait();
      } else {
        const liveHandle = await wrapper.confidentialBalanceOf(wallet.address);
        if (liveHandle !== balances[asset].handle) {
          throw new Error('Your private balance changed. Reveal the latest balance and try again.');
        }
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
      const refreshedBalances = await loadAccount(wallet.address);
      if (restorePrivateBalances) {
        try {
          await decryptBalanceSnapshot(wallet, refreshedBalances);
        } catch (decryptError) {
          setNotice({ type: 'info', text: `${assetMode === 'wrap' ? 'Wrap' : 'Unwrap'} confirmed, but refreshed private balances need a manual reveal: ${decryptError.shortMessage ?? decryptError.message}` });
        }
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const decryptBalanceSnapshot = async (wallet, snapshot) => {
      const client = await createHandleClient(wallet.signer);
      const next = { ...snapshot };
      for (const token of Object.values(TOKENS)) {
        const current = snapshot[token.symbol];
        if (isHandle(current.handle)) {
          const result = await retry(() => client.decrypt(current.handle), 5, 3000);
          next[token.symbol] = { ...current, decrypted: result.value };
        } else {
          next[token.symbol] = { ...current, decrypted: 0n };
        }
      }
      setBalances(next);
      setPrivateBalancesVisible(true);
      setGatewayEvidence({
        verifiedAt: Date.now(),
        handles: Object.values(next).filter((balance) => isHandle(balance.handle)).length,
      });
      return next;
  };

  const decryptBalances = async () => {
    try {
      setBusy('decrypt');
      const wallet = await getWallet();
      const snapshot = await loadAccount(wallet.address);
      await decryptBalanceSnapshot(wallet, snapshot);
      setNotice({ type: 'success', text: 'Authorized balances decrypted with an EIP-712 signature.' });
      addLog('Nox Gateway returned authorized balance plaintexts');
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const togglePrivateBalances = async () => {
    if (privateBalancesVisible) {
      setPrivateBalancesVisible(false);
      return;
    }
    await decryptBalances();
  };

  const swap = async () => {
    const restorePrivateBalances = privateBalancesVisible;
    try {
      const input = TOKENS[tokenIn];
      const output = TOKENS[tokenOut];
      if (swapError) throw new Error(swapError);
      const amount = swapValidation.amount;
      const minimumOutput = minOutValidation.amount;
      const deadline = chainNow + Number(deadlineMinutes) * 60;
      setBusy('swap');
      setNotice({ type: 'info', text: 'Encrypting amount and minimum output with Nox Gateway...' });
      const wallet = await getWallet();
      const inputContract = new ethers.Contract(input.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const router = new ethers.Contract(deployment.contracts.noxSwapRouter, NOX_SWAP_ABI, wallet.signer);
      const liveHandle = await inputContract.confidentialBalanceOf(wallet.address);
      if (liveHandle !== balances[tokenIn].handle) {
        throw new Error('Your private balance changed. Reveal the latest balance and try again.');
      }
      if (!(await inputContract.isOperator(wallet.address, deployment.contracts.noxSwapRouter))) {
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
        const operatorTx = await inputContract.setOperator(deployment.contracts.noxSwapRouter, expiry);
        addLog(`Authorize router for ${input.symbol}`, operatorTx.hash);
        await operatorTx.wait();
      }

      const client = await createHandleClient(wallet.signer);
      const [encrypted, encryptedMinimum] = await Promise.all([
        client.encryptInput(amount, 'uint256', deployment.contracts.noxSwapRouter),
        client.encryptInput(minimumOutput, 'uint256', deployment.contracts.noxSwapRouter),
      ]);
      addLog(`Nox protected inputs created: ${shorten(encrypted.handle, 10, 8)}`);
      const transaction = await router.confidentialSwap(
        input.wrapper,
        output.wrapper,
        encrypted.handle,
        encrypted.handleProof,
        encryptedMinimum.handle,
        encryptedMinimum.handleProof,
        deadline,
      );
      addLog('Confidential swap submitted', transaction.hash);
      const mined = await transaction.wait();
      const event = mined.logs
        .map((log) => { try { return router.interface.parseLog(log); } catch { return null; } })
        .find((item) => item?.name === 'SwapExecuted');
      if (!event) throw new Error('SwapExecuted event was not found.');

      setNotice({ type: 'info', text: 'Swap settled. Decrypting authorized output and refund handles...' });
      const [decrypted, refund] = await Promise.all([
        retry(() => client.decrypt(event.args.encryptedOutput)),
        retry(() => client.decrypt(event.args.encryptedRefund)),
      ]);
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
        minOutHandle: encryptedMinimum.handle,
        minOutProofBytes: (encryptedMinimum.handleProof.length - 2) / 2,
        outputHandle: event.args.encryptedOutput,
        refundHandle: event.args.encryptedRefund,
        deadline,
        calldata: transaction.data,
        blockNumber: mined.blockNumber,
      });
      setGatewayEvidence({ verifiedAt: Date.now(), handles: 2 });
      if (referenceOutputValue && decrypted.value > 0n) {
        const actual = Number(ethers.formatUnits(decrypted.value, output.decimals));
        setExecutionComparison({
          actual: actual.toLocaleString(undefined, { maximumFractionDigits: output.decimals === 18 ? 6 : 4 }),
          reference: referenceOutput,
          deviationBps: ((actual / referenceOutputValue) - 1) * 10000,
          symbol: output.symbol,
        });
      } else {
        setExecutionComparison(null);
      }
      const outputText = `${formatToken(decrypted.value, output.decimals)} ${output.symbol}`;
      const refundText = `${formatToken(refund.value, input.decimals)} ${input.symbol}`;
      if (decrypted.value === 0n && refund.value > 0n) {
        setNotice({ type: 'info', text: `Protected swap rejected by encrypted minOut. Refunded ${refundText}; receipt #${receiptData.id} records the attempt.` });
      } else {
        setNotice({ type: 'success', text: `Swap confirmed. Received ${outputText}; refund ${refundText}; receipt #${receiptData.id} minted.` });
      }
      addLog(`Settled output ${outputText}; refund ${refundText}`, transaction.hash);
      setPrivateBalancesVisible(false);
      const [refreshedBalances] = await Promise.all([loadAccount(wallet.address), loadMarket()]);
      if (restorePrivateBalances) {
        try {
          await decryptBalanceSnapshot(wallet, refreshedBalances);
          setNotice((current) => current ? { ...current, text: `${current.text} Private balances refreshed.` } : current);
        } catch (decryptError) {
          setNotice((current) => ({
            type: 'info',
            text: `${current?.text ?? 'Swap confirmed.'} Refreshed balances need a manual reveal: ${decryptError.shortMessage ?? decryptError.message}`,
          }));
        }
      }
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const ensureSafeOperator = async (wallet, tokenSymbol, operator, busyKey) => {
    const token = TOKENS[tokenSymbol];
    const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
    if (await wrapper.isOperator(safeState.address, operator)) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
    const execution = await executeSafeModule({
      signer: wallet.signer,
      safeAddress: safeState.address,
      moduleAddress: safeState.moduleAddress,
      method: 'setTokenOperator',
      args: [token.wrapper, operator, expiry],
    });
    addLog(`Authorize ${operator === deployment.contracts.noxSwapRouter ? 'router' : 'order book'} for Safe ${token.symbol}`, execution.transaction.hash);
    await execution.transaction.wait();
    setBusy(busyKey);
  };

  const safeFund = async ({ token: tokenSymbol, amount }) => {
    try {
      if (!safeState.address || !safeState.isOwner) throw new Error('The connected wallet must be a Safe owner to fund this treasury.');
      setBusy('safe-fund');
      const wallet = await getWallet();
      const token = TOKENS[tokenSymbol];
      const value = ethers.parseUnits(amount, token.decimals);
      const underlying = new ethers.Contract(token.underlying, TEST_TOKEN_ABI, wallet.signer);
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const liveBalance = await underlying.balanceOf(wallet.address);
      if (value > liveBalance) throw new Error(`Amount exceeds your public ${token.publicSymbol} balance.`);
      const allowance = await underlying.allowance(wallet.address, token.wrapper);
      if (allowance < value) {
        const approval = await underlying.approve(token.wrapper, ethers.MaxUint256);
        addLog(`Approve reusable ${token.publicSymbol} funding`, approval.hash);
        await approval.wait();
      }
      const transaction = await wrapper.wrap(safeState.address, value);
      addLog(`Wrap ${amount} ${token.publicSymbol} to Safe`, transaction.hash);
      await transaction.wait();
      setNotice({ type: 'success', text: `${amount} ${token.publicSymbol} wrapped into the Safe treasury.` });
      await loadSafeAccount();
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const decryptSafeSnapshot = async (wallet, snapshot, tokenSymbols = Object.keys(TOKENS)) => {
    const client = await createHandleClient(wallet.signer);
    const next = { ...snapshot };
    const tokens = tokenSymbols.map((symbol) => TOKENS[symbol]).filter(Boolean);
    const initialized = tokens.filter((token) => isHandle(snapshot[token.symbol]?.handle));
    const compute = new ethers.Contract(deployment.contracts.noxCompute, NOX_COMPUTE_ABI, wallet.provider);
    const permissions = await Promise.all(
      initialized.map((token) => compute.isViewer(snapshot[token.symbol].handle, wallet.address)),
    );
    const missingHandles = initialized
      .filter((_, index) => !permissions[index])
      .map((token) => snapshot[token.symbol].handle);
    if (missingHandles.length > 0) {
      const grant = await executeSafeModule({
        signer: wallet.signer,
        safeAddress: safeState.address,
        moduleAddress: safeState.moduleAddress,
        method: 'addViewers',
        args: [missingHandles, wallet.address],
      });
      addLog(`Grant Safe owner access to ${missingHandles.length} balance handle${missingHandles.length === 1 ? '' : 's'}`, grant.transaction.hash);
      await grant.transaction.wait();
    }
    for (const token of tokens) {
      const handle = snapshot[token.symbol].handle;
      if (!isHandle(handle)) {
        next[token.symbol] = { ...snapshot[token.symbol], decrypted: 0n };
        continue;
      }
      const decrypted = await retry(() => client.decrypt(handle), 12, 4000);
      next[token.symbol] = { ...snapshot[token.symbol], decrypted: decrypted.value };
    }
    setSafeBalances(next);
    return next;
  };

  const safeReveal = async () => {
    try {
      setBusy('safe-reveal');
      const wallet = await getWallet();
      const snapshot = await loadSafeAccount();
      if (!snapshot) throw new Error('Safe treasury is not configured on this network.');
      await decryptSafeSnapshot(wallet, snapshot);
      setNotice({ type: 'success', text: 'Safe balances revealed through Safe-controlled Nox viewer grants.' });
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const finalizeSafeUnwrapRequest = async ({ wallet, tokenSymbol, requestId }) => {
    const token = TOKENS[tokenSymbol];
    if (!token || !isHandle(requestId)) throw new Error('The pending Safe unwrap request is invalid.');
    const client = await createHandleClient(wallet.signer);
    const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
    setNotice({ type: 'info', text: `Waiting for the public ${token.symbol} unwrap proof from Nox Gateway...` });
    const publicResult = await retry(() => client.publicDecrypt(requestId), 12, 4000);
    const finalize = await wrapper.finalizeUnwrap(requestId, publicResult.decryptionProof);
    addLog(`Finalize Safe unwrap: ${formatToken(publicResult.value, token.decimals)} ${token.publicSymbol}`, finalize.hash);
    await finalize.wait();
    return publicResult.value;
  };

  const safeUnwrap = async ({ token: tokenSymbol, amount, recipient }) => {
    let confirmedRequestId = '';
    const restoreSafeBalances = Object.values(safeBalances).every((balance) => balance.decrypted !== null && balance.decrypted !== undefined);
    try {
      if (!safeState.moduleEnabled || !safeState.isOwner) throw new Error('The connected wallet must be an owner of an enabled Safe module.');
      if (!ethers.isAddress(recipient)) throw new Error('Choose a valid Safe unwrap recipient.');
      const approvedRecipient = recipient.toLowerCase() === safeState.address.toLowerCase()
        || safeState.owners.some((owner) => owner.toLowerCase() === recipient.toLowerCase());
      if (!approvedRecipient) throw new Error('Safe unwrap recipient must be the Safe itself or one of its owners.');
      setBusy('safe-unwrap');
      const wallet = await getWallet();
      const token = TOKENS[tokenSymbol];
      const amountValue = ethers.parseUnits(amount, token.decimals);
      if (amountValue <= 0n) throw new Error('Enter a positive Safe unwrap amount.');
      const revealedBalance = safeBalances[tokenSymbol]?.decrypted;
      if (typeof revealedBalance !== 'bigint' || amountValue > revealedBalance) {
        throw new Error(`Reveal the Safe balance and enter an amount within the available ${tokenSymbol} balance.`);
      }
      const wrapper = new ethers.Contract(token.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const liveHandle = await wrapper.confidentialBalanceOf(safeState.address);
      if (liveHandle !== safeBalances[tokenSymbol].handle) {
        throw new Error('The Safe balance changed. Refresh, reveal the latest balance, and try again.');
      }
      const client = await createHandleClient(wallet.signer);
      const encrypted = await client.encryptInput(amountValue, 'uint256', safeState.moduleAddress);
      const module = new ethers.Contract(safeState.moduleAddress, SAFE_MODULE_ABI, wallet.signer);
      const preparation = await module.prepareInput(encrypted.handle, encrypted.handleProof, token.wrapper);
      addLog(`Prepare Safe ${tokenSymbol} unwrap input`, preparation.hash);
      await preparation.wait();
      const execution = await executeSafeModule({
        signer: wallet.signer,
        safeAddress: safeState.address,
        moduleAddress: safeState.moduleAddress,
        method: 'requestUnwrap',
        args: [token.wrapper, encrypted.handle, recipient],
      });
      addLog(`Request Safe unwrap: ${amount} ${tokenSymbol}`, execution.transaction.hash);
      const receipt = await execution.transaction.wait();
      const event = parseSafeModuleEvent(receipt, module, 'SafeUnwrapRequested');
      if (!event) throw new Error('SafeUnwrapRequested event was not found.');
      confirmedRequestId = event.args.unwrapRequestId;
      const released = await finalizeSafeUnwrapRequest({ wallet, tokenSymbol, requestId: confirmedRequestId });
      setNotice({ type: 'success', text: `Safe unwrap completed. Released ${formatToken(released, token.decimals)} ${token.publicSymbol} to ${shorten(recipient)}.` });
      const [snapshot] = await Promise.all([loadSafeAccount(), loadAccount(wallet.address)]);
      if (restoreSafeBalances) {
        try {
          await decryptSafeSnapshot(wallet, snapshot, [tokenSymbol]);
        } catch (revealError) {
          setNotice({ type: 'info', text: `Safe unwrap completed. Refreshed balances need a manual reveal: ${revealError.shortMessage ?? revealError.message}` });
        }
      }
    } catch (error) {
      if (confirmedRequestId) {
        console.error(error);
        setNotice({ type: 'info', text: `Safe unwrap request ${shorten(confirmedRequestId, 12, 10)} is confirmed, but proof finalization needs a retry: ${error.shortMessage ?? error.message}` });
        await loadSafeAccount().catch(console.error);
      } else {
        fail(error);
      }
    } finally {
      setBusy('');
    }
  };

  const safeFinalizeUnwrap = async ({ tokenSymbol, requestId }) => {
    try {
      setBusy(`safe-finalize-${requestId}`);
      const wallet = await getWallet();
      const released = await finalizeSafeUnwrapRequest({ wallet, tokenSymbol, requestId });
      const token = TOKENS[tokenSymbol];
      setNotice({ type: 'success', text: `Pending Safe unwrap finalized. Released ${formatToken(released, token.decimals)} ${token.publicSymbol}.` });
      await Promise.all([loadSafeAccount(), loadAccount(wallet.address)]);
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeSwap = async ({ tokenIn: tokenInSymbol, tokenOut: tokenOutSymbol, amount, minOut: minimum, deadlineMinutes: requestedDeadline }) => {
    let confirmedTransactionHash = '';
    try {
      if (!safeState.moduleEnabled || !safeState.isOwner) throw new Error('The connected wallet must be an owner of an enabled Safe module.');
      setBusy('safe-swap');
      const wallet = await getWallet();
      const input = TOKENS[tokenInSymbol];
      const output = TOKENS[tokenOutSymbol];
      const amountValue = ethers.parseUnits(amount, input.decimals);
      const minimumValue = ethers.parseUnits(minimum, output.decimals);
      if (!/^\d+$/.test(requestedDeadline ?? '')) throw new Error('Safe swap deadline must be a whole number of minutes.');
      const deadlineMinutesValue = Number(requestedDeadline);
      if (deadlineMinutesValue < 1 || deadlineMinutesValue > 1440) throw new Error('Safe swap deadline must be between 1 minute and 24 hours.');
      const deadline = chainNow + deadlineMinutesValue * 60;
      const client = await createHandleClient(wallet.signer);
      const [encrypted, encryptedMinimum] = await Promise.all([
        client.encryptInput(amountValue, 'uint256', safeState.moduleAddress),
        client.encryptInput(minimumValue, 'uint256', safeState.moduleAddress),
      ]);
      const module = new ethers.Contract(safeState.moduleAddress, SAFE_MODULE_ABI, wallet.signer);
      const preparation = await module.prepareInputs(
        [encrypted.handle, encryptedMinimum.handle],
        [encrypted.handleProof, encryptedMinimum.handleProof],
        deployment.contracts.noxSwapRouter,
      );
      addLog('Prepare Safe swap ciphertext ACL', preparation.hash);
      await preparation.wait();
      const execution = await executeSafeModule({
        signer: wallet.signer,
        safeAddress: safeState.address,
        moduleAddress: safeState.moduleAddress,
        method: 'confidentialSwap',
        args: [input.wrapper, output.wrapper, encrypted.handle, encryptedMinimum.handle, wallet.address, deadline],
      });
      addLog('Safe confidential swap submitted', execution.transaction.hash);
      const mined = await execution.transaction.wait();
      confirmedTransactionHash = execution.transaction.hash;
      const event = parseSafeModuleEvent(mined, module, 'SafeSwapExecuted');
      if (!event) throw new Error('SafeSwapExecuted event was not found.');
      const [decrypted, refund] = await Promise.all([
        retry(() => client.decrypt(event.args.encryptedOutput), 12, 4000),
        retry(() => client.decrypt(event.args.encryptedRefund), 12, 4000),
      ]);
      const received = formatToken(decrypted.value, output.decimals);
      const returned = formatToken(refund.value, input.decimals);
      setNotice({ type: 'success', text: `Safe swap confirmed. Received ${received} ${output.symbol}; refund ${returned} ${input.symbol}.` });
      const [snapshot] = await Promise.all([loadSafeAccount(), loadAccount(wallet.address)]);
      try {
        await decryptSafeSnapshot(wallet, snapshot, [tokenInSymbol, tokenOutSymbol]);
      } catch (revealError) {
        setNotice({ type: 'info', text: `Safe swap confirmed. Received ${received} ${output.symbol}; refund ${returned} ${input.symbol}. Refreshed balances need a manual reveal: ${revealError.shortMessage ?? revealError.message}` });
      }
    } catch (error) {
      if (confirmedTransactionHash) {
        console.error(error);
        setNotice({ type: 'info', text: `Safe swap ${shorten(confirmedTransactionHash, 12, 10)} was confirmed, but post-settlement reveal needs a manual retry: ${error.shortMessage ?? error.message}` });
        await loadSafeAccount().catch(console.error);
      } else {
        fail(error);
      }
    } finally {
      setBusy('');
    }
  };

  const safeCreateOrder = async ({ tokenIn: tokenInSymbol, tokenOut: tokenOutSymbol, amount, minOut: minimum, triggerPrice, expiryHours }) => {
    try {
      if (!safeState.moduleEnabled || !safeState.isOwner) throw new Error('The connected wallet must be an owner of an enabled Safe module.');
      setBusy('safe-order');
      const wallet = await getWallet();
      const input = TOKENS[tokenInSymbol];
      const output = TOKENS[tokenOutSymbol];
      const amountValue = ethers.parseUnits(amount, input.decimals);
      const minimumValue = ethers.parseUnits(minimum, output.decimals);
      const trigger = ethers.parseUnits(triggerPrice, 8);
      const expiry = chainNow + Math.max(1, Number(expiryHours)) * 60 * 60;
      if (!safeState.orderBook) throw new Error('Safe limit-order book is not configured.');
      const client = await createHandleClient(wallet.signer);
      const [encrypted, encryptedMinimum] = await Promise.all([
        client.encryptInput(amountValue, 'uint256', safeState.moduleAddress),
        client.encryptInput(minimumValue, 'uint256', safeState.moduleAddress),
      ]);
      const module = new ethers.Contract(safeState.moduleAddress, SAFE_MODULE_ABI, wallet.signer);
      const preparation = await module.prepareInputs(
        [encrypted.handle, encryptedMinimum.handle],
        [encrypted.handleProof, encryptedMinimum.handleProof],
        safeState.orderBook,
      );
      addLog('Prepare Safe order ciphertext ACL', preparation.hash);
      await preparation.wait();
      const execution = await executeSafeModule({
        signer: wallet.signer,
        safeAddress: safeState.address,
        moduleAddress: safeState.moduleAddress,
        method: 'createLimitOrder',
        args: [input.wrapper, output.wrapper, encrypted.handle, encryptedMinimum.handle, wallet.address, trigger, expiry],
      });
      addLog('Safe confidential limit order submitted', execution.transaction.hash);
      await execution.transaction.wait();
      setNotice({ type: 'success', text: 'Safe limit order created. Amount and minOut remain encrypted.' });
      await loadSafeAccount();
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeCancelOrder = async (orderId) => {
    try {
      setBusy(`safe-cancel-${orderId}`);
      const wallet = await getWallet();
      const execution = await executeSafeModule({ signer: wallet.signer, safeAddress: safeState.address, moduleAddress: safeState.moduleAddress, method: 'cancelLimitOrder', args: [orderId] });
      addLog(`Cancel Safe order #${orderId}`, execution.transaction.hash);
      await execution.transaction.wait();
      setNotice({ type: 'success', text: `Safe order #${orderId} cancelled and refunded.` });
      await loadSafeAccount();
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeGrantViewer = async ({ handle, viewer }) => {
    try {
      if (!isHandle(handle) || !ethers.isAddress(viewer)) throw new Error('Choose an initialized handle and enter a valid viewer address.');
      setBusy('safe-viewer');
      const wallet = await getWallet();
      const execution = await executeSafeModule({ signer: wallet.signer, safeAddress: safeState.address, moduleAddress: safeState.moduleAddress, method: 'addViewer', args: [handle, viewer] });
      addLog(`Grant Safe viewer ${shorten(viewer)}`, execution.transaction.hash);
      await execution.transaction.wait();
      setNotice({ type: 'success', text: `Viewer ${shorten(viewer)} granted access to the selected Safe handle.` });
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeSetOperator = async (tokenSymbol) => {
    try {
      setBusy(`safe-operator-${tokenSymbol}`);
      const wallet = await getWallet();
      await ensureSafeOperator(wallet, tokenSymbol, deployment.contracts.noxSwapRouter, `safe-operator-${tokenSymbol}`);
      setNotice({ type: 'success', text: `${tokenSymbol} router authorization is active for the Safe.` });
      await loadSafeAccount();
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeEnable = async () => {
    try {
      if (!safeState.address || !safeState.moduleAddress) throw new Error('The Safe module is not configured on this network.');
      if (!safeState.isOwner) throw new Error('The connected wallet must be a Safe owner to enable this module.');
      setBusy('safe-enable');
      const wallet = await getWallet();
      const safe = new ethers.Contract(safeState.address, SAFE_ABI, wallet.signer);
      if (await safe.isModuleEnabled(safeState.moduleAddress)) {
        await loadSafeAccount();
        setNotice({ type: 'info', text: 'Nox Safe module is already enabled.' });
        return;
      }
      const data = safe.interface.encodeFunctionData('enableModule', [safeState.moduleAddress]);
      const execution = await executeSafeTransaction({ signer: wallet.signer, safeAddress: safeState.address, to: safeState.address, data });
      addLog('Enable Nox Safe module', execution.transaction.hash);
      await execution.transaction.wait();
      setNotice({ type: 'success', text: 'Nox Safe module enabled. Safe Treasury operations are available again.' });
      await loadSafeAccount();
    } catch (error) {
      fail(error);
    } finally {
      setBusy('');
    }
  };

  const safeRevoke = async (previousModule = SAFE_SENTINEL_MODULE) => {
    try {
      setBusy('safe-revoke');
      const wallet = await getWallet();
      const execution = await executeSafeModule({ signer: wallet.signer, safeAddress: safeState.address, moduleAddress: safeState.moduleAddress, method: 'revoke', args: [previousModule] });
      addLog('Revoke Nox Safe module', execution.transaction.hash);
      await execution.transaction.wait();
      setNotice({ type: 'success', text: 'Nox Safe module revoked. The Safe remains intact and can be reconfigured by its owners.' });
      await loadSafeAccount();
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
      if (results.length === 0) throw new Error('No initialized confidential balance is available to share.');
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
      const provider = new ethers.JsonRpcProvider(RPC_URL, deployment.chainId, { staticNetwork: true });
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

  const handleAccountAction = async () => {
    if (!account) {
      setShowWalletModal(true);
      return;
    }
    try {
      await navigator.clipboard.writeText(account);
      setNotice({ type: 'success', text: 'Wallet address copied.' });
    } catch {
      setNotice({ type: 'info', text: account });
    }
  };

  const openWalletModal = () => setShowWalletModal(true);

  const walletProps = {
    account,
    balances,
    busy,
    ethBalance,
    onRefresh: refresh,
    onToggleBalances: togglePrivateBalances,
    privateBalancesVisible,
    tokens: TOKENS,
  };
  const swapProps = {
    amountIn,
    balance: balances[tokenIn],
    busy,
    connected,
    deadlineMinutes,
    error: swapError,
    minOut,
    minOutAuto,
    onAmountChange: setAmountIn,
    onConnect: openWalletModal,
    onDeadlineChange: setDeadlineMinutes,
    onMax: () => setAmountIn(formatInputAmount(balances[tokenIn].decrypted, TOKENS[tokenIn].decimals)),
    onAllowZeroMinOutChange: setAllowZeroMinOut,
    onMinOutChange: (value) => {
      setMinOut(value);
      setMinOutAuto(false);
      if (value !== '0') setAllowZeroMinOut(false);
    },
    onRefresh: refresh,
    onReveal: decryptBalances,
    onSwap: swap,
    onSwapProtectionChange: (value) => {
      setSwapProtectionBps(value);
      setMinOutAuto(true);
      setAllowZeroMinOut(false);
    },
    onTokenChange: (symbol) => {
      setTokenIn(symbol);
      setTokenOut(OUTPUT_TOKENS[symbol][0]);
      setMinOutAuto(true);
      setAllowZeroMinOut(false);
    },
    onTokenOutChange: (symbol) => {
      setTokenOut(symbol);
      setMinOutAuto(true);
      setAllowZeroMinOut(false);
    },
    onUseSuggestedMinOut: () => setMinOutAuto(true),
    outputOptions: OUTPUT_TOKENS[tokenIn],
    priceUpdatedAt,
    privateBalancesVisible,
    referenceOutput,
    suggestedMinOut,
    swapProtectionBps,
    token: TOKENS[tokenIn],
    tokenIn,
    tokenOut,
    tokens: TOKENS,
  };
  const orderContext = {
    account,
    agentMarket: {
      available: Boolean(ethPrice && priceUpdatedAt && chainNow > 0 && chainNow - priceUpdatedAt <= 3600),
      blockTimestamp: chainNow,
      ethPriceUsd: ethPrice,
      oracleUpdatedAt: priceUpdatedAt,
    },
    balances,
    busy,
    chainId,
    ethBalance,
    getWallet,
    onConnect: openWalletModal,
    onGatewayEvidence: setGatewayEvidence,
    onLog: addLog,
    onNotice: setNotice,
    onPrivateBalancesStale: () => setPrivateBalancesVisible(false),
    onRefreshAccount: loadAccount,
    onReveal: decryptBalances,
    privateBalancesVisible,
    walletProvider,
    setBusy,
  };
  const assetProps = {
    asset,
    assetAmount,
    assetMode,
    available: assetAvailable,
    balances,
    busy,
    chainNow,
    connected,
    faucets,
    onAmountChange: setAssetAmount,
    onAssetChange: setAsset,
    onFaucet: faucet,
    onManage: manageAsset,
    onMax: () => setAssetAmount(formatInputAmount(assetAvailable, assetToken.decimals)),
    onModeChange: setAssetMode,
    onReveal: decryptBalances,
    privateBalancesVisible,
    tokens: TOKENS,
    validation: assetValidation,
  };
  const aclProps = {
    aclResult,
    auditor,
    busy,
    connected,
    onAuditorChange: setAuditor,
    onGrant: grantAuditor,
  };
  const safeProps = {
    account,
    balances,
    busy,
    connected,
    onCancelOrder: safeCancelOrder,
    onConnect: openWalletModal,
    onCreateOrder: safeCreateOrder,
    onFund: safeFund,
    onGrantViewer: safeGrantViewer,
    onEnable: safeEnable,
    onFinalizeUnwrap: safeFinalizeUnwrap,
    onNotice: setNotice,
    onRefresh: refresh,
    onReveal: safeReveal,
    onRevoke: safeRevoke,
    onSetOperator: safeSetOperator,
    onSwap: safeSwap,
    onUnwrap: safeUnwrap,
    safe: safeState,
    safeActivity,
    safeBalances,
    safeOrders,
    safePendingUnwraps,
    agentMarket: orderContext.agentMarket,
    ethPrice,
    tokens: TOKENS,
  };
  const activityProps = {
    history,
    logs,
    onOpenReceipt: openHistoryReceipt,
    onRefreshHistory: refresh,
  };
  const evidenceProps = {
    attestation: gatewayEvidence,
    comparison: executionComparison,
    lastProof,
    onOpenProof: () => setShowProof(true),
    onOpenReceipt: () => setShowReceipt(true),
    pool,
    receipt,
  };
  const onPublicPage = location.pathname === '/' || location.pathname === '/docs';

  return (
    <div className={`app-shell${onPublicPage ? ' landing-shell' : ' product-shell'}`}>
      {onPublicPage ? (
        <>
          <LandingHeader />
          <Suspense fallback={<div className="route-loading"><LoaderCircle className="spin" size={24} /><span>Loading NoxSwap</span></div>}>
            <Routes>
              <Route path="/" element={<LandingPage ethPrice={ethPrice} />} />
              <Route path="/docs" element={<DocsPage />} />
            </Routes>
          </Suspense>
          <LandingFooter />
        </>
      ) : (
        <div className="product-layout">
          <AppSidebar account={account} busy={busy} onAccountAction={handleAccountAction} onChangeWallet={openWalletModal} walletName={walletName} walletProps={walletProps} />
          <div className="product-main">
            <div className="global-notices">
              <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
              {!walletAvailable && <NoticeBanner notice={{ type: 'error', text: 'No compatible wallet was detected. Read-only market data remains available.' }} />}
              {connected && !correctNetwork && <NoticeBanner notice={{ type: 'error', text: 'Switch your connected wallet to Ethereum Sepolia to use NoxSwap.' }} />}
            </div>
            <Suspense fallback={<div className="route-loading"><LoaderCircle className="spin" size={24} /><span>Loading NoxSwap</span></div>}>
              <Routes>
                <Route path="/app/trade" element={<TradePage orderContext={orderContext} swapProps={swapProps} />} />
                <Route path="/app/wallet" element={<WalletPage aclProps={aclProps} assetProps={assetProps} />} />
                <Route path="/app/safe" element={<SafePage safeProps={safeProps} />} />
                <Route path="/app/activity" element={<ActivityPage activityProps={activityProps} evidenceProps={evidenceProps} />} />
                <Route path="/swap" element={<Navigate replace to="/app/trade" />} />
                <Route path="/orders" element={<Navigate replace to="/app/trade?mode=orders" />} />
                <Route path="/assets" element={<Navigate replace to="/app/wallet" />} />
                <Route path="/privacy" element={<Navigate replace to="/app/wallet?tab=access" />} />
                <Route path="/safe" element={<Navigate replace to="/app/safe" />} />
                <Route path="/activity" element={<Navigate replace to="/app/activity" />} />
                <Route path="*" element={<Navigate replace to="/" />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      )}
      <AppModals lastProof={lastProof} onCloseProof={() => setShowProof(false)} onCloseReceipt={() => setShowReceipt(false)} receipt={receipt} showProof={showProof} showReceipt={showReceipt} />
      <WalletConnectModal busy={busy} show={showWalletModal} onClose={() => setShowWalletModal(false)} onSelectWallet={connect} />
    </div>
  );
}
