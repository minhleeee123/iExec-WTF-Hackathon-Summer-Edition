import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { Contract, ContractFactory, JsonRpcProvider, Wallet } from 'ethers';
import { syncClientArtifacts } from './sync-client-artifacts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const SENTINEL = '0x0000000000000000000000000000000000000001';
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const artifact = (name) => readJson(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`));
const safeArtifact = () => readJson(path.resolve(rootDir, '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json'));

async function waitFor(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error(`${label} reverted: ${transaction.hash}`);
  return receipt;
}

async function safeExec(safe, signer, target, data) {
  const nonce = await safe.nonce();
  const hash = await safe.getTransactionHash(target, 0, data, 0, 0, 0, 0, '0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000', nonce);
  const signature = signer.signingKey.sign(hash).serialized;
  return waitFor('Execute Safe configuration transaction', safe.execTransaction(
    target, 0, data, 0, 0, 0, 0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    signature,
  ));
}

async function deploy(name, signer, args = []) {
  const compiled = artifact(name);
  const contract = await new ContractFactory(compiled.abi, compiled.bytecode, signer).deploy(...args);
  const transaction = contract.deploymentTransaction();
  console.log(`${name} deployment: ${transaction.hash}`);
  await contract.waitForDeployment();
  return { address: await contract.getAddress(), transactionHash: transaction.hash };
}

async function main() {
  const current = readJson(deploymentPath);
  if (!current.safe?.address || !current.safe.module) throw new Error('Deploy the Safe treasury before upgrading it.');
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const safe = new Contract(current.safe.address, safeArtifact().abi, wallet);
  if (!(await safe.isOwner(wallet.address))) throw new Error('The deployment wallet is not a Safe owner.');

  const orderBook = await deploy('NoxLimitOrderBook', wallet, [
    current.contracts.noxSwapRouter,
    current.feeds.ethUsd,
    current.contracts.cUSDC,
    current.contracts.cETH,
  ]);
  const module = await deploy('NoxSafeModule', wallet, [
    current.safe.address,
    current.contracts.noxSwapRouter,
    orderBook.address,
    current.contracts.noxCompute,
    [current.contracts.cUSDC, current.contracts.cETH, current.contracts.cWBTC, current.contracts.cSOL],
  ]);

  if (await safe.isModuleEnabled(current.safe.module)) {
    const page = await safe.getModulesPaginated(SENTINEL, 100);
    let previous = SENTINEL;
    let found = false;
    for (const enabledModule of page[0]) {
      if (enabledModule.toLowerCase() === current.safe.module.toLowerCase()) {
        found = true;
        break;
      }
      previous = enabledModule;
    }
    if (!found) throw new Error('Enabled legacy module was not found in the Safe module list.');
    const disableData = safe.interface.encodeFunctionData('disableModule', [previous, current.safe.module]);
    await safeExec(safe, wallet, current.safe.address, disableData);
  }
  const enableData = safe.interface.encodeFunctionData('enableModule', [module.address]);
  const enableReceipt = await safeExec(safe, wallet, current.safe.address, enableData);
  if (!(await safe.isModuleEnabled(module.address))) throw new Error('Upgraded Nox Safe module is not enabled.');

  const next = {
    ...current,
    safe: {
      ...current.safe,
      module: module.address,
      orderBook: orderBook.address,
      moduleEnabled: true,
    },
    deploymentTransactions: {
      ...current.deploymentTransactions,
      safeLimitOrderBook: orderBook.transactionHash,
      noxSafeModuleV2: module.transactionHash,
      noxSafeModuleV2Enable: enableReceipt.hash,
    },
    noxSafeModuleExplorerUrl: `https://sepolia.etherscan.io/address/${module.address}`,
    safeOrderBookExplorerUrl: `https://sepolia.etherscan.io/address/${orderBook.address}`,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deploymentPath, `${JSON.stringify(next, null, 2)}\n`);
  syncClientArtifacts();
  console.log(JSON.stringify(next.safe, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
