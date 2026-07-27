import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { Contract, JsonRpcProvider, Wallet, parseUnits } from 'ethers';
import { syncClientArtifacts } from './sync-client-artifacts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
const candidatePath = path.join(rootDir, 'deployment-sepolia-candidate.json');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const SENTINEL = '0x0000000000000000000000000000000000000001';
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const safeArtifact = readJson(path.resolve(
  rootDir,
  '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json',
));

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

async function safeExec(safe, signer, target, data) {
  const nonce = await safe.nonce();
  const hash = await safe.getTransactionHash(
    target, 0, data, 0, 0, 0, 0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    nonce,
  );
  const signature = signer.signingKey.sign(hash).serialized;
  const transaction = await safe.execTransaction(
    target, 0, data, 0, 0, 0, 0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    signature,
    await fees(signer.provider),
  );
  console.log(`Disable canonical V5 after V6 validation: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error('V5 disable transaction reverted.');
  return receipt;
}

async function main() {
  const current = readJson(deploymentPath);
  const candidate = readJson(candidatePath);
  const v6 = candidate.safeModuleV6;
  if (v6?.runtimeTest?.status !== 'PASS') throw new Error('V6 runtime test has not passed.');
  if (current.safe.moduleVersion !== 5 || current.safe.module.toLowerCase() !== candidate.canonicalBackup.safeModule.toLowerCase()) {
    throw new Error('Canonical deployment no longer matches the candidate backup.');
  }
  const provider = new JsonRpcProvider(rpcUrl, current.chainId, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const safe = new Contract(current.safe.address, safeArtifact.abi, wallet);
  if (!(await safe.isOwner(wallet.address))) throw new Error('The deployment wallet is not a Safe owner.');
  if (!(await safe.isModuleEnabled(v6.address))) throw new Error('Validated V6 candidate is not enabled.');

  let disableReceipt = null;
  if (await safe.isModuleEnabled(current.safe.module)) {
    const [modules] = await safe.getModulesPaginated(SENTINEL, 100);
    let previous = SENTINEL;
    let found = false;
    for (const enabled of modules) {
      if (enabled.toLowerCase() === current.safe.module.toLowerCase()) {
        found = true;
        break;
      }
      previous = enabled;
    }
    if (!found) throw new Error('Enabled V5 module was not found in the linked list.');
    const data = safe.interface.encodeFunctionData('disableModule', [previous, current.safe.module]);
    disableReceipt = await safeExec(safe, wallet, current.safe.address, data);
  }
  if (!(await safe.isModuleEnabled(v6.address))) throw new Error('V6 was disabled during promotion.');
  if (await safe.isModuleEnabled(current.safe.module)) throw new Error('V5 remains enabled after promotion.');

  const next = {
    ...current,
    safe: {
      ...current.safe,
      module: v6.address,
      moduleVersion: 6,
      moduleEnabled: true,
    },
    deploymentTransactions: {
      ...current.deploymentTransactions,
      noxSafeModuleV6: v6.deploymentTransaction,
      noxSafeModuleV6Enable: v6.enableTransaction,
      ...(disableReceipt ? { noxSafeModuleV5Disable: disableReceipt.hash } : {}),
      noxSafeModuleV6RuntimeTest: v6.runtimeTest.transactionHash,
    },
    noxSafeModuleExplorerUrl: `https://sepolia.etherscan.io/address/${v6.address}`,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deploymentPath, `${JSON.stringify(next, null, 2)}\n`);
  candidate.safeModuleV6.promotedAt = new Date().toISOString();
  candidate.safeModuleV6.v5DisableTransaction = disableReceipt?.hash ?? null;
  fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  syncClientArtifacts();
  console.log(JSON.stringify(next.safe, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
