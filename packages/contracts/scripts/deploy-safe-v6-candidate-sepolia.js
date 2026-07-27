import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { Contract, ContractFactory, JsonRpcProvider, Wallet, parseUnits } from 'ethers';

const rootDir = path.resolve(import.meta.dirname, '..');
const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
const candidatePath = path.join(rootDir, 'deployment-sepolia-candidate.json');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const artifact = (name) => readJson(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`));
const safeArtifact = readJson(path.resolve(
  rootDir,
  '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json',
));

async function waitFor(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error(`${label} reverted: ${transaction.hash}`);
  return receipt;
}

async function transactionFees(provider) {
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

async function safeExec(safe, signer, target, data) {
  const nonce = await safe.nonce();
  const hash = await safe.getTransactionHash(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    nonce,
  );
  const signature = signer.signingKey.sign(hash).serialized;
  return waitFor('Enable candidate module through Safe', safe.execTransaction(
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
    await transactionFees(signer.provider),
  ));
}

async function main() {
  const current = readJson(deploymentPath);
  if (fs.existsSync(candidatePath)) {
    const existing = readJson(candidatePath);
    if (existing?.safeModuleV6?.address) {
      throw new Error(`Candidate already recorded at ${existing.safeModuleV6.address}.`);
    }
  }
  const provider = new JsonRpcProvider(rpcUrl, current.chainId, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const safe = new Contract(current.safe.address, safeArtifact.abi, wallet);
  if (!(await safe.isOwner(wallet.address))) throw new Error('The deployment wallet is not a Safe owner.');
  const canonicalV5WasEnabled = await safe.isModuleEnabled(current.safe.module);

  const compiled = artifact('NoxSafeModule');
  const factory = new ContractFactory(compiled.abi, compiled.bytecode, wallet);
  const module = await factory.deploy(
    current.safe.address,
    current.contracts.noxSwapRouter,
    current.safe.orderBook,
    current.contracts.noxCompute,
    [
      current.contracts.cUSDC,
      current.contracts.cETH,
      current.contracts.cWBTC,
      current.contracts.cSOL,
    ],
    await transactionFees(provider),
  );
  const deploymentTransaction = module.deploymentTransaction();
  console.log(`NoxSafeModule V6 candidate deployment: ${deploymentTransaction.hash}`);
  await module.waitForDeployment();
  const moduleAddress = await module.getAddress();

  const enableData = safe.interface.encodeFunctionData('enableModule', [moduleAddress]);
  const enableReceipt = await safeExec(safe, wallet, current.safe.address, enableData);
  if (!(await safe.isModuleEnabled(moduleAddress))) throw new Error('Candidate V6 module was not enabled.');
  if (canonicalV5WasEnabled && !(await safe.isModuleEnabled(current.safe.module))) {
    throw new Error('Safety invariant failed: canonical V5 was disabled.');
  }

  const candidate = {
    network: current.network,
    chainId: current.chainId,
    createdAt: new Date().toISOString(),
    canonicalBackup: {
      router: current.contracts.noxSwapRouter,
      safeModule: current.safe.module,
      safeModuleVersion: current.safe.moduleVersion,
    },
    safeModuleV6: {
      address: moduleAddress,
      deploymentTransaction: deploymentTransaction.hash,
      enableTransaction: enableReceipt.hash,
      enabled: true,
      canonicalV5WasEnabled,
      canonicalV5StillEnabled: await safe.isModuleEnabled(current.safe.module),
    },
  };
  fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  console.log(JSON.stringify(candidate, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
