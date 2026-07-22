import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { ExternalLink } from 'lucide-react';
import deployment from './deployment.json';
import {
  CHAINLINK_ETH_USD,
  CHAINLINK_FEED_ABI,
  CONFIDENTIAL_TOKEN_ABI,
  NOX_SWAP_ABI,
  TEST_TOKEN_ABI,
} from './contracts';
import {
  createInitialBalances,
  createInitialFaucets,
  FAUCET_COOLDOWN_SECONDS,
  RPC_URL,
  SEPOLIA_HEX,
  TOKENS,
} from './config';
import { createHandleClient, retry } from './lib/nox';
import { queryRecentSwapEvents } from './lib/history';
import {
  decodeReceiptImage,
  formatDuration,
  formatInputAmount,
  formatToken,
  isHandle,
  shorten,
} from './lib/format';
import { getCooldownRemaining, validateTokenAmount } from './lib/validation';
import AclSection from './components/AclSection';
import ActivitySection from './components/ActivitySection';
import AppHeader from './components/AppHeader';
import AppModals from './components/AppModals';
import AssetOperations from './components/AssetOperations';
import EvidenceSection from './components/EvidenceSection';
import HeroSection from './components/HeroSection';
import NoticeBanner from './components/NoticeBanner';
import PrivateWallet from './components/PrivateWallet';
import SwapPanel from './components/SwapPanel';
import './App.css';

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
  const [privateBalancesVisible, setPrivateBalancesVisible] = useState(false);
  const [clockTick, setClockTick] = useState(() => Math.floor(Date.now() / 1000));
  const [chainTimeOffset, setChainTimeOffset] = useState(0);

  const tokenOut = tokenIn === 'cUSDC' ? 'cETH' : 'cUSDC';
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
        receiptId: event.args.receiptId.toString(),
      })));
    } catch (error) {
      console.warn('Swap history is temporarily unavailable.', error);
      setHistory([]);
    }
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
    const timer = window.setInterval(() => setClockTick(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadMarket().catch(fail);
    if (!window.ethereum) return undefined;
    const sync = async () => {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chain = await window.ethereum.request({ method: 'eth_chainId' });
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
      }
    };
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
      setPrivateBalancesVisible(false);
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
        } else {
          next[token.symbol] = { ...current, decrypted: 0n };
        }
      }
      setBalances(next);
      setPrivateBalancesVisible(true);
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
    try {
      const input = TOKENS[tokenIn];
      const output = TOKENS[tokenOut];
      if (swapValidation.error) throw new Error(swapValidation.error);
      const amount = swapValidation.amount;
      setBusy('swap');
      setNotice({ type: 'info', text: 'Preparing confidential input with Nox Gateway...' });
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
      setPrivateBalancesVisible(false);
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
      <AppHeader account={account} busy={busy} onConnect={connect} />

      <main>
        <HeroSection ethPrice={ethPrice} />
        <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} />
        {!window.ethereum && <NoticeBanner notice={{ type: 'error', text: 'MetaMask is not installed. Read-only market data remains available.' }} />}
        {connected && !correctNetwork && <NoticeBanner notice={{ type: 'error', text: 'Switch MetaMask to Ethereum Sepolia to use NoxSwap.' }} />}

        <section id="swap" className="workspace-grid">
          <SwapPanel
            amountIn={amountIn}
            balance={balances[tokenIn]}
            busy={busy}
            connected={connected}
            onAmountChange={setAmountIn}
            onConnect={connect}
            onMax={() => setAmountIn(formatInputAmount(balances[tokenIn].decrypted, TOKENS[tokenIn].decimals))}
            onRefresh={refresh}
            onReveal={decryptBalances}
            onSwap={swap}
            onTokenChange={setTokenIn}
            priceUpdatedAt={priceUpdatedAt}
            privateBalancesVisible={privateBalancesVisible}
            referenceOutput={referenceOutput}
            token={TOKENS[tokenIn]}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            validation={swapValidation}
          />
          <PrivateWallet
            account={account}
            balances={balances}
            busy={busy}
            ethBalance={ethBalance}
            onToggleBalances={togglePrivateBalances}
            privateBalancesVisible={privateBalancesVisible}
            tokens={TOKENS}
          />
        </section>

        <AssetOperations
          asset={asset}
          assetAmount={assetAmount}
          assetMode={assetMode}
          available={assetAvailable}
          balances={balances}
          busy={busy}
          chainNow={chainNow}
          connected={connected}
          faucets={faucets}
          onAmountChange={setAssetAmount}
          onAssetChange={setAsset}
          onFaucet={faucet}
          onManage={manageAsset}
          onMax={() => setAssetAmount(formatInputAmount(assetAvailable, assetToken.decimals))}
          onModeChange={setAssetMode}
          onReveal={decryptBalances}
          privateBalancesVisible={privateBalancesVisible}
          tokens={TOKENS}
          validation={assetValidation}
        />
        <AclSection aclResult={aclResult} auditor={auditor} busy={busy} connected={connected} onAuditorChange={setAuditor} onGrant={grantAuditor} />
        <ActivitySection history={history} logs={logs} onOpenReceipt={openHistoryReceipt} />
        <EvidenceSection
          lastProof={lastProof}
          onOpenProof={() => setShowProof(true)}
          onOpenReceipt={() => setShowReceipt(true)}
          pool={pool}
          receipt={receipt}
        />
      </main>

      <footer><span>NoxSwap</span><span>Ethereum Sepolia / iExec Nox</span><a href={deployment.explorerUrl} target="_blank" rel="noreferrer">Contract <ExternalLink size={13} /></a></footer>

      <AppModals
        lastProof={lastProof}
        onCloseProof={() => setShowProof(false)}
        onCloseReceipt={() => setShowReceipt(false)}
        receipt={receipt}
        showProof={showProof}
        showReceipt={showReceipt}
      />
    </div>
  );
}
