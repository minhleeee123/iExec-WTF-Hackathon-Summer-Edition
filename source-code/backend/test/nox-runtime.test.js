import assert from 'node:assert/strict';
import test from 'node:test';

const enabled = process.env.NOX_RUNTIME_TESTS === 'true';

function eventFrom(contract, receipt, name) {
  return receipt.logs
    .map((log) => { try { return contract.interface.parseLog(log); } catch { return null; } })
    .find((event) => event?.name === name);
}

async function wait(transactionPromise) {
  const transaction = await transactionPromise;
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1);
  return receipt;
}

test('Nox runtime settles confidential swap, order lifecycle, and unwrap proof', { skip: !enabled, timeout: 180_000 }, async () => {
  const [{ network }, { nox }] = await Promise.all([
    import('hardhat'),
    import('@iexec-nox/nox-hardhat-plugin'),
  ]);
  const { ethers } = await network.create('noxLocal');
  const [owner, keeper] = await ethers.getSigners();
  const ownerAddress = await owner.getAddress();

  const usdc = await ethers.deployContract('NoxTestToken', [
    'Runtime USD Coin', 'rUSDC', 6, ethers.parseUnits('2000', 6),
  ]);
  const weth = await ethers.deployContract('NoxTestToken', [
    'Runtime Wrapped Ether', 'rWETH', 18, ethers.parseUnits('20', 18),
  ]);
  await Promise.all([usdc.waitForDeployment(), weth.waitForDeployment()]);
  const cUsdc = await ethers.deployContract('NoxConfidentialToken', [
    'Runtime Confidential USD', 'rcUSDC', await usdc.getAddress(),
  ]);
  const cEth = await ethers.deployContract('NoxConfidentialToken', [
    'Runtime Confidential ETH', 'rcETH', await weth.getAddress(),
  ]);
  const router = await ethers.deployContract('NoxSwap');
  await Promise.all([cUsdc.waitForDeployment(), cEth.waitForDeployment(), router.waitForDeployment()]);

  const cUsdcAddress = await cUsdc.getAddress();
  const cEthAddress = await cEth.getAddress();
  const routerAddress = await router.getAddress();
  const wrappedUsdc = ethers.parseUnits('1100', 6);
  const wrappedEth = ethers.parseUnits('11', 18);
  await wait(usdc.faucet());
  await wait(weth.faucet());
  await wait(usdc.approve(cUsdcAddress, wrappedUsdc));
  await wait(weth.approve(cEthAddress, wrappedEth));
  await wait(cUsdc.wrap(ownerAddress, wrappedUsdc));
  await wait(cEth.wrap(ownerAddress, wrappedEth));
  await wait(cUsdc.setOperator(routerAddress, 281474976710655n));
  await wait(cEth.setOperator(routerAddress, 281474976710655n));

  const liquidityUsdc = ethers.parseUnits('1000', 6);
  const liquidityEth = ethers.parseUnits('10', 18);
  const [encryptedLiquidityUsdc, encryptedLiquidityEth] = await Promise.all([
    nox.encryptInput(liquidityUsdc, 'uint256', routerAddress),
    nox.encryptInput(liquidityEth, 'uint256', routerAddress),
  ]);
  await wait(router.addLiquidity(
    cUsdcAddress,
    cEthAddress,
    encryptedLiquidityUsdc.handle,
    encryptedLiquidityUsdc.handleProof,
    encryptedLiquidityEth.handle,
    encryptedLiquidityEth.handleProof,
  ));
  const initialPool = await router.getPoolHandles(cUsdcAddress, cEthAddress);
  const [initialReserve0, initialReserve1] = await Promise.all([
    nox.decrypt(initialPool.reserve0),
    nox.decrypt(initialPool.reserve1),
  ]);
  const initialReserves = new Map([
    [initialPool.token0.toLowerCase(), initialReserve0.value],
    [initialPool.token1.toLowerCase(), initialReserve1.value],
  ]);
  assert.equal(initialReserves.get(cUsdcAddress.toLowerCase()), liquidityUsdc);
  assert.equal(initialReserves.get(cEthAddress.toLowerCase()), liquidityEth);
  assert.equal(await usdc.balanceOf(cUsdcAddress), wrappedUsdc);
  assert.equal(await weth.balanceOf(cEthAddress), wrappedEth);

  const swapAmount = ethers.parseUnits('10', 6);
  const swapMinOut = ethers.parseUnits('0.09', 18);
  const [encryptedSwap, encryptedSwapMin] = await Promise.all([
    nox.encryptInput(swapAmount, 'uint256', routerAddress),
    nox.encryptInput(swapMinOut, 'uint256', routerAddress),
  ]);
  const latestBlock = await ethers.provider.getBlock('latest');
  const swapReceipt = await wait(router.confidentialSwap(
    cUsdcAddress,
    cEthAddress,
    encryptedSwap.handle,
    encryptedSwap.handleProof,
    encryptedSwapMin.handle,
    encryptedSwapMin.handleProof,
    latestBlock.timestamp + 3600,
  ));
  const swapEvent = eventFrom(router, swapReceipt, 'SwapExecuted');
  assert(swapEvent);
  const [swapOutput, swapRefund] = await Promise.all([
    nox.decrypt(swapEvent.args.encryptedOutput),
    nox.decrypt(swapEvent.args.encryptedRefund),
  ]);
  assert(swapOutput.value >= swapMinOut);
  assert.equal(swapRefund.value, 0n);

  const beforeRejected = await router.getPoolHandles(cUsdcAddress, cEthAddress);
  const rejectedAmount = ethers.parseUnits('1', 6);
  const [encryptedRejected, impossibleMinimum] = await Promise.all([
    nox.encryptInput(rejectedAmount, 'uint256', routerAddress),
    nox.encryptInput(ethers.parseUnits('1', 18), 'uint256', routerAddress),
  ]);
  const rejectedReceipt = await wait(router.confidentialSwap(
    cUsdcAddress,
    cEthAddress,
    encryptedRejected.handle,
    encryptedRejected.handleProof,
    impossibleMinimum.handle,
    impossibleMinimum.handleProof,
    latestBlock.timestamp + 3600,
  ));
  const rejectedEvent = eventFrom(router, rejectedReceipt, 'SwapExecuted');
  const [rejectedOutput, rejectedRefund] = await Promise.all([
    nox.decrypt(rejectedEvent.args.encryptedOutput),
    nox.decrypt(rejectedEvent.args.encryptedRefund),
  ]);
  assert.equal(rejectedOutput.value, 0n);
  assert.equal(rejectedRefund.value, rejectedAmount);
  const afterRejected = await router.getPoolHandles(cUsdcAddress, cEthAddress);
  const [before0, before1, after0, after1] = await Promise.all([
    nox.decrypt(beforeRejected.reserve0),
    nox.decrypt(beforeRejected.reserve1),
    nox.decrypt(afterRejected.reserve0),
    nox.decrypt(afterRejected.reserve1),
  ]);
  assert.equal(after0.value, before0.value);
  assert.equal(after1.value, before1.value);

  const feed = await ethers.deployContract('NoxMockPriceFeed', [10_000_000_000n]);
  await feed.waitForDeployment();
  const orderBook = await ethers.deployContract('NoxLimitOrderBook', [
    routerAddress,
    await feed.getAddress(),
    cUsdcAddress,
    cEthAddress,
  ]);
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  await wait(cUsdc.setOperator(orderBookAddress, 281474976710655n));

  const createOrder = async ({ amount, expiry, minOut = ethers.parseUnits('0.04', 18), trigger = 10_100_000_000n }) => {
    const [encryptedAmount, encryptedMinimum] = await Promise.all([
      nox.encryptInput(amount, 'uint256', orderBookAddress),
      nox.encryptInput(minOut, 'uint256', orderBookAddress),
    ]);
    const receipt = await wait(orderBook.createOrder(
      cUsdcAddress,
      cEthAddress,
      encryptedAmount.handle,
      encryptedAmount.handleProof,
      encryptedMinimum.handle,
      encryptedMinimum.handleProof,
      trigger,
      expiry,
    ));
    return eventFrom(orderBook, receipt, 'OrderCreated').args.orderId;
  };

  const orderBlock = await ethers.provider.getBlock('latest');
  const executableOrder = await createOrder({ amount: ethers.parseUnits('5', 6), expiry: orderBlock.timestamp + 3600 });
  assert.equal((await orderBook.canExecute(executableOrder)).executable, true);
  const executeReceipt = await wait(orderBook.connect(keeper).executeOrder(executableOrder));
  const executedEvent = eventFrom(orderBook, executeReceipt, 'OrderExecuted');
  assert((await nox.decrypt(executedEvent.args.encryptedOutput)).value > 0n);
  assert.equal((await orderBook.getOrder(executableOrder)).status, 1n);
  await assert.rejects(() => orderBook.connect(keeper).executeOrder.staticCall(executableOrder), /not open/i);

  const cancellableOrder = await createOrder({ amount: ethers.parseUnits('1', 6), expiry: orderBlock.timestamp + 3600, minOut: 1n });
  const cancelReceipt = await wait(orderBook.cancelOrder(cancellableOrder));
  assert.equal((await nox.decrypt(eventFrom(orderBook, cancelReceipt, 'OrderCancelled').args.encryptedRefund)).value, ethers.parseUnits('1', 6));
  assert.equal((await orderBook.getOrder(cancellableOrder)).status, 2n);

  const expiryBlock = await ethers.provider.getBlock('latest');
  const expiringOrder = await createOrder({ amount: ethers.parseUnits('1', 6), expiry: expiryBlock.timestamp + 10, minOut: 1n });
  await ethers.provider.send('evm_increaseTime', [11]);
  await ethers.provider.send('evm_mine', []);
  const expiryReceipt = await wait(orderBook.connect(keeper).expireOrder(expiringOrder));
  assert.equal((await nox.decrypt(eventFrom(orderBook, expiryReceipt, 'OrderExpired').args.encryptedRefund)).value, ethers.parseUnits('1', 6));
  assert.equal((await orderBook.getOrder(expiringOrder)).status, 3n);

  const unwrapAmount = ethers.parseUnits('0.01', 18);
  const publicBefore = await weth.balanceOf(ownerAddress);
  const encryptedUnwrap = await nox.encryptInput(unwrapAmount, 'uint256', cEthAddress);
  const unwrapReceipt = await wait(cEth['unwrap(address,address,bytes32,bytes)'](
    ownerAddress,
    ownerAddress,
    encryptedUnwrap.handle,
    encryptedUnwrap.handleProof,
  ));
  const unwrapEvent = eventFrom(cEth, unwrapReceipt, 'UnwrapRequested');
  const publicResult = await nox.publicDecrypt(unwrapEvent.args.amount);
  assert.equal(publicResult.value, unwrapAmount);
  await wait(cEth.finalizeUnwrap(unwrapEvent.args.amount, publicResult.decryptionProof));
  assert.equal(await weth.balanceOf(ownerAddress) - publicBefore, unwrapAmount);
  assert.equal(await weth.balanceOf(cEthAddress), wrappedEth - unwrapAmount);
});
