import { useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import deployment from '../deployment.json';
import useLimitOrderBook from '../hooks/useLimitOrderBook';
import { formatToken, shorten } from '../lib/format';
import { CONTRACT_ORDER_STATUS, ORDER_STATE } from '../lib/orders.js';
import OrderBook from './OrderBook';

const MIN_GAS_BALANCE = ethers.parseEther('0.0005');

export default function SafeOrderBook({
  account,
  busy,
  chainId,
  ethBalance,
  onCancelOrder,
  onConnect,
  onNotice,
  onRevealOrderTerms,
  onSettleOrder,
  revealedTerms,
  safe,
}) {
  const notifyChange = useCallback(
    (message) => onNotice({ type: 'info', text: `Safe ${message.toLowerCase()}` }),
    [onNotice],
  );
  const book = useLimitOrderBook({
    account: safe?.address ?? '',
    deploymentTransactionHash: deployment.deploymentTransactions.safeLimitOrderBook,
    onOrderChange: notifyChange,
    orderBookAddress: safe?.orderBook,
  });

  const getPermissions = useCallback((order) => {
    const connected = Boolean(account);
    const safeOwned = Boolean(safe?.address && order.owner?.toLowerCase() === safe.address.toLowerCase());
    const contractOpen = order.contractStatus === CONTRACT_ORDER_STATUS.OPEN;
    return {
      canCancel: safeOwned && Boolean(safe?.isOwner) && Boolean(safe?.moduleEnabled) && contractOpen,
      canExecute: connected && order.state === ORDER_STATE.EXECUTABLE,
      canExpire: connected && order.state === ORDER_STATE.EXPIRED && contractOpen,
      canReveal: safeOwned && Boolean(safe?.isOwner),
      isOwner: safeOwned && Boolean(safe?.isOwner),
    };
  }, [account, safe?.address, safe?.isOwner, safe?.moduleEnabled]);

  const actions = useMemo(() => ({
    actionChecks: (order, action) => {
      const permissions = getPermissions(order);
      const contractOpen = order.contractStatus === CONTRACT_ORDER_STATUS.OPEN;
      const beforeExpiry = book.blockTimestamp <= order.expiry;
      const permission = action === 'execute'
        ? permissions.canExecute
        : action === 'expire'
          ? permissions.canExpire
          : permissions.canCancel;
      return [
        { id: 'wallet', label: 'Wallet connected', pass: Boolean(account), detail: account ? shorten(account) : 'Connect wallet' },
        { id: 'network', label: 'Ethereum Sepolia', pass: chainId === deployment.chainId, detail: chainId === deployment.chainId ? 'Chain 11155111' : 'Switch network' },
        { id: 'rpc', label: 'Safe orderbook available', pass: !book.error, detail: book.error || shorten(safe?.orderBook ?? '', 10, 8) },
        { id: 'oracle', label: 'Chainlink answer valid', pass: action !== 'execute' || book.oracle.available, detail: action !== 'execute' ? 'Not required' : book.oracle.available ? `$${book.oracle.price?.toLocaleString()}` : book.oracle.error },
        { id: 'open', label: 'Contract order is Open', pass: contractOpen, detail: contractOpen ? 'Canonical status 0' : `Canonical status ${order.contractStatus}` },
        { id: 'time', label: action === 'expire' ? 'Block time passed expiry' : action === 'execute' ? 'Block time before expiry' : 'Cancellation timing allowed', pass: action === 'expire' ? !beforeExpiry : action === 'execute' ? beforeExpiry : contractOpen, detail: action === 'cancel' ? 'Safe owner may cancel before settlement' : new Date(order.expiry * 1000).toLocaleString() },
        { id: 'authority', label: action === 'cancel' ? 'Safe owner and module active' : action === 'execute' ? 'Chainlink trigger ready' : 'Permissionless refund ready', pass: permission, detail: action === 'cancel' ? safe?.moduleEnabled ? 'Cancel routes through the allowlisted module' : 'Enable the Nox module first' : order.stateLabel },
        { id: 'gas', label: 'Gas balance available', pass: ethBalance >= MIN_GAS_BALANCE, detail: `${formatToken(ethBalance, 18, 4)} ETH` },
      ];
    },
    getBusyKey: (action, order) => action === 'cancel'
      ? `safe-cancel-${order.id}`
      : action === 'reveal'
        ? `reveal-order-${order.id}`
        : `${action}-safe-order-${order.id}`,
    getCallerLabel: (permissions) => permissions.isOwner ? 'Connected Safe owner' : account ? 'Permissionless executor' : 'Read only',
    getRevealLabel: () => 'Reveal Safe order terms',
    getPermissions,
    revealOrderTerms: onRevealOrderTerms,
    revealedTerms,
    settleOrder: async (order, action) => {
      if (action === 'cancel') await onCancelOrder(order.id);
      else await onSettleOrder(order, action);
      await book.refresh();
    },
  }), [account, book, chainId, ethBalance, getPermissions, onCancelOrder, onRevealOrderTerms, onSettleOrder, revealedTerms, safe?.moduleEnabled, safe?.orderBook]);

  return (
    <OrderBook
      account={account}
      actions={actions}
      basePath="/app/safe"
      baseQuery={{ section: 'orders' }}
      blockFetchedAt={book.blockFetchedAt}
      blockTimestamp={book.blockTimestamp}
      book={book}
      busy={busy}
      eyebrow="SAFE ON-CHAIN ORDERBOOK"
      onConnect={onConnect}
      ownerFilterAddress={safe?.address ?? ''}
      ownerFilterLabel="Safe orders"
      title="Public execution, private terms"
    />
  );
}
