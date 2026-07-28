import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';
import { syncClientArtifacts } from './sync-client-artifacts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const CHAIN_ID = 11155111;

if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const loadArtifact = (name) => readJson(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`));

async function main() {
  const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
  const current = readJson(deploymentPath);
  const provider = new JsonRpcProvider(rpcUrl, CHAIN_ID, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  if (wallet.address.toLowerCase() !== current.deployer.toLowerCase()) {
    throw new Error('Safe factory deployment must use the existing deployment owner.');
  }
  if (!current.safe?.singleton || !current.safe.proxyFactory || !current.safe.address || !current.safe.module) {
    throw new Error('Canonical Safe singleton, proxy factory, legacy Safe, and module are required.');
  }
  if (current.contracts.noxSafeFactory) {
    const code = await provider.getCode(current.contracts.noxSafeFactory);
    if (code !== '0x') throw new Error(`NoxSafeFactory is already deployed at ${current.contracts.noxSafeFactory}.`);
  }

  const artifact = loadArtifact('NoxSafeFactory');
  const factory = await new ContractFactory(artifact.abi, artifact.bytecode, wallet).deploy(
    current.safe.singleton,
    current.safe.proxyFactory,
    current.contracts.noxSwapRouter,
    current.safe.orderBook ?? current.contracts.limitOrderBook,
    current.contracts.noxCompute,
    [current.contracts.cUSDC, current.contracts.cETH, current.contracts.cWBTC, current.contracts.cSOL],
    current.safe.owner,
    current.safe.address,
    current.safe.module,
  );
  const transaction = factory.deploymentTransaction();
  console.log(`NoxSafeFactory deployment: ${transaction.hash}`);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  const [legacySafe, legacyModule, registeredOwner] = await Promise.all([
    factory.safeOf(current.safe.owner),
    factory.moduleOf(current.safe.address),
    factory.registeredOwner(current.safe.address),
  ]);
  if (
    legacySafe.toLowerCase() !== current.safe.address.toLowerCase()
    || legacyModule.toLowerCase() !== current.safe.module.toLowerCase()
    || registeredOwner.toLowerCase() !== current.safe.owner.toLowerCase()
  ) throw new Error('Factory legacy Safe registration does not match the canonical deployment.');

  const next = {
    ...current,
    contracts: {
      ...current.contracts,
      noxSafeFactory: factoryAddress,
    },
    safe: {
      ...current.safe,
      factory: factoryAddress,
      accountModel: 'one-safe-per-owner',
    },
    deploymentTransactions: {
      ...current.deploymentTransactions,
      noxSafeFactory: transaction.hash,
    },
    noxSafeFactoryExplorerUrl: `https://sepolia.etherscan.io/address/${factoryAddress}`,
    multiSafeDeployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deploymentPath, `${JSON.stringify(next, null, 2)}\n`);
  syncClientArtifacts();
  console.log(JSON.stringify({ factory: factoryAddress, legacySafe, legacyModule, registeredOwner }, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
