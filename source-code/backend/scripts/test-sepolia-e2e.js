import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
const artifact = (name) => readJson(path.join('artifacts', 'contracts', `${name}.sol`, `${name}.json`));

async function send(label, transactionPromise) {
  const transaction = await transactionPromise;
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1, `${label} must succeed`);
  console.log(`${label}: ${transaction.hash}`);
  return receipt;
}

function eventFrom(contract, receipt, name) {
  return receipt.logs
    .map((log) => {
      try { return contract.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === name);
}

async function decryptWithRetry(client, handle, attempts = 12) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.decrypt(handle);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw lastError;
}

async function publicDecryptWithRetry(client, handle) {
  return decryptWithRetry({ decrypt: (value) => client.publicDecrypt(value) }, handle);
}

async function waitForAcl(client, handle, expectedAccount, attempts = 12) {
  let latest;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      latest = await client.viewACL(handle);
      const authorized = [...latest.admins, ...latest.viewers].map((account) => account.toLowerCase());
      if (authorized.includes(expectedAccount.toLowerCase())) return latest;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw lastError ?? new Error(`ACL did not index ${expectedAccount}: ${JSON.stringify(latest)}`);
}

async function ensureWrapped({ underlying, wrapper, wrapperAddress, amount, label, walletAddress }) {
  let balance = await underlying.balanceOf(walletAddress);
  if (balance < amount) {
    await send(`${label} faucet`, underlying.faucet());
    balance = await underlying.balanceOf(walletAddress);
  }
  assert(balance >= amount, `${label} faucet must cover the test amount`);
  await send(`Approve ${label} wrapper`, underlying.approve(wrapperAddress, amount));
  await send(`Wrap ${label}`, wrapper.wrap(walletAddress, amount));
}

async function protectedSwap({
  router,
  client,
  tokenIn,
  tokenOut,
  amountIn,
  minOut,
  label,
}) {
  const routerAddress = await router.getAddress();
  const amount = await client.encryptInput(amountIn, 'uint256', routerAddress);
  const minimum = await client.encryptInput(minOut, 'uint256', routerAddress);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  const receipt = await send(
    label,
    router.confidentialSwap(
      tokenIn,
      tokenOut,
      amount.handle,
      amount.handleProof,
      minimum.handle,
      minimum.handleProof,
      deadline,
    ),
  );
  const event = eventFrom(router, receipt, 'SwapExecuted');
  assert(event, `${label} must emit SwapExecuted`);
  const [output, refund] = await Promise.all([
    decryptWithRetry(client, event.args.encryptedOutput),
    decryptWithRetry(client, event.args.encryptedRefund),
  ]);
  return { receipt, event, output: output.value, refund: refund.value };
}

async function main() {
  const deployment = readJson('deployment-sepolia.json');
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  assert.equal(network.chainId, 11155111n);
  assert.equal(wallet.address, deployment.deployer);

  for (const [name, address] of Object.entries(deployment.contracts)) {
    assert.notEqual(await provider.getCode(address), '0x', `${name} must have deployed bytecode`);
  }
  console.log('Deployment bytecode: PASS');

  const tokenAbi = artifact('NoxTestToken').abi;
  const wrapperAbi = artifact('NoxConfidentialToken').abi;
  const routerAbi = artifact('NoxSwap').abi;
  const orderAbi = artifact('NoxLimitOrderBook').abi;
  const addresses = deployment.contracts;
  const client = await createEthersHandleClient(wallet);

  const underlying = {
    cUSDC: new Contract(addresses.underlyingUSDC, tokenAbi, wallet),
    cETH: new Contract(addresses.underlyingWETH, tokenAbi, wallet),
    cWBTC: new Contract(addresses.underlyingWBTC, tokenAbi, wallet),
    cSOL: new Contract(addresses.underlyingSOL, tokenAbi, wallet),
  };
  const wrappers = {
    cUSDC: new Contract(addresses.cUSDC, wrapperAbi, wallet),
    cETH: new Contract(addresses.cETH, wrapperAbi, wallet),
    cWBTC: new Contract(addresses.cWBTC, wrapperAbi, wallet),
    cSOL: new Contract(addresses.cSOL, wrapperAbi, wallet),
  };
  const router = new Contract(addresses.noxSwapRouter, routerAbi, wallet);
  const orderBook = new Contract(addresses.limitOrderBook, orderAbi, wallet);
  const operatorExpiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

  for (const pool of Object.values(deployment.pools)) {
    const handles = await router.getPoolHandles(pool.token0, pool.token1);
    assert.notEqual(handles.reserve0, '0x'.padEnd(66, '0'));
    assert.notEqual(handles.reserve1, '0x'.padEnd(66, '0'));
  }
  console.log('Three encrypted pools: PASS');

  await ensureWrapped({
    underlying: underlying.cUSDC,
    wrapper: wrappers.cUSDC,
    wrapperAddress: addresses.cUSDC,
    amount: parseUnits('120', 6),
    label: 'nUSDC to cUSDC',
    walletAddress: wallet.address,
  });
  await send('Authorize Router V2 for test cUSDC', wrappers.cUSDC.setOperator(addresses.noxSwapRouter, operatorExpiry));

  const successful = await protectedSwap({
    router,
    client,
    tokenIn: addresses.cUSDC,
    tokenOut: addresses.cETH,
    amountIn: parseUnits('100', 6),
    minOut: parseUnits('0.04', 18),
    label: 'Protected cUSDC/cETH swap',
  });
  assert(successful.output >= parseUnits('0.04', 18), 'Protected output must meet minOut');
  assert.equal(successful.refund, 0n, 'Successful swap must not refund input');
  assert.equal(await router.ownerOf(successful.event.args.receiptId), wallet.address);

  const rejected = await protectedSwap({
    router,
    client,
    tokenIn: addresses.cUSDC,
    tokenOut: addresses.cETH,
    amountIn: parseUnits('1', 6),
    minOut: parseUnits('1', 18),
    label: 'Reject and refund protected swap',
  });
  assert.equal(rejected.output, 0n, 'Rejected protected swap must output zero');
  assert.equal(rejected.refund, parseUnits('1', 6), 'Rejected protected swap must refund all input');

  const assetSwaps = [];
  for (const asset of [
    { symbol: 'cWBTC', amount: parseUnits('0.01', 8), decimals: 8 },
    { symbol: 'cSOL', amount: parseUnits('1', 9), decimals: 9 },
  ]) {
    await ensureWrapped({
      underlying: underlying[asset.symbol],
      wrapper: wrappers[asset.symbol],
      wrapperAddress: addresses[asset.symbol],
      amount: asset.amount,
      label: `${asset.symbol.slice(1)} to ${asset.symbol}`,
      walletAddress: wallet.address,
    });
    await send(`Authorize Router V2 for ${asset.symbol}`, wrappers[asset.symbol].setOperator(addresses.noxSwapRouter, operatorExpiry));
    const result = await protectedSwap({
      router,
      client,
      tokenIn: addresses[asset.symbol],
      tokenOut: addresses.cUSDC,
      amountIn: asset.amount,
      minOut: 0n,
      label: `Protected ${asset.symbol}/cUSDC swap`,
    });
    assert(result.output > 0n, `${asset.symbol} pool must return cUSDC`);
    assetSwaps.push({ symbol: asset.symbol, input: formatUnits(asset.amount, asset.decimals), output: formatUnits(result.output, 6) });
  }

  await send('Authorize LimitOrderBook for cUSDC', wrappers.cUSDC.setOperator(addresses.limitOrderBook, operatorExpiry));
  const feed = new Contract(deployment.feeds.ethUsd, [
    'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
  ], provider);
  const round = await feed.latestRoundData();
  const triggerPrice = BigInt(round[1]) + 100_000_000n;
  const limitExpiry = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
  const orderAmount = parseUnits('5', 6);
  const orderMinOut = parseUnits('0.001', 18);
  const encryptedOrderAmount = await client.encryptInput(orderAmount, 'uint256', addresses.limitOrderBook);
  const encryptedOrderMin = await client.encryptInput(orderMinOut, 'uint256', addresses.limitOrderBook);
  const createReceipt = await send(
    'Create confidential limit order',
    orderBook.createOrder(
      addresses.cUSDC,
      addresses.cETH,
      encryptedOrderAmount.handle,
      encryptedOrderAmount.handleProof,
      encryptedOrderMin.handle,
      encryptedOrderMin.handleProof,
      triggerPrice,
      limitExpiry,
    ),
  );
  const created = eventFrom(orderBook, createReceipt, 'OrderCreated');
  assert(created, 'OrderCreated must be emitted');
  const orderId = created.args.orderId;
  const executable = await orderBook.canExecute(orderId);
  assert.equal(executable.executable, true, 'Test order trigger must be executable');
  const executionReceipt = await send('Execute confidential limit order', orderBook.executeOrder(orderId));
  const executed = eventFrom(orderBook, executionReceipt, 'OrderExecuted');
  assert(executed, 'OrderExecuted must be emitted');
  const orderOutput = await decryptWithRetry(client, executed.args.encryptedOutput);
  const orderRefund = await decryptWithRetry(client, executed.args.encryptedRefund);
  assert(orderOutput.value >= orderMinOut, 'Limit order output must meet encrypted minOut');
  assert.equal(orderRefund.value, 0n, 'Filled limit order must not refund input');
  assert.equal((await orderBook.getOrder(orderId)).status, 1n, 'Order status must be Executed');

  const cancelAmount = parseUnits('2', 6);
  const encryptedCancelAmount = await client.encryptInput(cancelAmount, 'uint256', addresses.limitOrderBook);
  const encryptedCancelMin = await client.encryptInput(0n, 'uint256', addresses.limitOrderBook);
  const cancelCreateReceipt = await send(
    'Create cancellable confidential order',
    orderBook.createOrder(
      addresses.cUSDC,
      addresses.cETH,
      encryptedCancelAmount.handle,
      encryptedCancelAmount.handleProof,
      encryptedCancelMin.handle,
      encryptedCancelMin.handleProof,
      1n,
      limitExpiry,
    ),
  );
  const cancelOrderId = eventFrom(orderBook, cancelCreateReceipt, 'OrderCreated').args.orderId;
  const cancelReceipt = await send('Cancel confidential limit order', orderBook.cancelOrder(cancelOrderId));
  const cancelled = eventFrom(orderBook, cancelReceipt, 'OrderCancelled');
  const cancelRefund = await decryptWithRetry(client, cancelled.args.encryptedRefund);
  assert.equal(cancelRefund.value, cancelAmount, 'Cancellation must refund the full encrypted amount');
  assert.equal((await orderBook.getOrder(cancelOrderId)).status, 2n, 'Order status must be Cancelled');

  const auditor = '0x000000000000000000000000000000000000dEaD';
  const currentUsdcHandle = await wrappers.cUSDC.confidentialBalanceOf(wallet.address);
  await send('Grant cUSDC balance viewer', wrappers.cUSDC.grantBalanceViewer(auditor));
  await waitForAcl(client, currentUsdcHandle, auditor);

  const unwrapAmount = parseUnits('0.01', 18);
  const publicWethBefore = await underlying.cETH.balanceOf(wallet.address);
  const encryptedUnwrap = await client.encryptInput(unwrapAmount, 'uint256', addresses.cETH);
  const unwrapReceipt = await send(
    'Request confidential unwrap',
    wrappers.cETH['unwrap(address,address,bytes32,bytes)'](
      wallet.address,
      wallet.address,
      encryptedUnwrap.handle,
      encryptedUnwrap.handleProof,
    ),
  );
  const unwrapEvent = eventFrom(wrappers.cETH, unwrapReceipt, 'UnwrapRequested');
  const publicDecryption = await publicDecryptWithRetry(client, unwrapEvent.args.amount);
  assert.equal(publicDecryption.value, unwrapAmount);
  await send(
    'Finalize confidential unwrap',
    wrappers.cETH.finalizeUnwrap(unwrapEvent.args.amount, publicDecryption.decryptionProof),
  );
  assert.equal(await underlying.cETH.balanceOf(wallet.address) - publicWethBefore, unwrapAmount);

  console.log(JSON.stringify({
    status: 'PASS',
    chainId: Number(network.chainId),
    protectedSwap: {
      transaction: successful.receipt.hash,
      output: `${formatUnits(successful.output, 18)} cETH`,
      refund: formatUnits(successful.refund, 6),
    },
    rejectedSwap: {
      transaction: rejected.receipt.hash,
      output: formatUnits(rejected.output, 18),
      refund: `${formatUnits(rejected.refund, 6)} cUSDC`,
    },
    assetSwaps,
    limitOrder: { orderId: orderId.toString(), transaction: executionReceipt.hash, filled: true },
    cancelledOrder: { orderId: cancelOrderId.toString(), refunded: `${formatUnits(cancelRefund.value, 6)} cUSDC` },
    selectiveViewerConfirmed: auditor,
    unwrappedUnderlying: `${formatUnits(unwrapAmount, 18)} nWETH`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
