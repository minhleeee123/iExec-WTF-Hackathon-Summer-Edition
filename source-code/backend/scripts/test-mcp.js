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
    'nox_decrypt_balance',
    'nox_get_pool_handles',
    'nox_view_acl',
  ]);
  assert(!names.includes('nox_create_limit_order'), 'Fake limit-order tool must not be exposed');

  const poolResponse = await client.callTool({ name: 'nox_get_pool_handles', arguments: {} });
  assert(!poolResponse.isError, 'Pool tool must succeed');
  const pool = JSON.parse(poolResponse.content[0].text);
  assert.match(pool.reserve0Handle, /^0x[0-9a-f]{64}$/i);
  assert.match(pool.reserve1Handle, /^0x[0-9a-f]{64}$/i);

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
    poolReserveHandles: [pool.reserve0Handle, pool.reserve1Handle],
    decryptedBalance: `${balance.balance} ${balance.tokenSymbol}`,
  }, null, 2));
} finally {
  await client.close();
}
