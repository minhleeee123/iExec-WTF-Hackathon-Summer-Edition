import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('stdio server boots read-only and exposes the nine reviewed tools', async () => {
  const appRoot = path.resolve(import.meta.dirname, '..');
  const client = new Client({ name: 'noxswap-mcp-unit', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/server.js'],
    cwd: appRoot,
    env: {
      ...process.env,
      MCP_ALLOW_WRITES: 'false',
      PRIVATE_KEY: '',
    },
    stderr: 'pipe',
  });
  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.deepEqual(response.tools.map((tool) => tool.name).sort(), [
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
  } finally {
    await client.close();
  }
});
