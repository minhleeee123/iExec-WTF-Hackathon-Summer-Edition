import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits } from 'ethers';
import { requestStrategyPlan } from './lib/agent-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployment = JSON.parse(fs.readFileSync(path.join(__dirname, 'deployment-sepolia.json'), 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const writesEnabled = process.env.MCP_ALLOW_WRITES === 'true';
const agentEndpoint = process.env.NOXSWAP_AGENT_API_URL ?? '';

const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
const wallet = privateKey ? new Wallet(privateKey, provider) : null;
const addresses = deployment.contracts;
const tokens = {
  cUSDC: { address: addresses.cUSDC, decimals: 6 },
  cETH: { address: addresses.cETH, decimals: 18 },
  cWBTC: { address: addresses.cWBTC, decimals: 8 },
  cSOL: { address: addresses.cSOL, decimals: 9 },
};
const tokenSymbols = Object.keys(tokens);
const poolPairs = {
  'cUSDC/cETH': ['cUSDC', 'cETH'],
  'cWBTC/cUSDC': ['cWBTC', 'cUSDC'],
  'cSOL/cUSDC': ['cSOL', 'cUSDC'],
};

const routerAbi = [
  'function confidentialSwap(address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes inputProof,bytes32 encryptedMinOut,bytes minOutProof,uint64 deadline) returns (bytes32 encryptedAmountOut,bytes32 encryptedRefund,uint256 receiptId)',
  'function getPoolHandles(address tokenA,address tokenB) view returns (address token0,address token1,bytes32 reserve0,bytes32 reserve1)',
  'event SwapExecuted(address indexed trader,address indexed tokenIn,address indexed tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId,uint64 deadline)',
];
const orderAbi = [
  'function createOrder(address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes amountProof,bytes32 encryptedMinOut,bytes minOutProof,uint256 triggerPrice,uint64 expiry) returns (uint256 orderId)',
  'function executeOrder(uint256 orderId) returns (bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'function cancelOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
  'function expireOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
  'function getOrder(uint256 orderId) view returns (address owner,address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes32 encryptedMinOut,uint256 triggerPrice,uint64 expiry,uint8 status)',
  'event OrderCreated(uint256 indexed orderId,address indexed owner,address indexed tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes32 encryptedMinOut,uint256 triggerPrice,uint64 expiry)',
  'event OrderExecuted(uint256 indexed orderId,address indexed executor,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'event OrderCancelled(uint256 indexed orderId,bytes32 encryptedRefund)',
  'event OrderExpired(uint256 indexed orderId,bytes32 encryptedRefund)',
];
const tokenAbi = [
  'function confidentialBalanceOf(address account) view returns (bytes32)',
  'function isOperator(address holder,address spender) view returns (bool)',
  'function setOperator(address operator,uint48 until)',
];
const feedAbi = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
];

let handleClientPromise;
const getHandleClient = () => {
  if (!wallet) throw new Error('Set PRIVATE_KEY to use signer-authorized Nox tools.');
  handleClientPromise ??= createEthersHandleClient(wallet);
  return handleClientPromise;
};

const requireWriteAccess = () => {
  if (!wallet) throw new Error('Set PRIVATE_KEY to use MCP write tools.');
  if (!writesEnabled) throw new Error('MCP write tools are disabled. Set MCP_ALLOW_WRITES=true after reviewing the requested transaction.');
};

const getMarketContext = async () => {
  const feed = new Contract(deployment.feeds.ethUsd, feedAbi, provider);
  const [block, decimals, round] = await Promise.all([
    provider.getBlock('latest'),
    feed.decimals(),
    feed.latestRoundData(),
  ]);
  if (!block) throw new Error('Latest Sepolia block is unavailable.');
  const updatedAt = Number(round.updatedAt);
  const available = round.answer > 0n
    && round.answeredInRound >= round.roundId
    && updatedAt <= block.timestamp
    && block.timestamp - updatedAt <= 3600;
  return {
    network: 'ethereum-sepolia',
    chainId: 11155111,
    ethPriceUsd: Number(formatUnits(round.answer, decimals)),
    oracleUpdatedAt: updatedAt,
    blockTimestamp: Number(block.timestamp),
    oracleAvailable: available,
  };
};

const jsonText = (value) => ({
  content: [{
    type: 'text',
    text: JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2),
  }],
});

const getToken = (symbol) => {
  const token = tokens[symbol];
  if (!token) throw new Error(`Unsupported token ${symbol}. Supported tokens: ${tokenSymbols.join(', ')}.`);
  return token;
};

const isSupportedSwapPair = (tokenIn, tokenOut) => Object.values(poolPairs)
  .some(([left, right]) => (tokenIn === left && tokenOut === right) || (tokenIn === right && tokenOut === left));

const parseEvent = (contract, receipt, eventName) => receipt.logs
  .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
  .find((item) => item?.name === eventName);

const decryptWithRetry = async (client, handle) => {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try { return await client.decrypt(handle); } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw lastError;
};

const server = new Server(
  { name: 'noxswap-mcp-server', version: '4.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'nox_get_market_context',
      description: 'Read the current public Sepolia block time and Chainlink ETH/USD context. No wallet or private data is required.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'nox_plan_confidential_order',
      description: 'Send a natural-language intent plus public Chainlink context to the configured NoxSwap Groq planner. Wallet address, balances, handles, proofs, and keys are never sent.',
      inputSchema: {
        type: 'object',
        properties: {
          intent: { type: 'string', minLength: 8, maxLength: 600 },
        },
        required: ['intent'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_confidential_swap',
      description: 'Encrypt an amount with the iExec Nox Handle SDK and execute a real NoxSwap transaction on Ethereum Sepolia.',
      inputSchema: {
        type: 'object',
        properties: {
          tokenIn: { type: 'string', enum: tokenSymbols },
          tokenOut: { type: 'string', enum: tokenSymbols },
          amount: { type: 'string', description: 'Decimal token amount, for example "100".' },
          minOut: { type: 'string', description: 'Positive encrypted minimum output.' },
          deadlineMinutes: { type: 'integer', minimum: 1, maximum: 1440, default: 20 },
        },
        required: ['tokenIn', 'tokenOut', 'amount', 'minOut'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_decrypt_balance',
      description: 'Read and decrypt the MCP signer wallet ERC-7984 balance using its Nox ACL authorization and EIP-712 signature.',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Must match the configured MCP signer address.' },
          tokenSymbol: { type: 'string', enum: tokenSymbols },
        },
        required: ['address', 'tokenSymbol'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_view_acl',
      description: 'Read the indexed Nox access control list for a bytes32 encrypted handle.',
      inputSchema: {
        type: 'object',
        properties: { handle: { type: 'string', pattern: '^0x[0-9a-fA-F]{64}$' } },
        required: ['handle'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_get_pool_handles',
      description: 'Read the live encrypted reserve handles for one deployed pool.',
      inputSchema: {
        type: 'object',
        properties: { pool: { type: 'string', enum: Object.keys(poolPairs), default: 'cUSDC/cETH' } },
        additionalProperties: false,
      },
    },
    {
      name: 'nox_create_limit_order',
      description: 'Encrypt and escrow a real cUSDC/cETH Chainlink-triggered limit order on Ethereum Sepolia.',
      inputSchema: {
        type: 'object',
        properties: {
          side: { type: 'string', enum: ['buy-eth', 'sell-eth'] },
          amount: { type: 'string' },
          minOut: { type: 'string' },
          triggerPriceUsd: { type: 'string' },
          expiryMinutes: { type: 'integer', minimum: 1, maximum: 10080 },
        },
        required: ['side', 'amount', 'minOut', 'triggerPriceUsd', 'expiryMinutes'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_get_limit_order',
      description: 'Read one live confidential limit order. Amount fields remain encrypted handles.',
      inputSchema: {
        type: 'object',
        properties: { orderId: { type: 'integer', minimum: 1 } },
        required: ['orderId'],
        additionalProperties: false,
      },
    },
    {
      name: 'nox_manage_limit_order',
      description: 'Execute, cancel, or refund an expired live confidential limit order on Ethereum Sepolia.',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'integer', minimum: 1 },
          action: { type: 'string', enum: ['execute', 'cancel', 'expire'] },
        },
        required: ['orderId', 'action'],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    if (name === 'nox_get_market_context') {
      return jsonText(await getMarketContext());
    }

    if (name === 'nox_plan_confidential_order') {
      const market = await getMarketContext();
      if (!market.oracleAvailable) throw new Error('Chainlink ETH/USD is stale or invalid; strategy planning is unavailable.');
      const result = await requestStrategyPlan({
        endpoint: agentEndpoint,
        intent: args.intent,
        market: {
          ethPriceUsd: market.ethPriceUsd,
          oracleUpdatedAt: market.oracleUpdatedAt,
          blockTimestamp: market.blockTimestamp,
        },
      });
      return jsonText({
        ...result,
        market: {
          network: market.network,
          ethPriceUsd: market.ethPriceUsd,
          oracleUpdatedAt: market.oracleUpdatedAt,
          blockTimestamp: market.blockTimestamp,
        },
        transactionAuthority: 'No transaction was sent. A signer must explicitly invoke a write tool.',
      });
    }

    if (name === 'nox_confidential_swap') {
      requireWriteAccess();
      const input = getToken(args.tokenIn);
      const output = getToken(args.tokenOut);
      if (input.address === output.address) throw new Error('Input and output tokens must differ.');
      if (!isSupportedSwapPair(args.tokenIn, args.tokenOut)) throw new Error('No encrypted pool exists for this pair.');
      const amount = parseUnits(args.amount, input.decimals);
      const minimumOutput = parseUnits(args.minOut, output.decimals);
      const deadlineMinutes = args.deadlineMinutes ?? 20;
      if (amount <= 0n || minimumOutput <= 0n) throw new Error('Amount and minOut must be greater than zero.');
      if (!Number.isInteger(deadlineMinutes) || deadlineMinutes < 1 || deadlineMinutes > 1440) {
        throw new Error('deadlineMinutes must be between 1 and 1440.');
      }

      const inputContract = new Contract(input.address, tokenAbi, wallet);
      if (!(await inputContract.isOperator(wallet.address, addresses.noxSwapRouter))) {
        const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
        await (await inputContract.setOperator(addresses.noxSwapRouter, expiry)).wait();
      }

      const handleClient = await getHandleClient();
      const [encrypted, encryptedMinimum] = await Promise.all([
        handleClient.encryptInput(amount, 'uint256', addresses.noxSwapRouter),
        handleClient.encryptInput(minimumOutput, 'uint256', addresses.noxSwapRouter),
      ]);
      const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;
      const router = new Contract(addresses.noxSwapRouter, routerAbi, wallet);
      const transaction = await router.confidentialSwap(
        input.address,
        output.address,
        encrypted.handle,
        encrypted.handleProof,
        encryptedMinimum.handle,
        encryptedMinimum.handleProof,
        deadline,
      );
      const receipt = await transaction.wait();
      const event = parseEvent(router, receipt, 'SwapExecuted');
      if (!event) throw new Error('SwapExecuted event was not emitted.');
      const [decryptedOutput, decryptedRefund] = await Promise.all([
        decryptWithRetry(handleClient, event.args.encryptedOutput),
        decryptWithRetry(handleClient, event.args.encryptedRefund),
      ]);

      return jsonText({
        status: 'CONFIRMED',
        network: 'ethereum-sepolia',
        transactionHash: receipt.hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
        encryptedInputHandle: encrypted.handle,
        inputProofBytes: (encrypted.handleProof.length - 2) / 2,
        encryptedMinOutHandle: encryptedMinimum.handle,
        minOutProofBytes: (encryptedMinimum.handleProof.length - 2) / 2,
        encryptedOutputHandle: event.args.encryptedOutput,
        encryptedRefundHandle: event.args.encryptedRefund,
        decryptedOutput: formatUnits(decryptedOutput.value, output.decimals),
        decryptedRefund: formatUnits(decryptedRefund.value, input.decimals),
        outputToken: args.tokenOut,
        receiptId: event.args.receiptId,
        deadline,
      });
    }

    if (name === 'nox_decrypt_balance') {
      if (!wallet) throw new Error('Set PRIVATE_KEY to decrypt signer-authorized balances.');
      if (args.address.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(`This MCP signer can only decrypt its own balances (${wallet.address}).`);
      }
      const token = getToken(args.tokenSymbol);
      const contract = new Contract(token.address, tokenAbi, provider);
      const handle = await contract.confidentialBalanceOf(wallet.address);
      if (handle === `0x${'0'.repeat(64)}`) {
        return jsonText({
          address: wallet.address,
          tokenSymbol: args.tokenSymbol,
          encryptedBalanceHandle: handle,
          balance: '0',
          network: 'ethereum-sepolia',
        });
      }
      const decrypted = await (await getHandleClient()).decrypt(handle);
      return jsonText({
        address: wallet.address,
        tokenSymbol: args.tokenSymbol,
        encryptedBalanceHandle: handle,
        balance: formatUnits(decrypted.value, token.decimals),
        solidityType: decrypted.solidityType,
        network: 'ethereum-sepolia',
      });
    }

    if (name === 'nox_view_acl') {
      return jsonText({ handle: args.handle, ...await (await getHandleClient()).viewACL(args.handle) });
    }

    if (name === 'nox_get_pool_handles') {
      const router = new Contract(addresses.noxSwapRouter, routerAbi, provider);
      const poolName = args.pool ?? 'cUSDC/cETH';
      const pair = poolPairs[poolName];
      if (!pair) throw new Error(`Unknown pool ${poolName}.`);
      const pool = await router.getPoolHandles(tokens[pair[0]].address, tokens[pair[1]].address);
      return jsonText({
        pool: poolName,
        router: addresses.noxSwapRouter,
        token0: pool.token0,
        token1: pool.token1,
        reserve0Handle: pool.reserve0,
        reserve1Handle: pool.reserve1,
        liquidityTransaction: deployment.pools[poolName.replace('/', '_')].liquidityTransaction,
      });
    }

    if (name === 'nox_create_limit_order') {
      requireWriteAccess();
      const inputSymbol = args.side === 'buy-eth' ? 'cUSDC' : 'cETH';
      const outputSymbol = args.side === 'buy-eth' ? 'cETH' : 'cUSDC';
      const input = tokens[inputSymbol];
      const output = tokens[outputSymbol];
      const amount = parseUnits(args.amount, input.decimals);
      const minimumOutput = parseUnits(args.minOut, output.decimals);
      const triggerPrice = parseUnits(args.triggerPriceUsd, 8);
      if (amount <= 0n || minimumOutput <= 0n || triggerPrice <= 0n) {
        throw new Error('Amount, minOut, and trigger price must be greater than zero.');
      }
      if (!Number.isInteger(args.expiryMinutes) || args.expiryMinutes < 1 || args.expiryMinutes > 10080) {
        throw new Error('expiryMinutes must be between 1 and 10080.');
      }
      const inputContract = new Contract(input.address, tokenAbi, wallet);
      if (!(await inputContract.isOperator(wallet.address, addresses.limitOrderBook))) {
        await (await inputContract.setOperator(addresses.limitOrderBook, BigInt('281474976710655'))).wait();
      }
      const handleClient = await getHandleClient();
      const [encryptedAmount, encryptedMinimum] = await Promise.all([
        handleClient.encryptInput(amount, 'uint256', addresses.limitOrderBook),
        handleClient.encryptInput(minimumOutput, 'uint256', addresses.limitOrderBook),
      ]);
      const expiry = Math.floor(Date.now() / 1000) + args.expiryMinutes * 60;
      const orderBook = new Contract(addresses.limitOrderBook, orderAbi, wallet);
      const transaction = await orderBook.createOrder(
        input.address,
        output.address,
        encryptedAmount.handle,
        encryptedAmount.handleProof,
        encryptedMinimum.handle,
        encryptedMinimum.handleProof,
        triggerPrice,
        expiry,
      );
      const receipt = await transaction.wait();
      const event = parseEvent(orderBook, receipt, 'OrderCreated');
      if (!event) throw new Error('OrderCreated event was not emitted.');
      return jsonText({
        status: 'OPEN',
        network: 'ethereum-sepolia',
        orderId: event.args.orderId,
        owner: wallet.address,
        inputToken: inputSymbol,
        outputToken: outputSymbol,
        encryptedAmountHandle: event.args.encryptedAmountIn,
        encryptedMinOutHandle: event.args.encryptedMinOut,
        triggerPriceUsd: args.triggerPriceUsd,
        expiry,
        transactionHash: receipt.hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
      });
    }

    if (name === 'nox_get_limit_order') {
      const orderBook = new Contract(addresses.limitOrderBook, orderAbi, provider);
      const order = await orderBook.getOrder(args.orderId);
      const symbolFor = (address) => tokenSymbols.find((symbol) => tokens[symbol].address.toLowerCase() === address.toLowerCase());
      return jsonText({
        orderId: args.orderId,
        owner: order.owner,
        inputToken: symbolFor(order.tokenIn),
        outputToken: symbolFor(order.tokenOut),
        encryptedAmountHandle: order.encryptedAmountIn,
        encryptedMinOutHandle: order.encryptedMinOut,
        triggerPriceUsd: formatUnits(order.triggerPrice, 8),
        expiry: Number(order.expiry),
        status: ['OPEN', 'EXECUTED', 'CANCELLED', 'EXPIRED'][Number(order.status)],
      });
    }

    if (name === 'nox_manage_limit_order') {
      requireWriteAccess();
      const orderBook = new Contract(addresses.limitOrderBook, orderAbi, wallet);
      const method = { execute: 'executeOrder', cancel: 'cancelOrder', expire: 'expireOrder' }[args.action];
      if (!method) throw new Error(`Unknown limit order action ${args.action}.`);
      const transaction = await orderBook[method](args.orderId);
      const receipt = await transaction.wait();
      const eventName = { execute: 'OrderExecuted', cancel: 'OrderCancelled', expire: 'OrderExpired' }[args.action];
      const event = parseEvent(orderBook, receipt, eventName);
      if (!event) throw new Error(`${eventName} event was not emitted.`);
      return jsonText({
        status: 'CONFIRMED',
        action: args.action,
        orderId: args.orderId,
        encryptedOutputHandle: event.args.encryptedOutput ?? null,
        encryptedRefundHandle: event.args.encryptedRefund,
        receiptId: event.args.receiptId ?? null,
        transactionHash: receipt.hash,
        explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
      });
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: error.shortMessage ?? error.message ?? String(error) }],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`NoxSwap MCP v4 connected on stdio as ${wallet?.address ?? 'read-only'}; writes ${writesEnabled ? 'enabled' : 'disabled'}`);
