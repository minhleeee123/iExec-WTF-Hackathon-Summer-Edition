import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEthersHandleClient } from '@iexec-nox/handle';
import {
  Contract,
  ContractFactory,
  Interface,
  JsonRpcProvider,
  MaxUint256,
  Wallet,
  id,
  parseUnits,
} from 'ethers';

const rootDir = path.resolve(import.meta.dirname, '..');
const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
const candidatePath = path.join(rootDir, 'deployment-sepolia-candidate.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const historyRpcUrl = process.env.SEPOLIA_HISTORY_RPC_URL ?? 'https://eth-sepolia.api.onfinality.io/public';
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const artifact = (name) => JSON.parse(
  fs.readFileSync(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`), 'utf8'),
);

async function fees(provider) {
  const current = await provider.getFeeData();
  return {
    maxFeePerGas: current.maxFeePerGas && current.maxFeePerGas > parseUnits('3', 'gwei')
      ? current.maxFeePerGas * 2n
      : parseUnits('3', 'gwei'),
    maxPriorityFeePerGas: current.maxPriorityFeePerGas && current.maxPriorityFeePerGas > parseUnits('0.1', 'gwei')
      ? current.maxPriorityFeePerGas
      : parseUnits('0.1', 'gwei'),
  };
}

async function send(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1, `${label} must succeed.`);
  return receipt;
}

async function decryptWithRetry(client, handle, attempts = 12) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await client.decrypt(handle);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(8_000, 1_000 * (2 ** attempt))));
      }
    }
  }
  throw lastError;
}

async function findLatestDirectSwap(provider, historyProvider) {
  const current = new Contract(
    deployment.contracts.noxSwapRouter,
    artifact('NoxSwap').abi,
    historyProvider,
  );
  const deployed = await provider.getTransactionReceipt(deployment.deploymentTransactions.noxSwapRouter);
  const latest = await historyProvider.getBlockNumber();
  const events = [];
  for (let start = deployed.blockNumber; start <= latest; start += 5_000) {
    const end = Math.min(latest, start + 4_999);
    events.push(...await current.queryFilter(current.filters.SwapExecuted(), start, end));
  }
  for (const event of events.reverse()) {
    const transaction = await provider.getTransaction(event.transactionHash);
    if (transaction?.to?.toLowerCase() === deployment.contracts.noxSwapRouter.toLowerCase()) {
      return provider.getTransactionReceipt(event.transactionHash);
    }
  }
  return null;
}

async function main() {
  if (candidate.routerOptimized?.address) {
    throw new Error(`Optimized router candidate already recorded at ${candidate.routerOptimized.address}.`);
  }
  const provider = new JsonRpcProvider(rpcUrl, deployment.chainId, { staticNetwork: true });
  const historyProvider = new JsonRpcProvider(historyRpcUrl, deployment.chainId, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const compiled = artifact('NoxSwapOptimized');
  const router = await new ContractFactory(compiled.abi, compiled.bytecode, wallet).deploy(
    await fees(provider),
  );
  const deploymentTransaction = router.deploymentTransaction();
  console.log(`NoxSwapOptimized candidate deployment: ${deploymentTransaction.hash}`);
  const deploymentReceipt = await deploymentTransaction.wait();
  assert.equal(deploymentReceipt.status, 1);
  const routerAddress = await router.getAddress();
  const constants = await router.getConstantHandles();
  assert.notEqual(constants.feeNumerator, `0x${'0'.repeat(64)}`);

  const testTokenAbi = artifact('NoxTestToken').abi;
  const confidentialTokenAbi = artifact('NoxConfidentialToken').abi;
  const underlyingUSDC = new Contract(deployment.contracts.underlyingUSDC, testTokenAbi, wallet);
  const underlyingWETH = new Contract(deployment.contracts.underlyingWETH, testTokenAbi, wallet);
  const cUSDC = new Contract(deployment.contracts.cUSDC, confidentialTokenAbi, wallet);
  const cETH = new Contract(deployment.contracts.cETH, confidentialTokenAbi, wallet);
  const liquidityUSDC = parseUnits('100', 6);
  const liquidityETH = parseUnits('0.05', 18);

  for (const [underlying, wrapper, amount, label] of [
    [underlyingUSDC, cUSDC, liquidityUSDC, 'nUSDC'],
    [underlyingWETH, cETH, liquidityETH, 'nWETH'],
  ]) {
    if (await underlying.allowance(wallet.address, await wrapper.getAddress()) < amount) {
      await send(`Approve ${label} wrapper`, underlying.approve(await wrapper.getAddress(), MaxUint256, await fees(provider)));
    }
    await send(`Wrap ${label} candidate liquidity`, wrapper.wrap(wallet.address, amount, await fees(provider)));
    await send(`Authorize optimized router for ${label}`, wrapper.setOperator(routerAddress, 281474976710655n, await fees(provider)));
  }

  const client = await createEthersHandleClient(wallet);
  const [encryptedUSDC, encryptedETH] = await Promise.all([
    client.encryptInput(liquidityUSDC, 'uint256', routerAddress),
    client.encryptInput(liquidityETH, 'uint256', routerAddress),
  ]);
  const liquidityReceipt = await send('Add optimized-router liquidity', router.addLiquidity(
    deployment.contracts.cUSDC,
    deployment.contracts.cETH,
    encryptedUSDC.handle,
    encryptedUSDC.handleProof,
    encryptedETH.handle,
    encryptedETH.handleProof,
    await fees(provider),
  ));

  const [amount, minOut] = await Promise.all([
    client.encryptInput(parseUnits('1', 6), 'uint256', routerAddress),
    client.encryptInput(0n, 'uint256', routerAddress),
  ]);
  const latestBlock = await provider.getBlock('latest');
  const swapReceipt = await send('Benchmark optimized-router swap', router.confidentialSwap(
    deployment.contracts.cUSDC,
    deployment.contracts.cETH,
    amount.handle,
    amount.handleProof,
    minOut.handle,
    minOut.handleProof,
    latestBlock.timestamp + 1200,
    await fees(provider),
  ));
  const parsed = swapReceipt.logs
    .map((log) => {
      try { return new Interface(compiled.abi).parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === 'SwapExecuted');
  assert(parsed, 'Optimized SwapExecuted event must be emitted.');
  const output = await decryptWithRetry(client, parsed.args.encryptedOutput);
  assert(output.value > 0n, 'Optimized router must produce a positive output.');

  const currentSwapReceipt = await findLatestDirectSwap(provider, historyProvider);
  assert(currentSwapReceipt, 'A direct canonical swap is required for comparison.');
  const wrapTopic = id('WrapAsPublicHandle(address,bytes32,uint8,bytes32)');
  const currentWrapEvents = currentSwapReceipt.logs.filter((log) => log.topics[0] === wrapTopic).length;
  const optimizedWrapEvents = swapReceipt.logs.filter((log) => log.topics[0] === wrapTopic).length;
  const currentDeploymentReceipt = await provider.getTransactionReceipt(deployment.deploymentTransactions.noxSwapRouter);
  const gasDelta = currentSwapReceipt.gasUsed - swapReceipt.gasUsed;
  const gasReductionBps = Number(gasDelta * 10_000n / currentSwapReceipt.gasUsed);

  candidate.routerOptimized = {
    address: routerAddress,
    deploymentTransaction: deploymentTransaction.hash,
    deploymentBlock: deploymentReceipt.blockNumber,
    deploymentGasUsed: deploymentReceipt.gasUsed.toString(),
    liquidityTransaction: liquidityReceipt.hash,
    runtimeTest: {
      transactionHash: swapReceipt.hash,
      blockNumber: swapReceipt.blockNumber,
      gasUsed: swapReceipt.gasUsed.toString(),
      wrapAsPublicHandleEvents: optimizedWrapEvents,
      status: 'PASS',
    },
    baseline: {
      address: deployment.contracts.noxSwapRouter,
      deploymentTransaction: deployment.deploymentTransactions.noxSwapRouter,
      deploymentGasUsed: currentDeploymentReceipt.gasUsed.toString(),
      transactionHash: currentSwapReceipt.hash,
      gasUsed: currentSwapReceipt.gasUsed.toString(),
      wrapAsPublicHandleEvents: currentWrapEvents,
    },
    comparison: {
      perSwapGasDelta: gasDelta.toString(),
      perSwapGasReductionPercent: gasReductionBps / 100,
      wrapAsPublicHandleEventsRemoved: currentWrapEvents - optimizedWrapEvents,
      promoted: false,
      reason: 'Candidate is standalone; canonical router/orderbooks/module remain the rollback-safe production graph.',
    },
    testedAt: new Date().toISOString(),
  };
  fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  console.log(JSON.stringify(candidate.routerOptimized, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
