import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEthersHandleClient } from '@iexec-nox/handle';
import {
  Contract,
  JsonRpcProvider,
  MaxUint256,
  Wallet,
  formatEther,
  getAddress,
  parseEther,
} from 'ethers';
import { SAFE_ABI, SAFE_FACTORY_ABI } from '../client/abis.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const deployment = JSON.parse(fs.readFileSync(path.join(rootDir, 'deployment-sepolia.json'), 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL
  ?? process.env.SEPOLIA_RPC
  ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const runFullE2E = process.env.FULL_SAFE_FACTORY_E2E === 'true';

if (!runFullE2E) throw new Error('Set FULL_SAFE_FACTORY_E2E=true to run the live full-flow test.');
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_HANDLE = `0x${'0'.repeat(64)}`;
const SENTINEL_MODULES = '0x0000000000000000000000000000000000000001';
const MAX_OPERATOR_EXPIRY = 281_474_976_710_655n;
const OWNER_FUNDING = parseEther(process.env.FULL_SAFE_OWNER_ETH ?? '0.08');
const SAFE_FUND_AMOUNT = 5_000_000n;
const SWAP_AMOUNT = 1_000_000n;
const ORDER_AMOUNT = 500_000n;
const UNWRAP_AMOUNT = 1n;

const artifact = (name) => JSON.parse(
  fs.readFileSync(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`), 'utf8'),
);

const moduleArtifact = artifact('NoxSafeModule');
const wrapperArtifact = artifact('NoxConfidentialToken');
const tokenArtifact = artifact('NoxTestToken');
const orderBookArtifact = artifact('NoxLimitOrderBook');

function parseEvent(contract, receipt, name) {
  return receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === name) ?? null;
}

async function waitForResult(action, { attempts = 20, delayMs = 5_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function send(label, transactionPromise, transactions) {
  const transaction = await transactionPromise;
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1, `${label} must succeed`);
  transactions.push({ label, hash: transaction.hash });
  console.log(`${label}: ${transaction.hash}`);
  return receipt;
}

async function executeSafe({
  data,
  label,
  safe,
  signer,
  target,
  transactions,
}) {
  const nonce = await safe.nonce();
  const signature = `0x${signer.address.slice(2).padStart(64, '0')}${'0'.repeat(64)}01`;
  return send(
    label,
    safe.execTransaction(
      target,
      0,
      data,
      0,
      0,
      0,
      0,
      ZERO_ADDRESS,
      ZERO_ADDRESS,
      signature,
    ),
    transactions,
  );
}

async function setOperator({
  enabled,
  label,
  module,
  operator,
  safe,
  signer,
  token,
  transactions,
}) {
  const data = module.interface.encodeFunctionData('setTokenOperator', [
    token,
    operator,
    enabled ? MAX_OPERATOR_EXPIRY : 0,
  ]);
  await executeSafe({
    data,
    label,
    safe,
    signer,
    target: module.target,
    transactions,
  });
}

async function sweepOwner(owner, funder, provider, transactions) {
  const balance = await provider.getBalance(owner.address);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  const gasLimit = 21_000n;
  if (!gasPrice || balance <= gasLimit * gasPrice) return null;
  const receipt = await send(
    'Sweep remaining owner ETH',
    owner.sendTransaction({
      to: funder.address,
      value: balance - (gasLimit * gasPrice),
      gasLimit,
      gasPrice,
    }),
    transactions,
  );
  return receipt.hash;
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl, deployment.chainId, { staticNetwork: true });
  const funder = new Wallet(privateKey, provider);
  const owner = Wallet.createRandom().connect(provider);
  const viewer = Wallet.createRandom().connect(provider);
  const transactions = [];
  let safeAddress = ZERO_ADDRESS;
  let moduleAddress = ZERO_ADDRESS;
  let orderId = null;
  let sweepTransaction = null;

  assert(
    (await provider.getBalance(funder.address)) > OWNER_FUNDING,
    'The funding wallet does not have enough Sepolia ETH for the isolated full-flow test.',
  );

  try {
    await send(
      'Fund isolated Safe owner',
      funder.sendTransaction({ to: owner.address, value: OWNER_FUNDING }),
      transactions,
    );

    const factory = new Contract(deployment.contracts.noxSafeFactory, SAFE_FACTORY_ABI, owner);
    assert.equal(await factory.safeOf(owner.address), ZERO_ADDRESS, 'Fresh owner must not have a registered Safe');
    const creationReceipt = await send('Create per-account Safe', factory.createSafe(), transactions);
    const created = parseEvent(factory, creationReceipt, 'NoxSafeCreated');
    assert(created, 'NoxSafeCreated event must be emitted');
    safeAddress = getAddress(created.args.safe);
    moduleAddress = getAddress(created.args.module);

    const safe = new Contract(safeAddress, SAFE_ABI, owner);
    const module = new Contract(moduleAddress, moduleArtifact.abi, owner);
    const wrapper = new Contract(deployment.contracts.cUSDC, wrapperArtifact.abi, owner);
    const outputWrapper = new Contract(deployment.contracts.cETH, wrapperArtifact.abi, owner);
    const underlying = new Contract(deployment.contracts.underlyingUSDC, tokenArtifact.abi, owner);
    const orderBook = new Contract(deployment.safe.orderBook, orderBookArtifact.abi, owner);
    const compute = new Contract(
      deployment.contracts.noxCompute,
      ['function isViewer(bytes32 handle,address viewer) view returns (bool)'],
      provider,
    );

    const [owners, threshold, enabled, registeredSafe, registeredModule, boundSafe] = await Promise.all([
      safe.getOwners(),
      safe.getThreshold(),
      safe.isModuleEnabled(moduleAddress),
      factory.safeOf(owner.address),
      factory.moduleOf(safeAddress),
      module.safe(),
    ]);
    assert.deepEqual(owners.map(getAddress), [owner.address]);
    assert.equal(threshold, 1n);
    assert.equal(enabled, true);
    assert.equal(getAddress(registeredSafe), safeAddress);
    assert.equal(getAddress(registeredModule), moduleAddress);
    assert.equal(getAddress(boundSafe), safeAddress);
    await assert.rejects(factory.createSafe.staticCall(), 'Duplicate Safe creation must revert');
    console.log('Safe factory ownership and module invariants: PASS');

    await send('Claim isolated nUSDC faucet', underlying.faucet(), transactions);
    assert((await underlying.balanceOf(owner.address)) >= SAFE_FUND_AMOUNT, 'Faucet balance is too small');
    await send('Approve reusable Safe funding', underlying.approve(wrapper.target, MaxUint256), transactions);
    await send('Wrap nUSDC directly to new Safe', wrapper.wrap(safeAddress, SAFE_FUND_AMOUNT), transactions);

    const initialHandle = await wrapper.confidentialBalanceOf(safeAddress);
    assert.notEqual(initialHandle, ZERO_HANDLE, 'Safe cUSDC balance handle must initialize');
    const ownerClient = await createEthersHandleClient(owner);
    const viewerClient = await createEthersHandleClient(viewer);

    await executeSafe({
      data: module.interface.encodeFunctionData('addViewer', [initialHandle, owner.address]),
      label: 'Grant owner current Safe balance viewer',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    assert.equal(await compute.isViewer(initialHandle, owner.address), true);
    const initialOwnerReveal = await waitForResult(() => ownerClient.decrypt(initialHandle));
    assert.equal(initialOwnerReveal.value, SAFE_FUND_AMOUNT);

    await executeSafe({
      data: module.interface.encodeFunctionData('addViewer', [initialHandle, viewer.address]),
      label: 'Grant external Safe balance viewer',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    assert.equal(await compute.isViewer(initialHandle, viewer.address), true);
    const initialViewerReveal = await waitForResult(() => viewerClient.decrypt(initialHandle));
    assert.equal(initialViewerReveal.value, SAFE_FUND_AMOUNT);
    console.log('Safe funding, owner reveal, and external Shared with me reveal: PASS');

    const [encryptedSwapAmount, encryptedSwapMinimum] = await Promise.all([
      ownerClient.encryptInput(SWAP_AMOUNT, 'uint256', moduleAddress),
      ownerClient.encryptInput(0n, 'uint256', moduleAddress),
    ]);
    const latestBlock = await provider.getBlock('latest');
    const swapReceipt = await executeSafe({
      data: module.interface.encodeFunctionData('prepareAndSwap', [
        wrapper.target,
        outputWrapper.target,
        encryptedSwapAmount.handle,
        encryptedSwapAmount.handleProof,
        encryptedSwapMinimum.handle,
        encryptedSwapMinimum.handleProof,
        owner.address,
        owner.address,
        latestBlock.timestamp + 1_200,
      ]),
      label: 'Execute one-transaction Safe V6 swap',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    const swap = parseEvent(module, swapReceipt, 'SafeSwapExecuted');
    assert(swap, 'SafeSwapExecuted event must be emitted');
    assert.equal(await wrapper.isOperator(safeAddress, deployment.contracts.noxSwapRouter), true);
    const [swapOutput, swapRefund] = await Promise.all([
      waitForResult(() => ownerClient.decrypt(swap.args.encryptedOutput)),
      waitForResult(() => ownerClient.decrypt(swap.args.encryptedRefund)),
    ]);
    assert(swapOutput.value > 0n || swapRefund.value === SWAP_AMOUNT, 'Swap must settle or refund exactly');

    const postSwapHandle = await wrapper.confidentialBalanceOf(safeAddress);
    assert.notEqual(postSwapHandle, initialHandle, 'Swap must rotate the cUSDC balance handle');
    assert.equal(
      await compute.isViewer(postSwapHandle, viewer.address),
      false,
      'An external viewer grant must not silently follow a changed handle',
    );
    await executeSafe({
      data: module.interface.encodeFunctionData('addViewer', [postSwapHandle, viewer.address]),
      label: 'Grant viewer on rotated Safe balance handle',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    const [postSwapOwnerBalance, postSwapViewerBalance] = await Promise.all([
      waitForResult(() => ownerClient.decrypt(postSwapHandle)),
      waitForResult(() => viewerClient.decrypt(postSwapHandle)),
    ]);
    assert.equal(postSwapViewerBalance.value, postSwapOwnerBalance.value);
    console.log('Safe V6 swap and changed-handle viewer boundary: PASS');

    const [encryptedOrderAmount, encryptedOrderMinimum] = await Promise.all([
      ownerClient.encryptInput(ORDER_AMOUNT, 'uint256', moduleAddress),
      ownerClient.encryptInput(0n, 'uint256', moduleAddress),
    ]);
    const orderBlock = await provider.getBlock('latest');
    const orderReceipt = await executeSafe({
      data: module.interface.encodeFunctionData('prepareAndCreateLimitOrder', [
        wrapper.target,
        outputWrapper.target,
        encryptedOrderAmount.handle,
        encryptedOrderAmount.handleProof,
        encryptedOrderMinimum.handle,
        encryptedOrderMinimum.handleProof,
        owner.address,
        owner.address,
        250_000_000_000n,
        orderBlock.timestamp + 3_600,
      ]),
      label: 'Create one-transaction Safe confidential order',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    const orderCreated = parseEvent(module, orderReceipt, 'SafeOrderCreated');
    assert(orderCreated, 'SafeOrderCreated event must be emitted');
    orderId = orderCreated.args.orderId;
    let order = await orderBook.getOrder(orderId);
    assert.equal(getAddress(order.owner), safeAddress);
    assert.equal(Number(order.status), 0);

    await executeSafe({
      data: module.interface.encodeFunctionData('addViewers', [
        [order.encryptedAmountIn, order.encryptedMinOut],
        owner.address,
      ]),
      label: 'Grant owner Safe order-term viewer',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    const [revealedOrderAmount, revealedOrderMinimum] = await Promise.all([
      waitForResult(() => ownerClient.decrypt(order.encryptedAmountIn)),
      waitForResult(() => ownerClient.decrypt(order.encryptedMinOut)),
    ]);
    assert.equal(revealedOrderAmount.value, ORDER_AMOUNT);
    assert.equal(revealedOrderMinimum.value, 0n);

    await executeSafe({
      data: module.interface.encodeFunctionData('cancelLimitOrder', [orderId]),
      label: 'Cancel and refund Safe confidential order',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    order = await orderBook.getOrder(orderId);
    assert.equal(Number(order.status), 2);
    console.log('Safe order create, reveal, cancel, and refund lifecycle: PASS');

    const postCancelHandle = await wrapper.confidentialBalanceOf(safeAddress);
    if (!(await compute.isViewer(postCancelHandle, owner.address))) {
      await executeSafe({
        data: module.interface.encodeFunctionData('addViewer', [postCancelHandle, owner.address]),
        label: 'Refresh owner viewer before Safe unwrap',
        safe,
        signer: owner,
        target: moduleAddress,
        transactions,
      });
    }
    const postCancelBalance = await waitForResult(() => ownerClient.decrypt(postCancelHandle));
    assert(postCancelBalance.value >= UNWRAP_AMOUNT);
    const publicBalanceBefore = await underlying.balanceOf(owner.address);
    const encryptedUnwrap = await ownerClient.encryptInput(UNWRAP_AMOUNT, 'uint256', moduleAddress);
    const unwrapReceipt = await executeSafe({
      data: module.interface.encodeFunctionData('prepareAndRequestUnwrap', [
        wrapper.target,
        encryptedUnwrap.handle,
        encryptedUnwrap.handleProof,
        owner.address,
        owner.address,
      ]),
      label: 'Request one-transaction Safe unwrap',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    const unwrap = parseEvent(module, unwrapReceipt, 'SafeUnwrapRequested');
    assert(unwrap, 'SafeUnwrapRequested event must be emitted');
    const publicResult = await waitForResult(
      () => ownerClient.publicDecrypt(unwrap.args.unwrapRequestId),
      { attempts: 24, delayMs: 5_000 },
    );
    assert.equal(publicResult.value, UNWRAP_AMOUNT);
    await send(
      'Finalize Safe unwrap proof',
      wrapper.finalizeUnwrap(unwrap.args.unwrapRequestId, publicResult.decryptionProof),
      transactions,
    );
    assert.equal(await underlying.balanceOf(owner.address), publicBalanceBefore + UNWRAP_AMOUNT);
    console.log('Safe unwrap request and permissionless proof finalization: PASS');

    await setOperator({
      enabled: false,
      label: 'Revoke Safe router operator',
      module,
      operator: deployment.contracts.noxSwapRouter,
      safe,
      signer: owner,
      token: wrapper.target,
      transactions,
    });
    assert.equal(await wrapper.isOperator(safeAddress, deployment.contracts.noxSwapRouter), false);
    await setOperator({
      enabled: true,
      label: 'Restore Safe router operator',
      module,
      operator: deployment.contracts.noxSwapRouter,
      safe,
      signer: owner,
      token: wrapper.target,
      transactions,
    });
    assert.equal(await wrapper.isOperator(safeAddress, deployment.contracts.noxSwapRouter), true);
    await setOperator({
      enabled: false,
      label: 'Revoke Safe orderbook operator',
      module,
      operator: deployment.safe.orderBook,
      safe,
      signer: owner,
      token: wrapper.target,
      transactions,
    });
    assert.equal(await wrapper.isOperator(safeAddress, deployment.safe.orderBook), false);
    await setOperator({
      enabled: true,
      label: 'Restore Safe orderbook operator',
      module,
      operator: deployment.safe.orderBook,
      safe,
      signer: owner,
      token: wrapper.target,
      transactions,
    });
    assert.equal(await wrapper.isOperator(safeAddress, deployment.safe.orderBook), true);
    console.log('Safe router and orderbook operator controls: PASS');

    await executeSafe({
      data: module.interface.encodeFunctionData('revoke', [SENTINEL_MODULES]),
      label: 'Emergency revoke new Safe module',
      safe,
      signer: owner,
      target: moduleAddress,
      transactions,
    });
    assert.equal(await safe.isModuleEnabled(moduleAddress), false);
    await executeSafe({
      data: safe.interface.encodeFunctionData('enableModule', [moduleAddress]),
      label: 'Re-enable approved new Safe module',
      safe,
      signer: owner,
      target: safeAddress,
      transactions,
    });
    assert.equal(await safe.isModuleEnabled(moduleAddress), true);
    console.log('Safe module emergency revoke and recovery: PASS');
  } finally {
    try {
      sweepTransaction = await sweepOwner(owner, funder, provider, transactions);
    } catch (error) {
      console.warn(`Owner ETH sweep needs manual review: ${error.shortMessage ?? error.message}`);
    }
  }

  console.log(JSON.stringify({
    status: 'PASS',
    factory: deployment.contracts.noxSafeFactory,
    isolatedOwner: owner.address,
    externalViewer: viewer.address,
    safe: safeAddress,
    module: moduleAddress,
    orderId: orderId === null ? null : orderId.toString(),
    transactionCount: transactions.length,
    transactions,
    sweepTransaction,
    ownerRemainingEth: formatEther(await provider.getBalance(owner.address)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
