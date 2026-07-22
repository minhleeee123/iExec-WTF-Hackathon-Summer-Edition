import 'dotenv/config';

import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Wallet } from 'ethers';

if (!process.env.PRIVATE_KEY) throw new Error('Set PRIVATE_KEY in the environment.');

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
    'nox_get_pool_handles',
    'nox_manage_limit_order',
    'nox_view_acl',
  ]);

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

  const signerAddress = new Wallet(process.env.PRIVATE_KEY).address;
  const balanceResponse = await client.callTool({
    name: 'nox_decrypt_balance',
    arguments: { address: signerAddress, tokenSymbol: 'cETH' },
  });
  assert(!balanceResponse.isError, balanceResponse.content[0].text);
  const balance = JSON.parse(balanceResponse.content[0].text);
  assert.match(balance.encryptedBalanceHandle, /^0x[0-9a-f]{64}$/i);
  assert(Number(balance.balance) >= 0);

  console.log(JSON.stringify({
    status: 'PASS',
    tools: names,
    pools: pools.map((pool) => ({ pool: pool.pool, reserveHandles: [pool.reserve0Handle, pool.reserve1Handle] })),
    limitOrder: { orderId: order.orderId, status: order.status },
    decryptedBalance: `${balance.balance} ${balance.tokenSymbol}`,
  }, null, 2));
} finally {
  await client.close();
}
