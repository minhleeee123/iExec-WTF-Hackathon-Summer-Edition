import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const safeArtifactPath = path.resolve(
  root,
  '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json',
);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

async function setupSafe() {
  const { network } = await import('hardhat');
  const { ethers } = await network.connect();
  const [funder] = await ethers.getSigners();
  const owner = ethers.Wallet.createRandom().connect(ethers.provider);
  await funder.sendTransaction({ to: owner.address, value: ethers.parseEther('5') });

  const safeArtifact = readJson(safeArtifactPath);
  const factoryArtifact = readJson(path.resolve(
    root,
    '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json',
  ));
  const singleton = await new ethers.ContractFactory(
    safeArtifact.abi,
    safeArtifact.bytecode,
    funder,
  ).deploy();
  const factory = await new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    funder,
  ).deploy();
  await Promise.all([singleton.waitForDeployment(), factory.waitForDeployment()]);
  const initializer = singleton.interface.encodeFunctionData('setup', [
    [owner.address],
    1,
    ethers.ZeroAddress,
    '0x',
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    0,
    ethers.ZeroAddress,
  ]);
  const saltNonce = 1n;
  const safeAddress = await factory.createProxyWithNonce.staticCall(
    await singleton.getAddress(),
    initializer,
    saltNonce,
  );
  await factory.createProxyWithNonce(await singleton.getAddress(), initializer, saltNonce);
  const safe = new ethers.Contract(safeAddress, safeArtifact.abi, funder);
  return { ethers, funder, owner, safe };
}

async function safeExec({ ethers, owner, safe }, target, data) {
  const nonce = await safe.nonce();
  const safeTxHash = await safe.getTransactionHash(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    nonce,
  );
  const signature = owner.signingKey.sign(safeTxHash).serialized;
  const transaction = await safe.connect(owner).execTransaction(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    signature,
  );
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1);
  return receipt;
}

async function deployFixture() {
  const context = await setupSafe();
  const { ethers, safe } = context;
  const router = await ethers.deployContract('NoxSafeModuleMockRouter');
  const orderBook = await ethers.deployContract('NoxSafeModuleMockOrderBook');
  const token = await ethers.deployContract('NoxSafeModuleMockToken');
  const tokenOut = await ethers.deployContract('NoxSafeModuleMockToken');
  const compute = await ethers.deployContract('NoxSafeModuleMockCompute');
  const module = await ethers.deployContract('NoxSafeModule', [
    await safe.getAddress(),
    await router.getAddress(),
    await orderBook.getAddress(),
    await compute.getAddress(),
    [await token.getAddress(), await tokenOut.getAddress()],
  ]);
  await Promise.all([
    router.waitForDeployment(),
    orderBook.waitForDeployment(),
    token.waitForDeployment(),
    tokenOut.waitForDeployment(),
    compute.waitForDeployment(),
    module.waitForDeployment(),
  ]);
  await safeExec(
    context,
    await safe.getAddress(),
    safe.interface.encodeFunctionData('enableModule', [await module.getAddress()]),
  );
  return { ...context, router, orderBook, token, tokenOut, compute, module };
}

test('NoxSafeModule executes a private swap through the Safe and preserves Safe custody', async () => {
  const fixture = await deployFixture();
  const { ethers, owner, safe, module, router } = fixture;
  const tokenIn = await fixture.token.getAddress();
  const tokenOut = await fixture.tokenOut.getAddress();
  const data = module.interface.encodeFunctionData('confidentialSwap', [
    tokenIn,
    tokenOut,
    ethers.zeroPadValue('0x01', 32),
    ethers.zeroPadValue('0x02', 32),
    owner.address,
    4_000_000_000n,
  ]);
  const receipt = await safeExec(fixture, await module.getAddress(), data);
  const event = receipt.logs
    .map((log) => { try { return module.interface.parseLog(log); } catch { return null; } })
    .find((parsed) => parsed?.name === 'SafeSwapExecuted');
  assert(event);
  assert.equal(event.args.receiptId, 1n);
  assert.equal(await router.lastCaller(), await safe.getAddress());
  assert.equal(await router.lastTokenIn(), tokenIn);
  assert.equal(await router.swapCalls(), 1n);
});

test('NoxSafeModule routes order creation and operator authorization with Safe as msg.sender', async () => {
  const fixture = await deployFixture();
  const { ethers, owner, safe, module, orderBook, token } = fixture;
  const tokenIn = await token.getAddress();
  const tokenOut = await fixture.tokenOut.getAddress();
  const orderData = module.interface.encodeFunctionData('createLimitOrder', [
    tokenIn,
    tokenOut,
    ethers.zeroPadValue('0x03', 32),
    ethers.zeroPadValue('0x04', 32),
    owner.address,
    2_000_000_000n,
    4_000_000_000n,
  ]);
  await safeExec(fixture, await module.getAddress(), orderData);
  assert.equal(await orderBook.lastCaller(), await safe.getAddress());
  assert.equal(await orderBook.orderCalls(), 1n);

  const operatorData = module.interface.encodeFunctionData('setTokenOperator', [
    tokenIn,
    await module.router(),
    281474976710655n,
  ]);
  await safeExec(fixture, await module.getAddress(), operatorData);
  assert.equal(await token.lastCaller(), await safe.getAddress());
  assert.equal(await token.lastOperator(), await module.router());
  assert.equal(await token.lastUntil(), 281474976710655n);
});

test('Safe owner can cancel a confidential limit order through the module', async () => {
  const fixture = await deployFixture();
  const { ethers, safe, module, orderBook } = fixture;
  const orderId = 17n;
  const data = module.interface.encodeFunctionData('cancelLimitOrder', [orderId]);
  const receipt = await safeExec(fixture, await module.getAddress(), data);
  const event = receipt.logs
    .map((log) => { try { return module.interface.parseLog(log); } catch { return null; } })
    .find((parsed) => parsed?.name === 'SafeOrderCancelled');
  assert(event);
  assert.equal(event.args.orderId, orderId);
  assert.equal(event.args.encryptedRefund, ethers.zeroPadValue('0x3333', 32));
  assert.equal(await orderBook.lastCaller(), await safe.getAddress());
  assert.equal(await orderBook.cancelCalls(), 1n);
  assert.equal(await orderBook.lastCancelledOrder(), orderId);
});

test('NoxSafeModule grants viewers through Safe custody and cannot be called by an EOA', async () => {
  const fixture = await deployFixture();
  const { ethers, owner, safe, module, compute } = fixture;
  const handle = ethers.zeroPadValue('0x55', 32);
  const viewer = ethers.getAddress('0x00000000000000000000000000000000000000b2');
  const data = module.interface.encodeFunctionData('addViewer', [handle, viewer]);
  await safeExec(fixture, await module.getAddress(), data);
  assert.equal(await compute.lastCaller(), await safe.getAddress());
  assert.equal(await compute.lastHandle(), handle);
  assert.equal(await compute.lastViewer(), viewer);

  await assert.rejects(
    module.connect(owner).confidentialSwap(
      await fixture.token.getAddress(),
      viewer,
      handle,
      handle,
      owner.address,
      4_000_000_000n,
    ),
    /OnlySafe|revert/i,
  );
});

test('Safe owner can revoke the module and all later module writes are blocked', async () => {
  const fixture = await deployFixture();
  const { ethers, safe, module, router } = fixture;
  const moduleAddress = await module.getAddress();
  const revokeData = module.interface.encodeFunctionData('revoke', [ethers.ZeroAddress]);
  // Safe's first module pointer is SENTINEL_MODULES (0x1), not zero.
  const sentinel = ethers.getAddress('0x0000000000000000000000000000000000000001');
  const validRevoke = module.interface.encodeFunctionData('revoke', [sentinel]);
  await safeExec(fixture, moduleAddress, validRevoke);
  assert.equal(await safe.isModuleEnabled(moduleAddress), false);
  assert.equal(await module.isEnabled(), false);
  await assert.rejects(
    safeExec(fixture, moduleAddress, revokeData),
    /revert|GS013|GS modules/i,
  );
  assert.equal(await router.swapCalls(), 0n);
});

test('Safe v1.4 accepts a browser personal-sign signature normalized to v=31/32', async () => {
  const fixture = await deployFixture();
  const { ethers, owner, safe, module, router } = fixture;
  const data = module.interface.encodeFunctionData('confidentialSwap', [
    await fixture.token.getAddress(),
    await fixture.tokenOut.getAddress(),
    ethers.zeroPadValue('0x06', 32),
    ethers.zeroPadValue('0x07', 32),
    owner.address,
    4_000_000_000n,
  ]);
  const nonce = await safe.nonce();
  const hash = await safe.getTransactionHash(
    await module.getAddress(), 0, data, 0, 0, 0, 0,
    ethers.ZeroAddress, ethers.ZeroAddress, nonce,
  );
  const personal = ethers.Signature.from(await owner.signMessage(ethers.getBytes(hash)));
  const safeSignature = ethers.concat([personal.r, personal.s, ethers.toBeHex(Number(personal.v) + 4, 1)]);
  const transaction = await safe.connect(owner).execTransaction(
    await module.getAddress(), 0, data, 0, 0, 0, 0,
    ethers.ZeroAddress, ethers.ZeroAddress, safeSignature,
  );
  await transaction.wait();
  assert.equal(await router.swapCalls(), 1n);
});
