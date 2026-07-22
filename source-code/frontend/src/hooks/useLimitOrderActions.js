import { useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import deployment from '../deployment.json';
import { CONFIDENTIAL_TOKEN_ABI, LIMIT_ORDER_ABI } from '../contracts';
import { TOKENS } from '../config';
import { createHandleClient, retry } from '../lib/nox';
import { formatInputAmount, formatToken, shorten } from '../lib/format';
import { CONTRACT_ORDER_STATUS, getOrderPermissions, settlementOutcome, shouldDecryptSettlement } from '../lib/orders.js';
import { validateNonNegativeAmount, validateTokenAmount } from '../lib/validation';

const MIN_GAS_BALANCE = ethers.parseEther('0.0005');

export default function useLimitOrderActions({
  account,
  balances,
  blockTimestamp,
  bookError,
  chainId,
  ethBalance,
  getWallet,
  onGatewayEvidence,
  onLog,
  onNotice,
  onPrivateBalancesStale,
  onRefreshAccount,
  onRefreshOrders,
  oracle,
  privateBalancesVisible,
  setBusy,
}) {
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('5');
  const [minOut, setMinOut] = useState('0');
  const [trigger, setTrigger] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('30');
  const [operatorAuthorized, setOperatorAuthorized] = useState(false);
  const [liveBalanceHandle, setLiveBalanceHandle] = useState('');
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [revealedTerms, setRevealedTerms] = useState({});

  const tokenIn = side === 'buy' ? TOKENS.cUSDC : TOKENS.cETH;
  const tokenOut = side === 'buy' ? TOKENS.cETH : TOKENS.cUSDC;
  const available = privateBalancesVisible ? balances[tokenIn.symbol].decrypted : null;
  const amountValidation = useMemo(
    () => validateTokenAmount(amount, tokenIn.decimals, available),
    [amount, available, tokenIn.decimals],
  );
  const minOutValidation = useMemo(
    () => validateNonNegativeAmount(minOut, tokenOut.decimals),
    [minOut, tokenOut.decimals],
  );
  const formError = useMemo(() => {
    if (amountValidation.error) return amountValidation.error;
    if (minOutValidation.error) return minOutValidation.error;
    if (!/^\d+(\.\d+)?$/.test(trigger) || Number(trigger) <= 0) return 'Enter a positive ETH/USD trigger price.';
    if (!/^\d+$/.test(expiryMinutes) || Number(expiryMinutes) < 1 || Number(expiryMinutes) > 10080) {
      return 'Expiry must be between 1 minute and 7 days.';
    }
    return '';
  }, [amountValidation.error, expiryMinutes, minOutValidation.error, trigger]);

  useEffect(() => {
    if (oracle.price && !trigger) setTrigger(String(Math.round(oracle.price)));
  }, [oracle.price, trigger]);

  useEffect(() => {
    setRevealedTerms({});
  }, [account, chainId]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!account || chainId !== deployment.chainId) {
        setOperatorAuthorized(false);
        setLiveBalanceHandle('');
        return;
      }
      setReadinessLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const wrapper = new ethers.Contract(tokenIn.wrapper, CONFIDENTIAL_TOKEN_ABI, provider);
        const [authorized, handle] = await Promise.all([
          wrapper.isOperator(account, deployment.contracts.limitOrderBook),
          wrapper.confidentialBalanceOf(account),
        ]);
        if (active) {
          setOperatorAuthorized(authorized);
          setLiveBalanceHandle(handle);
        }
      } catch {
        if (active) {
          setOperatorAuthorized(false);
          setLiveBalanceHandle('');
        }
      } finally {
        if (active) setReadinessLoading(false);
      }
    };
    check();
    return () => { active = false; };
  }, [account, chainId, tokenIn.wrapper]);

  const handleCurrent = Boolean(liveBalanceHandle && liveBalanceHandle === balances[tokenIn.symbol].handle);
  const createChecks = [
    { id: 'wallet', label: 'Wallet connected', pass: Boolean(account), detail: account ? shorten(account) : 'Connect MetaMask' },
    { id: 'network', label: 'Ethereum Sepolia', pass: chainId === deployment.chainId, detail: chainId === deployment.chainId ? 'Chain 11155111' : 'Switch network' },
    { id: 'rpc', label: 'RPC available', pass: !bookError, detail: bookError || 'Public reads healthy' },
    { id: 'oracle', label: 'Chainlink answer valid', pass: oracle.available, detail: oracle.available ? `$${oracle.price?.toLocaleString()}` : oracle.error },
    { id: 'gas', label: 'Gas balance available', pass: ethBalance >= MIN_GAS_BALANCE, detail: `${formatToken(ethBalance, 18, 4)} ETH` },
    { id: 'balance', label: 'Private balance revealed and sufficient', pass: privateBalancesVisible && !amountValidation.error, detail: privateBalancesVisible ? (amountValidation.error || `${formatToken(available ?? 0n, tokenIn.decimals)} ${tokenIn.symbol}`) : 'Reveal private balances' },
    { id: 'handle', label: 'Current balance handle unchanged', pass: handleCurrent, detail: readinessLoading ? 'Checking' : handleCurrent ? shorten(liveBalanceHandle, 10, 8) : 'Refresh and reveal latest balance' },
    { id: 'operator', label: 'OrderBook authorized', pass: operatorAuthorized, detail: operatorAuthorized ? 'Authorized' : 'Authorization required' },
  ];
  const createReady = !formError && createChecks.every((check) => check.pass);

  const authorizeOrderBook = async () => {
    try {
      setBusy('authorize-orderbook');
      const wallet = await getWallet();
      const wrapper = new ethers.Contract(tokenIn.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const transaction = await wrapper.setOperator(deployment.contracts.limitOrderBook, BigInt('281474976710655'));
      onLog(`Authorize order book for ${tokenIn.symbol}`, transaction.hash);
      await transaction.wait();
      setOperatorAuthorized(true);
      onNotice({ type: 'success', text: `OrderBook authorized for ${tokenIn.symbol}.` });
    } catch (error) {
      onNotice({ type: 'error', text: error.shortMessage ?? error.message });
    } finally {
      setBusy('');
    }
  };

  const createOrder = async () => {
    if (!createReady) {
      onNotice({ type: 'error', text: formError || 'Resolve the readiness checks before creating this order.' });
      return;
    }
    try {
      setBusy('create-order');
      onNotice({ type: 'info', text: 'Encrypting order amount and minOut for the order book...' });
      const wallet = await getWallet();
      const wrapper = new ethers.Contract(tokenIn.wrapper, CONFIDENTIAL_TOKEN_ABI, wallet.signer);
      const currentHandle = await wrapper.confidentialBalanceOf(wallet.address);
      if (currentHandle !== balances[tokenIn.symbol].handle) throw new Error('Your private balance changed. Refresh and reveal the latest balance.');
      const orderBook = new ethers.Contract(deployment.contracts.limitOrderBook, LIMIT_ORDER_ABI, wallet.signer);
      const client = await createHandleClient(wallet.signer);
      const [encryptedAmount, encryptedMinimum] = await Promise.all([
        client.encryptInput(amountValidation.amount, 'uint256', deployment.contracts.limitOrderBook),
        client.encryptInput(minOutValidation.amount, 'uint256', deployment.contracts.limitOrderBook),
      ]);
      const triggerPrice = ethers.parseUnits(trigger, 8);
      const expiry = blockTimestamp + Number(expiryMinutes) * 60;
      const transaction = await orderBook.createOrder(
        tokenIn.wrapper,
        tokenOut.wrapper,
        encryptedAmount.handle,
        encryptedAmount.handleProof,
        encryptedMinimum.handle,
        encryptedMinimum.handleProof,
        triggerPrice,
        expiry,
      );
      onLog(`Confidential ${side} order submitted`, transaction.hash);
      const receipt = await transaction.wait();
      const event = receipt.logs
        .map((log) => { try { return orderBook.interface.parseLog(log); } catch { return null; } })
        .find((item) => item?.name === 'OrderCreated');
      if (!event) throw new Error('OrderCreated event was not found after confirmation.');
      onNotice({ type: 'success', text: `Order #${event.args.orderId} is escrowed. Amount and minOut remain encrypted.` });
      onPrivateBalancesStale();
      await Promise.all([onRefreshAccount(wallet.address), onRefreshOrders()]);
    } catch (error) {
      onNotice({ type: 'error', text: error.shortMessage ?? error.message ?? 'Order creation failed.' });
    } finally {
      setBusy('');
    }
  };

  const decryptSettlement = async ({ event, order, wallet, kind }) => {
    const client = await createHandleClient(wallet.signer);
    const handles = kind === 'execute'
      ? [event.args.encryptedOutput, event.args.encryptedRefund]
      : [event.args.encryptedRefund];
    const decrypted = await Promise.all(handles.map((handle) => retry(() => client.decrypt(handle))));
    onGatewayEvidence({ verifiedAt: Date.now(), handles: handles.length });
    if (kind === 'execute') {
      const output = TOKENS[order.tokenOut];
      const input = TOKENS[order.tokenIn];
      return `Output ${formatToken(decrypted[0].value, output.decimals)} ${output.symbol}; refund ${formatToken(decrypted[1].value, input.decimals)} ${input.symbol}.`;
    }
    const input = TOKENS[order.tokenIn];
    return `Refund ${formatToken(decrypted[0].value, input.decimals)} ${input.symbol}.`;
  };

  const settleOrder = async (order, action) => {
    let wallet;
    let receipt;
    let transaction;
    let orderBook;
    try {
      setBusy(`${action}-order-${order.id}`);
      wallet = await getWallet();
      const permissions = getOrderPermissions({ account: wallet.address, contractStatus: order.contractStatus, owner: order.owner, state: order.state });
      if (action === 'cancel' && !permissions.canCancel) throw new Error('Only the order owner can cancel this order.');
      if (action === 'execute' && !permissions.canExecute) throw new Error('This order is not currently trigger-ready.');
      if (action === 'expire' && !permissions.canExpire) throw new Error('This order is not ready for permissionless expiry refund.');
      orderBook = new ethers.Contract(deployment.contracts.limitOrderBook, LIMIT_ORDER_ABI, wallet.signer);
      const latest = await orderBook.getOrder(order.id);
      if (Number(latest.status) !== 0) throw new Error('Order state changed before submission. Refresh and try again.');
      if (action === 'execute') {
        const [executable] = await orderBook.canExecute(order.id);
        if (!executable) throw new Error('Chainlink trigger is no longer ready.');
        await orderBook.executeOrder.estimateGas(order.id);
        transaction = await orderBook.executeOrder(order.id);
      } else if (action === 'cancel') {
        await orderBook.cancelOrder.estimateGas(order.id);
        transaction = await orderBook.cancelOrder(order.id);
      } else {
        await orderBook.expireOrder.estimateGas(order.id);
        transaction = await orderBook.expireOrder(order.id);
      }
      onLog(`${action} order #${order.id}`, transaction.hash);
      receipt = await transaction.wait();
    } catch (error) {
      onNotice({ type: 'error', text: error.shortMessage ?? error.message ?? `${action} failed.` });
      setBusy('');
      return;
    }

    const confirmed = settlementOutcome({ transactionHash: transaction.hash });
    const base = `Order #${order.id} ${action === 'execute' ? 'executed' : action === 'cancel' ? 'cancelled' : 'expired and refunded'} on Sepolia. Tx ${shorten(confirmed.transactionHash, 10, 8)}.`;
    const ownerSettlement = shouldDecryptSettlement({ caller: wallet.address, owner: order.owner, transactionConfirmed: true });
    onNotice({ type: 'success', text: ownerSettlement ? `${base} Decrypting owner-authorized settlement...` : `${base} The owner received encrypted settlement handles.` });
    if (ownerSettlement) {
      onPrivateBalancesStale();
      const eventName = action === 'execute' ? 'OrderExecuted' : action === 'cancel' ? 'OrderCancelled' : 'OrderExpired';
      const event = receipt.logs
        .map((log) => { try { return orderBook.interface.parseLog(log); } catch { return null; } })
        .find((item) => item?.name === eventName);
      try {
        if (!event) throw new Error(`${eventName} event was not found in the confirmed receipt.`);
        const details = await decryptSettlement({ event, order, wallet, kind: action === 'execute' ? 'execute' : 'refund' });
        onNotice({ type: 'success', text: `${base} ${details}` });
      } catch (decryptError) {
        const outcome = settlementOutcome({ transactionHash: transaction.hash, decryptionError: decryptError.shortMessage ?? decryptError.message });
        onNotice({ type: 'info', text: `${base} Confirmation is final, but owner decryption is temporarily unavailable: ${outcome.decryptionWarning}` });
      }
      try { await onRefreshAccount(wallet.address); } catch { /* The confirmed orderbook refresh below remains authoritative. */ }
    }
    try { await onRefreshOrders(); } catch { /* Auto-refresh retries public state without changing the mined outcome. */ }
    setBusy('');
  };

  const revealOrderTerms = async (order) => {
    if (!account || account.toLowerCase() !== order.owner.toLowerCase()) {
      onNotice({ type: 'error', text: 'Only the order owner can reveal these encrypted terms.' });
      return;
    }
    try {
      setBusy(`reveal-order-${order.id}`);
      const wallet = await getWallet();
      const client = await createHandleClient(wallet.signer);
      const [amountResult, minOutResult] = await Promise.all([
        retry(() => client.decrypt(order.amountHandle)),
        retry(() => client.decrypt(order.minOutHandle)),
      ]);
      const input = TOKENS[order.tokenIn];
      const output = TOKENS[order.tokenOut];
      setRevealedTerms((current) => ({
        ...current,
        [order.id]: {
          amount: `${formatToken(amountResult.value, input.decimals)} ${input.symbol}`,
          minOut: `${formatToken(minOutResult.value, output.decimals)} ${output.symbol}`,
        },
      }));
      onGatewayEvidence({ verifiedAt: Date.now(), handles: 2 });
      onNotice({ type: 'success', text: `Order #${order.id} terms revealed for this session.` });
    } catch (error) {
      onNotice({ type: 'error', text: error.shortMessage ?? error.message ?? 'Order term decryption failed.' });
    } finally {
      setBusy('');
    }
  };

  const actionChecks = (order, action) => {
    const permissions = getOrderPermissions({ account, contractStatus: order.contractStatus, owner: order.owner, state: order.state });
    const permission = action === 'execute' ? permissions.canExecute : action === 'expire' ? permissions.canExpire : permissions.canCancel;
    const contractOpen = order.contractStatus === CONTRACT_ORDER_STATUS.OPEN;
    const beforeExpiry = blockTimestamp <= order.expiry;
    return [
      { id: 'wallet', label: 'Wallet connected', pass: Boolean(account), detail: account ? shorten(account) : 'Connect MetaMask' },
      { id: 'network', label: 'Ethereum Sepolia', pass: chainId === deployment.chainId, detail: chainId === deployment.chainId ? 'Chain 11155111' : 'Switch network' },
      { id: 'rpc', label: 'RPC available', pass: !bookError, detail: bookError || 'Public reads healthy' },
      { id: 'oracle', label: 'Chainlink answer valid', pass: action !== 'execute' || oracle.available, detail: action !== 'execute' ? 'Not required' : oracle.available ? `$${oracle.price?.toLocaleString()}` : oracle.error },
      { id: 'open', label: 'Contract order is Open', pass: contractOpen, detail: contractOpen ? 'Canonical status 0' : `Canonical status ${order.contractStatus}` },
      { id: 'time', label: action === 'expire' ? 'Block time passed expiry' : action === 'execute' ? 'Block time before expiry' : 'Cancellation timing allowed', pass: action === 'expire' ? !beforeExpiry : action === 'execute' ? beforeExpiry : contractOpen, detail: action === 'cancel' ? 'Owner may cancel until settlement' : new Date(order.expiry * 1000).toLocaleString() },
      { id: 'state', label: action === 'execute' ? 'Chainlink trigger ready' : action === 'expire' ? 'Permissionless refund ready' : 'Connected wallet is owner', pass: permission, detail: order.stateLabel },
      { id: 'gas', label: 'Gas balance available', pass: ethBalance >= MIN_GAS_BALANCE, detail: `${formatToken(ethBalance, 18, 4)} ETH` },
    ];
  };

  return {
    actionChecks,
    amount,
    authorizeOrderBook,
    available,
    createChecks,
    createOrder,
    createReady,
    expiryMinutes,
    formError,
    minOut,
    onAmountChange: setAmount,
    onExpiryChange: setExpiryMinutes,
    onMax: () => setAmount(formatInputAmount(available, tokenIn.decimals)),
    onMinOutChange: setMinOut,
    onSideChange: (nextSide) => {
      setSide(nextSide);
      setAmount(nextSide === 'buy' ? '5' : '0.001');
      setMinOut('0');
    },
    onTriggerChange: setTrigger,
    operatorAuthorized,
    readinessLoading,
    revealOrderTerms,
    revealedTerms,
    settleOrder,
    side,
    tokenIn,
    tokenOut,
    trigger,
  };
}
