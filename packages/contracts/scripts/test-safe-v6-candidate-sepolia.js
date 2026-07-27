import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Contract, JsonRpcProvider, Wallet, parseUnits } from 'ethers';

const rootDir = path.resolve(import.meta.dirname, '..');
const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
const candidatePath = path.join(rootDir, 'deployment-sepolia-candidate.json');
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const artifact = (name) => JSON.parse(
  fs.readFileSync(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`), 'utf8'),
);
const safeArtifact = JSON.parse(
  fs.readFileSync(
    path.resolve(rootDir, '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json'),
    'utf8',
  ),
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

async function executeSafe({ provider, safe, signer, target, data }) {
  const nonce = await safe.nonce();
  const signature = `0x${signer.address.slice(2).padStart(64, '0')}${'0'.repeat(64)}01`;
  const transaction = await safe.execTransaction(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    signature,
    await fees(provider),
  );
  console.log(`V6 one-transaction Safe swap: ${transaction.hash}`);
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1);
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

function eventFrom(contract, receipt, name) {
  return receipt.logs
    .map((log) => {
      try { return contract.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === name);
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl, deployment.chainId, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const safe = new Contract(deployment.safe.address, safeArtifact.abi, wallet);
  const moduleAddress = candidate.safeModuleV6.address;
  const module = new Contract(moduleAddress, artifact('NoxSafeModule').abi, wallet);
  const inputToken = new Contract(
    deployment.contracts.cUSDC,
    artifact('NoxConfidentialToken').abi,
    wallet,
  );
  assert.equal(await safe.isOwner(wallet.address), true);
  assert.equal(await safe.isModuleEnabled(moduleAddress), true);
  assert.equal((await module.safe()).toLowerCase(), deployment.safe.address.toLowerCase());
  assert.equal((await module.router()).toLowerCase(), deployment.contracts.noxSwapRouter.toLowerCase());

  const client = await createEthersHandleClient(wallet);
  const safeBalanceHandle = await inputToken.confidentialBalanceOf(deployment.safe.address);
  const safeBalance = await decryptWithRetry(client, safeBalanceHandle);
  const amountValue = 1_000_000n;
  assert(safeBalance.value >= amountValue, 'Safe needs at least 1 cUSDC for the V6 runtime test.');
  const [amount, minOut] = await Promise.all([
    client.encryptInput(amountValue, 'uint256', moduleAddress),
    client.encryptInput(0n, 'uint256', moduleAddress),
  ]);
  const latestBlock = await provider.getBlock('latest');
  const data = module.interface.encodeFunctionData('prepareAndSwap', [
    deployment.contracts.cUSDC,
    deployment.contracts.cETH,
    amount.handle,
    amount.handleProof,
    minOut.handle,
    minOut.handleProof,
    wallet.address,
    wallet.address,
    latestBlock.timestamp + 1200,
  ]);
  const receipt = await executeSafe({
    provider,
    safe,
    signer: wallet,
    target: moduleAddress,
    data,
  });
  const event = eventFrom(module, receipt, 'SafeSwapExecuted');
  assert(event, 'SafeSwapExecuted must be emitted.');
  const [output, refund] = await Promise.all([
    decryptWithRetry(client, event.args.encryptedOutput),
    decryptWithRetry(client, event.args.encryptedRefund),
  ]);
  assert.equal(output.value > 0n || refund.value === amountValue, true, 'V6 swap must settle or fully refund.');
  assert.equal(await module.consumedInput(amount.handle), true);
  assert.equal(await module.consumedInput(minOut.handle), true);

  candidate.safeModuleV6.runtimeTest = {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    transactionCountAfterEncryption: 1,
    status: 'PASS',
    testedAt: new Date().toISOString(),
  };
  fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  console.log(JSON.stringify(candidate.safeModuleV6.runtimeTest, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
