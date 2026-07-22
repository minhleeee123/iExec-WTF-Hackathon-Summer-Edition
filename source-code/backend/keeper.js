import 'dotenv/config';

import { Contract, JsonRpcProvider, Wallet, parseEther } from 'ethers';
import deployment from './deployment-sepolia.json' with { type: 'json' };
import { createHealthState } from './lib/keeper-health.js';
import { startHealthServer } from './lib/keeper-health-server.js';
import { createNotifier, writeStructuredLog } from './lib/keeper-notifier.js';
import { runKeeperCycle } from './lib/keeper-scanner.js';

const ABI = [
  'function nextOrderId() view returns (uint256)',
  'function getOrder(uint256 orderId) view returns (address owner,address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes32 encryptedMinOut,uint256 triggerPrice,uint64 expiry,uint8 status)',
  'function canExecute(uint256 orderId) view returns (bool executable,uint256 currentPrice)',
  'function executeOrder(uint256 orderId) returns (bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'function expireOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
];

const args = new Set(process.argv.slice(2));
const once = args.has('--once');
const dryRun = args.has('--dry-run') || process.env.KEEPER_DRY_RUN === 'true';
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.KEEPER_PRIVATE_KEY ?? '';
if (!dryRun && !privateKey) throw new Error('Set KEEPER_PRIVATE_KEY for write mode.');
if (deployment.chainId !== 11155111 || !deployment.contracts?.limitOrderBook) throw new Error('Invalid Sepolia deployment configuration.');

const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
const signer = privateKey ? new Wallet(privateKey, provider) : null;
const orderBook = new Contract(deployment.contracts.limitOrderBook, ABI, signer ?? provider);
const config = {
  dryRun,
  expireOrders: process.env.KEEPER_EXPIRE_ORDERS !== 'false',
  maxActions: Number(process.env.KEEPER_MAX_ACTIONS_PER_CYCLE ?? 2),
  minBalanceWei: parseEther(process.env.KEEPER_MIN_ETH ?? '0.005'),
  pollIntervalMs: Number(process.env.KEEPER_POLL_INTERVAL_MS ?? 15000),
};
const health = createHealthState({ keeperAddress: signer?.address ?? null, minBalanceWei: config.minBalanceWei });
const notify = createNotifier({ webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL ?? '', log: writeStructuredLog });

const adapter = {
  keeperAddress: signer?.address ?? null,
  getChainId: async () => Number((await provider.getNetwork()).chainId),
  getBlockTimestamp: async () => Number((await provider.getBlock('latest')).timestamp),
  getBalance: (address) => provider.getBalance(address),
  listOrderIds: async () => Array.from({ length: Number(await orderBook.nextOrderId()) - 1 }, (_, index) => index + 1),
  getOrder: async (orderId) => {
    const order = await orderBook.getOrder(orderId);
    return { expiry: Number(order.expiry), status: Number(order.status) };
  },
  canExecute: async (orderId) => (await orderBook.canExecute(orderId)).executable,
  simulate: async (action, orderId) => orderBook[action === 'execute' ? 'executeOrder' : 'expireOrder'].estimateGas(orderId),
  send: async (action, orderId) => orderBook[action === 'execute' ? 'executeOrder' : 'expireOrder'](orderId),
};

let stopped = false;
let healthServer;
const stop = () => { stopped = true; healthServer?.close(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function main() {
  if (!once) healthServer = startHealthServer({ health, port: Number(process.env.KEEPER_HEALTH_PORT ?? 8787) });
  do {
    try { await runKeeperCycle({ adapter, config, health, log: writeStructuredLog, notify }); } catch { /* Health and structured logs already capture the cycle failure. */ }
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
