import { decideOrder, OPEN_ORDER_STATUS } from './keeper-decision.js';
import { recordKeeperAction, recordKeeperCycle } from './keeper-health.js';

export async function runKeeperCycle({ adapter, config, health, log, notify, observe = null }) {
  const startedAt = Date.now();
  let balanceWei = null;
  const observationJobs = [];
  const queueObservation = (event) => {
    if (!observe) return;
    observationJobs.push(Promise.resolve()
      .then(() => observe(event))
      .then((observation) => log({
        orderId: event.orderId,
        decision: 'ai-observer',
        result: 'observed',
        observerSeverity: observation.severity,
        observerHeadline: observation.headline,
        recommendedAction: observation.recommendedAction,
      }))
      .catch((error) => log({ orderId: event.orderId, decision: 'ai-observer', result: 'observer-failed', error: error.message })));
  };
  try {
    const chainId = await adapter.getChainId();
    if (chainId !== 11155111) throw new Error(`Wrong chain ${chainId}; expected 11155111.`);
    const blockTimestamp = await adapter.getBlockTimestamp();
    if (adapter.keeperAddress) balanceWei = await adapter.getBalance(adapter.keeperAddress);
    recordKeeperCycle(health, { balanceWei, rpcSuccess: true });
    const lowBalance = balanceWei !== null && balanceWei < config.minBalanceWei;
    const ids = await adapter.listOrderIds();
    let actions = 0;

    for (const orderId of ids) {
      let order;
      try {
        order = await adapter.getOrder(orderId);
      } catch (error) {
        log({ orderId: String(orderId), decision: 'retry', result: 'order-read-failed', error: error.message });
        continue;
      }

      let executable = false;
      let oracleError = '';
      if (Number(order.status) === OPEN_ORDER_STATUS && blockTimestamp <= Number(order.expiry)) {
        try { executable = await adapter.canExecute(orderId); } catch (error) { oracleError = error.message; }
      }
      const decision = decideOrder({ status: order.status, blockTimestamp, expiry: order.expiry, canExecute: executable, oracleError });
      if (!['execute', 'expire'].includes(decision.action)) {
        log({ orderId: String(orderId), decision: decision.action, result: decision.reason });
        if (decision.action === 'retry') queueObservation({ orderId: String(orderId), decision: 'retry', reason: decision.reason, result: 'retry-next-cycle', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
        continue;
      }
      if (decision.action === 'expire' && !config.expireOrders) {
        log({ orderId: String(orderId), decision: 'skip', result: 'expiry-disabled' });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'expiry-disabled', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
        continue;
      }
      if (actions >= config.maxActions) {
        log({ orderId: String(orderId), decision: decision.action, result: 'max-actions-reached' });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'max-actions-reached', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
        continue;
      }
      if (lowBalance) {
        log({ orderId: String(orderId), decision: decision.action, result: 'keeper-balance-low' });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'keeper-balance-low', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
        continue;
      }
      if (config.dryRun) {
        log({ orderId: String(orderId), decision: decision.action, result: 'dry-run' });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'dry-run', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
        actions += 1;
        continue;
      }

      try {
        const latest = await adapter.getOrder(orderId);
        if (Number(latest.status) !== OPEN_ORDER_STATUS) {
          log({ orderId: String(orderId), decision: decision.action, result: 'stale-race' });
          queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'stale-race', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
          continue;
        }
        await adapter.simulate(decision.action, orderId);
        const transaction = await adapter.send(decision.action, orderId);
        const receipt = await transaction.wait();
        actions += 1;
        const actionRecord = {
          orderId: String(orderId),
          action: decision.action,
          transactionHash: transaction.hash,
          blockNumber: receipt.blockNumber,
        };
        recordKeeperAction(health, actionRecord);
        log({ orderId: String(orderId), decision: decision.action, result: 'confirmed', transactionHash: transaction.hash, blockNumber: receipt.blockNumber, durationMs: Date.now() - startedAt });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result: 'confirmed', blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: transaction.hash });
        try {
          await notify({
            ...actionRecord,
            explorerUrl: `https://sepolia.etherscan.io/tx/${transaction.hash}`,
            keeperAddress: adapter.keeperAddress,
          });
        } catch (notificationError) {
          log({ orderId: String(orderId), decision: decision.action, result: 'notification-failed', error: notificationError.message });
        }
      } catch (error) {
        const stale = /not open|not-open|expired|trigger not reached/i.test(error.shortMessage ?? error.message);
        const result = stale ? 'stale-race' : 'transaction-failed';
        log({ orderId: String(orderId), decision: decision.action, result, error: error.shortMessage ?? error.message });
        queueObservation({ orderId: String(orderId), decision: decision.action, reason: decision.reason, result, blockTimestamp, expiry: Number(order.expiry), canExecute: executable, transactionHash: null });
      }
    }
    await Promise.allSettled(observationJobs);
    return { actions, lowBalance, scanned: ids.length };
  } catch (error) {
    recordKeeperCycle(health, { balanceWei, rpcSuccess: false, error: /Wrong chain/.test(error.message) ? error.message : '' });
    log({ decision: 'cycle', result: 'failed', error: error.message, durationMs: Date.now() - startedAt });
    throw error;
  }
}
