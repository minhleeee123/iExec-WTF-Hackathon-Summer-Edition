import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const safeArtifact = readJson(path.resolve(
  root,
  '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json',
));
const proxyFactoryArtifact = readJson(path.resolve(
  root,
  '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json',
));

async function deployFactoryFixture() {
  const { network } = await import('hardhat');
  const { ethers } = await network.connect();
  const [deployer, ownerA, ownerB] = await ethers.getSigners();
  const singleton = await new ethers.ContractFactory(
    safeArtifact.abi,
    safeArtifact.bytecode,
    deployer,
  ).deploy();
  const proxyFactory = await new ethers.ContractFactory(
    proxyFactoryArtifact.abi,
    proxyFactoryArtifact.bytecode,
    deployer,
  ).deploy();
  const router = await ethers.deployContract('NoxSafeModuleMockRouter');
  const orderBook = await ethers.deployContract('NoxSafeModuleMockOrderBook');
  const token = await ethers.deployContract('NoxSafeModuleMockToken');
  const tokenOut = await ethers.deployContract('NoxSafeModuleMockToken');
  const compute = await ethers.deployContract('NoxSafeModuleMockCompute');
  await Promise.all([
    singleton.waitForDeployment(),
    proxyFactory.waitForDeployment(),
    router.waitForDeployment(),
    orderBook.waitForDeployment(),
    token.waitForDeployment(),
    tokenOut.waitForDeployment(),
    compute.waitForDeployment(),
  ]);
  const commonArgs = [
    await singleton.getAddress(),
    await proxyFactory.getAddress(),
    await router.getAddress(),
    await orderBook.getAddress(),
    await compute.getAddress(),
    [await token.getAddress(), await tokenOut.getAddress()],
  ];
  const factory = await ethers.deployContract('NoxSafeFactory', [
    ...commonArgs,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
    ethers.ZeroAddress,
  ]);
  await factory.waitForDeployment();
  return { commonArgs, deployer, ethers, factory, ownerA, ownerB };
}

async function createSafe(fixture, owner) {
  const transaction = await fixture.factory.connect(owner).createSafe();
  const receipt = await transaction.wait();
  const event = receipt.logs
    .map((log) => { try { return fixture.factory.interface.parseLog(log); } catch { return null; } })
    .find((entry) => entry?.name === 'NoxSafeCreated');
  assert(event, 'factory must emit NoxSafeCreated');
  const safe = new fixture.ethers.Contract(event.args.safe, safeArtifact.abi, owner);
  const module = await fixture.ethers.getContractAt('NoxSafeModule', event.args.module);
  return { event, module, receipt, safe };
}

test('NoxSafeFactory creates and initializes one bound Safe treasury in one transaction', async () => {
  const fixture = await deployFactoryFixture();
  const created = await createSafe(fixture, fixture.ownerA);
  const safeAddress = await created.safe.getAddress();
  const moduleAddress = await created.module.getAddress();

  assert.equal(created.receipt.status, 1);
  assert.deepEqual([...(await created.safe.getOwners())], [fixture.ownerA.address]);
  assert.equal(await created.safe.getThreshold(), 1n);
  assert.equal(await created.safe.isModuleEnabled(moduleAddress), true);
  assert.equal(await created.module.safe(), safeAddress);
  assert.equal(await fixture.factory.safeOf(fixture.ownerA.address), safeAddress);
  assert.equal(await fixture.factory.moduleOf(safeAddress), moduleAddress);
  assert.equal(await fixture.factory.registeredOwner(safeAddress), fixture.ownerA.address);
});

test('NoxSafeFactory enforces one Safe per account and isolates different owners', async () => {
  const fixture = await deployFactoryFixture();
  const first = await createSafe(fixture, fixture.ownerA);
  await assert.rejects(
    fixture.factory.connect(fixture.ownerA).createSafe(),
    /AlreadyHasSafe|revert/i,
  );
  const second = await createSafe(fixture, fixture.ownerB);

  assert.notEqual(await first.safe.getAddress(), await second.safe.getAddress());
  assert.notEqual(await first.module.getAddress(), await second.module.getAddress());
  assert.deepEqual([...(await first.safe.getOwners())], [fixture.ownerA.address]);
  assert.deepEqual([...(await second.safe.getOwners())], [fixture.ownerB.address]);
  assert.equal(await first.module.safe(), await first.safe.getAddress());
  assert.equal(await second.module.safe(), await second.safe.getAddress());
});

test('NoxSafeFactory setup hook cannot be called directly', async () => {
  const fixture = await deployFactoryFixture();
  await assert.rejects(
    fixture.factory.enableModuleDuringSetup(fixture.ownerA.address),
    /OnlyDelegateCall|revert/i,
  );
});

test('NoxSafeFactory registers the existing demo Safe for its legacy owner', async () => {
  const fixture = await deployFactoryFixture();
  const created = await createSafe(fixture, fixture.ownerA);
  const safeAddress = await created.safe.getAddress();
  const moduleAddress = await created.module.getAddress();
  const registry = await fixture.ethers.deployContract('NoxSafeFactory', [
    ...fixture.commonArgs,
    fixture.ownerA.address,
    safeAddress,
    moduleAddress,
  ]);
  await registry.waitForDeployment();

  assert.equal(await registry.safeOf(fixture.ownerA.address), safeAddress);
  assert.equal(await registry.moduleOf(safeAddress), moduleAddress);
  assert.equal(await registry.registeredOwner(safeAddress), fixture.ownerA.address);
  await assert.rejects(
    registry.connect(fixture.ownerA).createSafe(),
    /AlreadyHasSafe|revert/i,
  );
});
