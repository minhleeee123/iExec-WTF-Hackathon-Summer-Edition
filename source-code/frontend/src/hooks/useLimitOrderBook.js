import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import deployment from '../deployment.json';
import { CHAINLINK_FEED_ABI, LIMIT_ORDER_ABI } from '../contracts';
import { ORDER_HISTORY_RPC_URL, RPC_URL, TOKENS } from '../config';
import {
  ORDER_INDEX_FINALITY_BLOCKS,
  ORDER_INDEX_HEAD_LAG_BLOCKS,
  applyOrderEvents,
  createOrderIndex,
  loadOrderIndex,
  normalizeOrderLog,
  orderIndexValues,
  queryLogsInChunks,
  saveOrderIndex,
  splitFinalizedEvents,
} from '../lib/order-event-index.js';
import { CONTRACT_ORDER_STATUS, ORDER_STATE_LABEL, deriveOrderState, isOrderOwner } from '../lib/orders.js';

const REFRESH_INTERVAL_MS = 20_000;
const READ_CONCURRENCY = 5;

async function allSettledWithLimit(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index], index) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function addressToSymbol(address) {
  return Object.values(TOKENS).find((token) => token.wrapper.toLowerCase() === address.toLowerCase())?.symbol ?? address;
}

export default function useLimitOrderBook({ account, onOrderChange }) {
  const [orders, setOrders] = useState([]);
  const [oracle, setOracle] = useState({ available: false, price: null, updatedAt: null, error: 'Loading oracle.' });
  const [blockTimestamp, setBlockTimestamp] = useState(0);
  const [blockFetchedAt, setBlockFetchedAt] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partialErrors, setPartialErrors] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const previousStates = useRef(null);
  const requestId = useRef(0);
  const finalizedIndex = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    if (!quiet) setRefreshing(true);
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL, deployment.chainId, { staticNetwork: true });
      const historyProvider = new ethers.JsonRpcProvider(ORDER_HISTORY_RPC_URL, deployment.chainId, { staticNetwork: true });
      const orderBook = new ethers.Contract(deployment.contracts.limitOrderBook, LIMIT_ORDER_ABI, provider);
      const feed = new ethers.Contract(deployment.feeds.ethUsd, CHAINLINK_FEED_ABI, provider);
      const [latestBlock, historyLatestBlock, deploymentReceipt, priceDecimals, maxOracleAge] = await Promise.all([
        provider.getBlock('latest'),
        historyProvider.getBlockNumber(),
        provider.getTransactionReceipt(deployment.deploymentTransactions.limitOrderBook),
        orderBook.priceDecimals(),
        orderBook.MAX_ORACLE_AGE(),
      ]);
      if (!latestBlock || !deploymentReceipt) throw new Error('Orderbook deployment or latest block is unavailable.');

      const lifecycleTopics = ['OrderCreated', 'OrderExecuted', 'OrderCancelled', 'OrderExpired']
        .map((eventName) => orderBook.interface.getEvent(eventName).topicHash);
      const eventTip = Math.max(
        deploymentReceipt.blockNumber,
        Math.min(latestBlock.number, historyLatestBlock) - ORDER_INDEX_HEAD_LAG_BLOCKS,
      );
      let expectedOrderCount = null;
      try {
        expectedOrderCount = Math.max(0, Number(await orderBook.nextOrderId({ blockTag: eventTip })) - 1);
      } catch {
        // Index validation is optional when the read RPC cannot serve a recent historical block.
      }
      const identity = {
        chainId: deployment.chainId,
        contractAddress: deployment.contracts.limitOrderBook,
        deploymentBlock: deploymentReceipt.blockNumber,
      };
      let baseIndex = finalizedIndex.current
        ?? loadOrderIndex(window.localStorage, identity)
        ?? createOrderIndex(identity);
      if (baseIndex.checkpointBlock > eventTip) baseIndex = createOrderIndex(identity);
      const fromBlock = Math.max(deploymentReceipt.blockNumber, baseIndex.checkpointBlock + 1);
      const [eventsResult, oracleResult] = await Promise.allSettled([
        queryLogsInChunks(historyProvider, {
          address: deployment.contracts.limitOrderBook,
          topics: [lifecycleTopics],
        }, fromBlock, eventTip),
        feed.latestRoundData(),
      ]);

      let displayIndex = baseIndex;
      if (eventsResult.status === 'fulfilled') {
        const events = eventsResult.value
          .map((event) => normalizeOrderLog(event, orderBook.interface))
          .filter(Boolean);
        const nextCheckpoint = Math.max(baseIndex.checkpointBlock, eventTip - ORDER_INDEX_FINALITY_BLOCKS);
        const [newlyFinalized, overlay] = splitFinalizedEvents(events, nextCheckpoint);
        baseIndex = applyOrderEvents(baseIndex, newlyFinalized, nextCheckpoint);
        finalizedIndex.current = baseIndex;
        saveOrderIndex(window.localStorage, baseIndex);
        displayIndex = applyOrderEvents(baseIndex, overlay);
      }
      let indexedOrders = orderIndexValues(displayIndex);
      if (
        eventsResult.status === 'fulfilled'
        && expectedOrderCount !== null
        && indexedOrders.length !== expectedOrderCount
        && fromBlock > deploymentReceipt.blockNumber
      ) {
        const rebuildLogs = await queryLogsInChunks(historyProvider, {
          address: deployment.contracts.limitOrderBook,
          topics: [lifecycleTopics],
        }, deploymentReceipt.blockNumber, eventTip);
        const rebuildEvents = rebuildLogs
          .map((event) => normalizeOrderLog(event, orderBook.interface))
          .filter(Boolean);
        const rebuildCheckpoint = Math.max(deploymentReceipt.blockNumber - 1, eventTip - ORDER_INDEX_FINALITY_BLOCKS);
        const [rebuildFinalized, rebuildOverlay] = splitFinalizedEvents(rebuildEvents, rebuildCheckpoint);
        baseIndex = applyOrderEvents(createOrderIndex(identity), rebuildFinalized, rebuildCheckpoint);
        finalizedIndex.current = baseIndex;
        saveOrderIndex(window.localStorage, baseIndex);
        displayIndex = applyOrderEvents(baseIndex, rebuildOverlay);
        indexedOrders = orderIndexValues(displayIndex);
      }

      let oracleState;
      if (oracleResult.status === 'fulfilled') {
        const round = oracleResult.value;
        const updatedAt = Number(round.updatedAt);
        const stale = Number(round.answer) <= 0
          || round.answeredInRound < round.roundId
          || updatedAt > latestBlock.timestamp
          || latestBlock.timestamp - updatedAt > Number(maxOracleAge);
        oracleState = {
          available: !stale,
          price: Number(ethers.formatUnits(round.answer, priceDecimals)),
          rawPrice: round.answer,
          updatedAt,
          error: stale ? 'Chainlink answer is invalid or stale.' : '',
        };
      } else {
        oracleState = { available: false, price: null, rawPrice: null, updatedAt: null, error: oracleResult.reason?.message ?? 'Chainlink is unavailable.' };
      }

      const reads = await allSettledWithLimit(indexedOrders, READ_CONCURRENCY, async (order) => {
        const contractStatus = Number(order.contractStatus);
        let executable = false;
        let orderOracleAvailable = oracleState.available;
        let readinessError = '';
        if (contractStatus === CONTRACT_ORDER_STATUS.OPEN && latestBlock.timestamp <= Number(order.expiry) && oracleState.available) {
          try {
            [executable] = await orderBook.canExecute(order.id);
          } catch (readError) {
            orderOracleAvailable = false;
            readinessError = readError.shortMessage ?? readError.message;
          }
        }
        const state = deriveOrderState({
          contractStatus,
          blockTimestamp: latestBlock.timestamp,
          expiry: Number(order.expiry),
          canExecute: executable,
          oracleAvailable: orderOracleAvailable,
        });
        return {
          id: order.id,
          owner: order.owner,
          tokenIn: addressToSymbol(order.tokenIn),
          tokenOut: addressToSymbol(order.tokenOut),
          amountHandle: order.amountHandle,
          minOutHandle: order.minOutHandle,
          triggerPrice: BigInt(order.triggerPrice),
          expiry: Number(order.expiry),
          contractStatus,
          state,
          stateLabel: ORDER_STATE_LABEL[state],
          canExecute: executable,
          readinessError,
          createdTransactionHash: order.createdTransactionHash,
          createdBlock: order.createdBlock,
          terminalTransactionHash: order.terminalTransactionHash,
          terminalBlock: order.terminalBlock,
        };
      });

      const loaded = reads.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      const failures = reads
        .map((result, index) => result.status === 'rejected' ? `Order #${indexedOrders[index].id}: ${result.reason?.shortMessage ?? result.reason?.message}` : '')
        .filter(Boolean);
      failures.push(...loaded.filter((order) => order.readinessError).map((order) => `Order #${order.id} readiness: ${order.readinessError}`));
      if (eventsResult.status === 'rejected') failures.unshift(`Lifecycle events: ${eventsResult.reason?.message}`);
      if (expectedOrderCount !== null && indexedOrders.length !== expectedOrderCount) {
        failures.unshift(`Order index has ${indexedOrders.length} of ${expectedOrderCount} orders at block ${eventTip}. Retry the archive RPC sync.`);
      }
      if (currentRequest !== requestId.current) return;
      setOrders(loaded);
      setOracle(oracleState);
      setBlockTimestamp(latestBlock.timestamp);
      setBlockFetchedAt(Date.now());
      setPartialErrors(failures);
      setError('');
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      setError(loadError.shortMessage ?? loadError.message ?? 'Unable to load the public orderbook.');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ quiet: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const current = new Map(orders.map((order) => [order.id, order.state]));
    if (previousStates.current && account) {
      for (const order of orders) {
        const previous = previousStates.current.get(order.id);
        if (previous && previous !== order.state && isOrderOwner(account, order.owner)) {
          const message = `Order #${order.id} changed from ${ORDER_STATE_LABEL[previous]} to ${order.stateLabel}.`;
          onOrderChange?.(message);
          if (notificationsEnabled && window.Notification?.permission === 'granted') {
            new window.Notification('NoxSwap order update', { body: message });
          }
        }
      }
    }
    previousStates.current = current;
  }, [account, notificationsEnabled, onOrderChange, orders]);

  const enableNotifications = async () => {
    if (!window.Notification) return false;
    const permission = await window.Notification.requestPermission();
    const enabled = permission === 'granted';
    setNotificationsEnabled(enabled);
    return enabled;
  };

  return {
    blockTimestamp,
    blockFetchedAt,
    enableNotifications,
    error,
    loading,
    notificationsEnabled,
    oracle,
    orders,
    partialErrors,
    refresh,
    refreshing,
  };
}
