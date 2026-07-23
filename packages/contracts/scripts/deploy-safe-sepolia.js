import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { Contract, ContractFactory, JsonRpcProvider, Wallet, getAddress } from 'ethers';
import { syncClientArtifacts } from './sync-client-artifacts.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const CHAIN_ID = 11155111;
const SAFE_VERSION = '1.4.1';
// Canonical Safe v1.4.1 Sepolia deployments from @safe-global/safe-deployments.
const SAFE_SINGLETON = '0x41675C099F32341bf84BFc5382aF534df5C7461a';
const SAFE_PROXY_FACTORY = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';

if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const loadArtifact = (name) => readJson(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`));
const loadSafeArtifact = (relativePath) => readJson(path.resolve(rootDir, '../../node_modules/@safe-global/safe-smart-account', relativePath));

async function waitFor(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error(`${label} reverted: ${transaction.hash}`);
  return receipt;
}

async function main() {
  const deploymentPath = path.join(rootDir, 'deployment-sepolia.json');
  const current = readJson(deploymentPath);
  const provider = new JsonRpcProvider(rpcUrl, CHAIN_ID, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  if (wallet.address.toLowerCase() !== current.deployer.toLowerCase()) {
    throw new Error('Safe demo deployment must use the existing deployment owner.');
  }
  if (await provider.getCode(SAFE_SINGLETON) === '0x' || await provider.getCode(SAFE_PROXY_FACTORY) === '0x') {
    throw new Error('Canonical Safe v1.4.1 Sepolia deployments are not available at the expected addresses.');
  }

  const safeArtifact = loadSafeArtifact('build/artifacts/contracts/Safe.sol/Safe.json');
  const factoryArtifact = loadSafeArtifact('build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json');
  const safeInterface = new Contract(SAFE_SINGLETON, safeArtifact.abi, wallet).interface;
  const proxyFactory = new Contract(SAFE_PROXY_FACTORY, factoryArtifact.abi, wallet);
  const initializer = safeInterface.encodeFunctionData('setup', [
    [wallet.address],
    1,
    '0x0000000000000000000000000000000000000000',
    '0x',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    0,
    '0x0000000000000000000000000000000000000000',
  ]);
  const saltNonce = BigInt(Date.now());
  const safeAddress = getAddress(await proxyFactory.createProxyWithNonce.staticCall(SAFE_SINGLETON, initializer, saltNonce));
  const safeDeployment = await waitFor('Deploy Safe proxy', proxyFactory.createProxyWithNonce(SAFE_SINGLETON, initializer, saltNonce));

  const moduleArtifact = loadArtifact('NoxSafeModule');
  const moduleFactory = new ContractFactory(moduleArtifact.abi, moduleArtifact.bytecode, wallet);
  const module = await moduleFactory.deploy(
    safeAddress,
    current.contracts.noxSwapRouter,
    current.contracts.limitOrderBook,
    current.contracts.noxCompute,
    [current.contracts.cUSDC, current.contracts.cETH, current.contracts.cWBTC, current.contracts.cSOL],
  );
  const moduleDeployment = module.deploymentTransaction();
  console.log(`Nox Safe module deployment: ${moduleDeployment.hash}`);
  await module.waitForDeployment();
  const moduleAddress = await module.getAddress();

  const safe = new Contract(safeAddress, safeArtifact.abi, wallet);
  const safeNonce = await safe.nonce();
  const enableData = safe.interface.encodeFunctionData('enableModule', [moduleAddress]);
  const safeTxHash = await safe.getTransactionHash(
    safeAddress,
    0,
    enableData,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    safeNonce,
  );
  const signature = wallet.signingKey.sign(safeTxHash).serialized;
  const enableModule = await waitFor('Enable Nox Safe module', safe.execTransaction(
    safeAddress,
    0,
    enableData,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    signature,
  ));
  if (!(await safe.isModuleEnabled(moduleAddress))) throw new Error('Safe module did not enable.');

  const next = {
    ...current,
    safe: {
      version: SAFE_VERSION,
      singleton: SAFE_SINGLETON,
      proxyFactory: SAFE_PROXY_FACTORY,
      address: safeAddress,
      module: moduleAddress,
      owner: wallet.address,
      threshold: 1,
      moduleEnabled: true,
    },
    deploymentTransactions: {
      ...current.deploymentTransactions,
      safe: safeDeployment.hash,
      noxSafeModule: moduleDeployment.hash,
      noxSafeModuleEnable: enableModule.hash,
    },
    safeExplorerUrl: `https://sepolia.etherscan.io/address/${safeAddress}`,
    noxSafeModuleExplorerUrl: `https://sepolia.etherscan.io/address/${moduleAddress}`,
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
