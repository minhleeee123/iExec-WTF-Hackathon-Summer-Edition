import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Contract, Interface, JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { createLiveEvidence, writeEvidence } from './lib/evidence.js';

if (!process.env.PRIVATE_KEY) throw new Error('Set PRIVATE_KEY in the environment.');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(rootDir, '../..');
const deployment = JSON.parse(fs.readFileSync(path.join(rootDir, 'deployment-sepolia.json'), 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const writeEnabled = process.argv.includes('--write');

const parseTool = (response, label) => {
  assert(!response.isError, `${label}: ${response.content[0].text}`);
  return JSON.parse(response.content[0].text);
};

async function ensureMcpTestFunds(wallet, currentBalance) {
  if (parseUnits(currentBalance, 6) >= parseUnits('0.2', 6)) return null;
  const tokenAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function faucet()',
    'function approve(address,uint256) returns (bool)',
  ];
  const wrapperAbi = ['function wrap(address,uint256)'];
  const underlying = new Contract(deployment.contracts.underlyingUSDC, tokenAbi, wallet);
  const wrapper = new Contract(deployment.contracts.cUSDC, wrapperAbi, wallet);
  const amount = parseUnits('1', 6);
  if (await underlying.balanceOf(wallet.address) < amount) await (await underlying.faucet()).wait();
  await (await underlying.approve(deployment.contracts.cUSDC, amount)).wait();
  const transaction = await wrapper.wrap(wallet.address, amount);
  await transaction.wait();
  return transaction.hash;
}

async function waitForMcpBalance(client, address, minimum, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const balance = parseTool(await client.callTool({
        name: 'nox_decrypt_balance',
        arguments: { address, tokenSymbol: 'cUSDC' },
      }), 'refresh funded MCP balance');
      if (parseUnits(balance.balance, 6) >= minimum) return balance;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  throw lastError ?? new Error('Funded MCP balance did not become available.');
}

const client = new Client({ name: 'noxswap-mcp-test', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['mcp-server.js'],
  cwd: process.cwd(),
  env: process.env,
  stderr: 'pipe',
});

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name);
  assert.deepEqual(names.sort(), [
    'nox_confidential_swap',
    'nox_create_limit_order',
    'nox_decrypt_balance',
    'nox_get_limit_order',
    'nox_get_market_context',
    'nox_get_pool_handles',
    'nox_manage_limit_order',
    'nox_plan_confidential_order',
    'nox_view_acl',
  ]);

  const market = parseTool(await client.callTool({ name: 'nox_get_market_context', arguments: {} }), 'market context');
  assert.equal(market.chainId, 11155111);
  assert.equal(market.oracleAvailable, true);
  assert(market.ethPriceUsd > 0);

  let strategyPlan = null;
  if (process.env.NOXSWAP_AGENT_API_URL) {
    strategyPlan = parseTool(await client.callTool({
      name: 'nox_plan_confidential_order',
      arguments: { intent: 'Buy cETH with 10 percent of cUSDC if ETH falls 3 percent. Expire in one day.' },
    }), 'confidential strategy plan');
    assert.equal(strategyPlan.plan.action, 'limit_order');
    assert.equal(strategyPlan.meta.provider, 'groq');
  }

  const pools = [];
  for (const poolName of ['cUSDC/cETH', 'cWBTC/cUSDC', 'cSOL/cUSDC']) {
    const poolResponse = await client.callTool({ name: 'nox_get_pool_handles', arguments: { pool: poolName } });
    assert(!poolResponse.isError, `${poolName} pool tool must succeed`);
    const pool = JSON.parse(poolResponse.content[0].text);
    assert.match(pool.reserve0Handle, /^0x[0-9a-f]{64}$/i);
    assert.match(pool.reserve1Handle, /^0x[0-9a-f]{64}$/i);
    pools.push(pool);
  }

  const orderResponse = await client.callTool({ name: 'nox_get_limit_order', arguments: { orderId: 1 } });
  assert(!orderResponse.isError, orderResponse.content[0].text);
  const order = JSON.parse(orderResponse.content[0].text);
  assert.equal(order.orderId, 1);
  assert.match(order.encryptedAmountHandle, /^0x[0-9a-f]{64}$/i);
  assert(['OPEN', 'EXECUTED', 'CANCELLED', 'EXPIRED'].includes(order.status));

  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  assert.equal((await provider.getNetwork()).chainId, 11155111n);
  assert((await provider.getBalance(wallet.address)) > 0n, 'MCP signer needs Sepolia ETH for gas');
  const signerAddress = wallet.address;
  const balanceResponse = await client.callTool({
    name: 'nox_decrypt_balance',
    arguments: { address: signerAddress, tokenSymbol: 'cUSDC' },
  });
  const balance = parseTool(balanceResponse, 'decrypt balance');
  assert.match(balance.encryptedBalanceHandle, /^0x[0-9a-f]{64}$/i);
  assert(Number(balance.balance) >= 0);

  let writeSummary = null;
  if (writeEnabled) {
    const fundingTransaction = await ensureMcpTestFunds(wallet, balance.balance);
    if (fundingTransaction) await waitForMcpBalance(client, wallet.address, parseUnits('0.2', 6));
    const swap = parseTool(await client.callTool({
      name: 'nox_confidential_swap',
      arguments: {
        tokenIn: 'cUSDC',
        tokenOut: 'cETH',
        amount: '0.05',
        minOut: '0.000000000001',
        deadlineMinutes: 20,
      },
    }), 'MCP protected swap');
    assert.equal(swap.status, 'CONFIRMED');
    assert.match(swap.encryptedOutputHandle, /^0x[0-9a-f]{64}$/i);
    assert(Number(swap.decryptedOutput) > 0, 'MCP swap must return confidential output');
    const swapReceipt = await provider.getTransactionReceipt(swap.transactionHash);
    assert.equal(swapReceipt.status, 1);
    const swapInterface = new Interface([
      'event SwapExecuted(address indexed trader,address indexed tokenIn,address indexed tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId,uint64 deadline)',
    ]);
    assert(swapReceipt.logs.some((log) => {
      try { return swapInterface.parseLog(log)?.name === 'SwapExecuted'; } catch { return false; }
    }), 'MCP swap receipt must contain SwapExecuted');

    const created = parseTool(await client.callTool({
      name: 'nox_create_limit_order',
      arguments: {
        side: 'buy-eth',
        amount: '0.1',
        minOut: '0.000000000000000001',
        triggerPriceUsd: '1000',
        expiryMinutes: 30,
      },
    }), 'MCP create order');
    assert.equal(created.status, 'OPEN');
    assert.match(created.encryptedAmountHandle, /^0x[0-9a-f]{64}$/i);
    const openOrder = parseTool(await client.callTool({
      name: 'nox_get_limit_order',
      arguments: { orderId: Number(created.orderId) },
    }), 'MCP read created order');
    assert.equal(openOrder.status, 'OPEN');
    assert.equal(openOrder.encryptedAmountHandle, created.encryptedAmountHandle);

    const cancelled = parseTool(await client.callTool({
      name: 'nox_manage_limit_order',
      arguments: { orderId: Number(created.orderId), action: 'cancel' },
    }), 'MCP cancel order');
    assert.equal(cancelled.status, 'CONFIRMED');
    const cancelledOrder = parseTool(await client.callTool({
      name: 'nox_get_limit_order',
      arguments: { orderId: Number(created.orderId) },
    }), 'MCP read cancelled order');
    assert.equal(cancelledOrder.status, 'CANCELLED');
    const cancelReceipt = await provider.getTransactionReceipt(cancelled.transactionHash);
    assert.equal(cancelReceipt.status, 1);

    const evidence = await createLiveEvidence({
      assertions: {
        swapReceiptConfirmed: true,
        swapEventObserved: true,
        encryptedOutputObserved: true,
        orderCreatedOpen: true,
        orderCancelled: true,
      },
      deployment,
      provider,
      repositoryRoot,
      runnerAddress: wallet.address,
      toolchain: { node: process.version, mcpSdk: '1.29.0', noxSdk: '0.1.0-beta.13' },
      transactions: {
        ...(fundingTransaction ? { testFundsWrapped: fundingTransaction } : {}),
        mcpSwap: swap.transactionHash,
        mcpOrderCreated: created.transactionHash,
        mcpOrderCancelled: cancelled.transactionHash,
      },
      type: 'sepolia-mcp-write-e2e',
    });
    const evidencePath = process.env.MCP_EVIDENCE_FILE
      ?? path.join(rootDir, 'artifacts', 'evidence', 'mcp-write-e2e.json');
    writeEvidence(evidencePath, evidence);
    writeSummary = {
      swapTransaction: swap.transactionHash,
      orderId: created.orderId,
      orderCreateTransaction: created.transactionHash,
      orderCancelTransaction: cancelled.transactionHash,
      evidencePath,
    };
  }

  console.log(JSON.stringify({
    status: 'PASS',
    mode: writeEnabled ? 'WRITE' : 'READ_ONLY',
    tools: names,
    pools: pools.map((pool) => ({ pool: pool.pool, encryptedReservesVerified: true })),
    limitOrder: { orderId: order.orderId, status: order.status },
    market: { oracleAvailable: market.oracleAvailable, ethPriceUsd: market.ethPriceUsd },
    strategyPlan: strategyPlan ? { provider: strategyPlan.meta.provider, supported: strategyPlan.plan.supported } : null,
    signerBalanceVerified: true,
    writeFlow: writeSummary,
  }, null, 2));
} finally {
  await client.close();
}
