import 'dotenv/config';

import { LIMIT_ORDER_ABI } from '@noxswap/contracts/client-abis';
import deployment from '@noxswap/contracts/deployment-sepolia.json' with { type: 'json' };
import { Contract, JsonRpcProvider, Wallet, parseEther } from 'ethers';
import { createHealthState } from './keeper-health.js';
import { startHealthServer } from './keeper-health-server.js';
import { createNotifier, writeStructuredLog } from './keeper-notifier.js';
import { createKeeperOrderSource } from './keeper-order-index.js';
import { runKeeperCycle } from './keeper-scanner.js';
import { createRemoteKeeperObserver } from './observer-client.js';

const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const dryRun = args.has('--dry-run') || process.env.KEEPER_DRY_RUN === 'true';
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const historyRpcUrl = process.env.KEEPER_HISTORY_RPC_URL || 'https://eth-sepolia.api.onfinality.io/public';
const privateKey = process.env.KEEPER_PRIVATE_KEY ?? '';
if (!dryRun && !privateKey) throw new Error('Set KEEPER_PRIVATE_KEY for write mode.');
if (
  deployment.chainId !== 11155111
  || !deployment.contracts?.limitOrderBook
  || !deployment.safe?.orderBook
) throw new Error('Invalid Sepolia deployment configuration.');

const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
const historyProvider = new JsonRpcProvider(historyRpcUrl, 11155111, { staticNetwork: true });
const signer = privateKey ? new Wallet(privateKey, provider) : null;
const config = {
  dryRun,
  expireOrders: process.env.KEEPER_EXPIRE_ORDERS !== 'false',
  maxActions: Number(process.env.KEEPER_MAX_ACTIONS_PER_CYCLE ?? 2),
  minBalanceWei: parseEther(process.env.KEEPER_MIN_ETH ?? '0.005'),
  pollIntervalMs: Number(process.env.KEEPER_POLL_INTERVAL_MS ?? 15000),
};
const health = createHealthState({ keeperAddress: signer?.address ?? null, minBalanceWei: config.minBalanceWei });
const notify = createNotifier({ webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL ?? '', log: writeStructuredLog });
const observe = createRemoteKeeperObserver({
  endpoint: process.env.KEEPER_AI_OBSERVER_URL ?? '',
  token: process.env.KEEPER_AI_OBSERVER_TOKEN ?? '',
});
const orderBookDefinitions = [
  {
    key: 'personal',
    address: deployment.contracts.limitOrderBook,
    deploymentTransaction: deployment.deploymentTransactions.limitOrderBook,
    checkpointFile: process.env.KEEPER_CHECKPOINT_FILE || `${import.meta.dirname}/.keeper-checkpoint.json`,
  },
  {
    key: 'safe',
    address: deployment.safe.orderBook,
    deploymentTransaction: deployment.deploymentTransactions.safeLimitOrderBook,
    checkpointFile: process.env.KEEPER_SAFE_CHECKPOINT_FILE || `${import.meta.dirname}/.keeper-safe-checkpoint.json`,
  },
];

const runtimes = await Promise.all(orderBookDefinitions.map(async (definition) => {
  const contract = new Contract(definition.address, LIMIT_ORDER_ABI, signer ?? provider);
  const deploymentReceipt = await provider.getTransactionReceipt(definition.deploymentTransaction);
  if (!deploymentReceipt) throw new Error(`${definition.key} LimitOrderBook deployment receipt is unavailable.`);
  const log = (entry) => writeStructuredLog({
    orderBook: definition.key,
    orderBookAddress: definition.address,
    ...entry,
  });
  const orderSource = createKeeperOrderSource({
    chainId: deployment.chainId,
    checkpointFile: definition.checkpointFile,
    contract,
    contractAddress: definition.address,
    deploymentBlock: deploymentReceipt.blockNumber,
    finalityBlocks: Number(process.env.KEEPER_FINALITY_BLOCKS ?? 12),
    headLagBlocks: Number(process.env.KEEPER_HISTORY_HEAD_LAG_BLOCKS ?? 3),
    log,
    provider: historyProvider,
  });
  return {
    definition,
    log,
    notify: (payload) => notify({
      ...payload,
      orderBook: definition.key,
      orderBookAddress: definition.address,
    }),
    adapter: {
      keeperAddress: signer?.address ?? null,
      getChainId: async () => Number((await provider.getNetwork()).chainId),
      getBlockTimestamp: async () => Number((await provider.getBlock('latest')).timestamp),
      getBalance: (address) => provider.getBalance(address),
      listOrderIds: orderSource.listActiveOrderIds,
      getOrder: async (orderId) => {
        const order = await contract.getOrder(orderId);
        return { expiry: Number(order.expiry), status: Number(order.status) };
      },
      canExecute: async (orderId) => (await contract.canExecute(orderId)).executable,
      simulate: async (action, orderId) => contract[action === 'execute' ? 'executeOrder' : 'expireOrder'].estimateGas(orderId),
      send: async (action, orderId) => contract[action === 'execute' ? 'executeOrder' : 'expireOrder'](orderId),
    },
  };
}));

let stopped = false;
let healthServer;
const stop = () => { stopped = true; healthServer?.close(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function main() {
  if (!once) healthServer = startHealthServer({ health, port: Number(process.env.KEEPER_HEALTH_PORT ?? 8787) });
  do {
    let remainingActions = config.maxActions;
    for (const runtime of runtimes) {
      try {
        const result = await runKeeperCycle({
          adapter: runtime.adapter,
          config: { ...config, maxActions: remainingActions },
          health,
          log: runtime.log,
          notify: runtime.notify,
          observe,
        });
        remainingActions = Math.max(0, remainingActions - result.actions);
      } catch {
        // Health and scoped structured logs already capture this orderbook failure.
      }
    }
    if (once || stopped) break;
    await new Promise((resolve) => {
      let watcher;
      const timer = setTimeout(() => { clearInterval(watcher); resolve(); }, config.pollIntervalMs);
      watcher = setInterval(() => {
        if (stopped) { clearTimeout(timer); clearInterval(watcher); resolve(); }
      }, 100);
    });
  } while (!stopped);
}

await main();
