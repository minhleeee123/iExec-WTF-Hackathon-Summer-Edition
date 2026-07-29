import fs from 'node:fs';
import path from 'node:path';

import { AbiCoder, JsonRpcProvider, getAddress, keccak256 } from 'ethers';

import {
  assessSourcifyReproducibility,
  evaluateTargetVerification,
} from './lib/deployment-verification.js';

const contractsRoot = path.resolve(import.meta.dirname, '..');
const deployment = JSON.parse(
  fs.readFileSync(path.join(contractsRoot, 'deployment-sepolia.json'), 'utf8'),
);
const rpcUrl =
  process.env.SEPOLIA_RPC_URL ??
  process.env.SEPOLIA_RPC ??
  'https://ethereum-sepolia-rpc.publicnode.com';
const provider = new JsonRpcProvider(rpcUrl, deployment.chainId, {
  staticNetwork: true,
});
const abiCoder = AbiCoder.defaultAbiCoder();

function loadArtifact(contractName) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        contractsRoot,
        'artifacts',
        'contracts',
        `${contractName}.sol`,
        `${contractName}.json`,
      ),
      'utf8',
    ),
  );
}

function loadBuildInfo(artifact) {
  return JSON.parse(
    fs.readFileSync(
      path.join(contractsRoot, 'artifacts', 'build-info', `${artifact.buildInfoId}.json`),
      'utf8',
    ),
  );
}

function strip0x(value) {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function stripSolcMetadata(bytecode) {
  const hex = strip0x(bytecode).toLowerCase();
  if (hex.length < 4) throw new Error('Bytecode is too short to contain Solidity metadata.');
  const metadataBytes = Number.parseInt(hex.slice(-4), 16);
  const executableEnd = hex.length - (metadataBytes + 2) * 2;
  if (executableEnd <= 0) throw new Error('Invalid Solidity metadata length.');
  return `0x${hex.slice(0, executableEnd)}`;
}

async function sourcifyStatus(address) {
  try {
    const response = await fetch(
      `https://sourcify.dev/server/v2/contract/${deployment.chainId}/${address}`,
    );
    if (response.status === 404) return 'not verified';
    if (!response.ok) return `lookup HTTP ${response.status}`;
    const result = await response.json();
    return result.match ?? 'verified';
  } catch {
    return 'lookup unavailable';
  }
}

async function sourcifyDetails(address) {
  const response = await fetch(
    `https://sourcify.dev/server/v2/contract/${deployment.chainId}/${address}?fields=all`,
  );
  if (!response.ok) {
    throw new Error(`Sourcify detail lookup returned HTTP ${response.status}.`);
  }
  return response.json();
}

const targets = [
  {
    label: 'Router V2',
    contractName: 'NoxSwap',
    address: deployment.contracts.noxSwapRouter,
    transactionHash: deployment.deploymentTransactions.noxSwapRouter,
    constructorTypes: [],
    constructorArgs: [],
    requireExactMetadata: true,
  },
  {
    label: 'Safe confidential orderbook',
    contractName: 'NoxLimitOrderBook',
    address: deployment.safe.orderBook,
    transactionHash: deployment.deploymentTransactions.safeLimitOrderBook,
    constructorTypes: ['address', 'address', 'address', 'address'],
    constructorArgs: [
      deployment.contracts.noxSwapRouter,
      deployment.feeds.ethUsd,
      deployment.contracts.cUSDC,
      deployment.contracts.cETH,
    ],
    requireExactMetadata: true,
  },
  {
    label: `Safe Module V${deployment.safe.moduleVersion}`,
    contractName: 'NoxSafeModule',
    address: deployment.safe.module,
    transactionHash:
      deployment.deploymentTransactions[
        `noxSafeModuleV${deployment.safe.moduleVersion}`
      ],
    constructorTypes: ['address', 'address', 'address', 'address', 'address[]'],
    constructorArgs: [
      deployment.safe.address,
      deployment.contracts.noxSwapRouter,
      deployment.safe.orderBook,
      deployment.contracts.noxCompute,
      [
        deployment.contracts.cUSDC,
        deployment.contracts.cETH,
        deployment.contracts.cWBTC,
        deployment.contracts.cSOL,
      ],
    ],
    requireExactMetadata: false,
  },
  {
    label: 'Per-account Safe factory',
    contractName: 'NoxSafeFactory',
    address: deployment.contracts.noxSafeFactory,
    transactionHash: deployment.deploymentTransactions.noxSafeFactory,
    constructorTypes: ['address', 'address', 'address', 'address', 'address', 'address[]', 'address', 'address', 'address'],
    constructorArgs: [
      deployment.safe.singleton,
      deployment.safe.proxyFactory,
      deployment.contracts.noxSwapRouter,
      deployment.safe.orderBook,
      deployment.contracts.noxCompute,
      [
        deployment.contracts.cUSDC,
        deployment.contracts.cETH,
        deployment.contracts.cWBTC,
        deployment.contracts.cSOL,
      ],
      deployment.safe.owner,
      deployment.safe.address,
      deployment.safe.module,
    ],
    requireExactMetadata: true,
    allowVerifiedSourceFallback: true,
  },
];

const network = await provider.getNetwork();
if (Number(network.chainId) !== deployment.chainId) {
  throw new Error(
    `Expected chain ${deployment.chainId}, received ${network.chainId.toString()}.`,
  );
}

let failed = false;
for (const target of targets) {
  const artifact = loadArtifact(target.contractName);
  const encodedArgs = abiCoder.encode(target.constructorTypes, target.constructorArgs);
  const argsHex = strip0x(encodedArgs).toLowerCase();
  const [transaction, receipt, runtimeCode, verification] = await Promise.all([
    provider.getTransaction(target.transactionHash),
    provider.getTransactionReceipt(target.transactionHash),
    provider.getCode(target.address),
    sourcifyStatus(target.address),
  ]);

  if (!transaction || !receipt) {
    throw new Error(`${target.label}: deployment transaction is unavailable.`);
  }

  const transactionData = strip0x(transaction.data).toLowerCase();
  const constructorArgsMatch =
    transactionData.length >= argsHex.length && transactionData.endsWith(argsHex);
  const creationHex = constructorArgsMatch
    ? transactionData.slice(0, transactionData.length - argsHex.length)
    : '';
  const compiledCreationHex = strip0x(artifact.bytecode).toLowerCase();
  const exactCreationMatch =
    constructorArgsMatch && creationHex === compiledCreationHex;
  const executableCreationMatch =
    constructorArgsMatch &&
    stripSolcMetadata(`0x${creationHex}`) === stripSolcMetadata(artifact.bytecode);
  const receiptAddressMatch =
    receipt.contractAddress !== null &&
    getAddress(receipt.contractAddress) === getAddress(target.address);
  const runtimePresent = runtimeCode !== '0x';
  let sourceEvidence;
  const localRequirementsPass = (
    constructorArgsMatch
    && executableCreationMatch
    && receiptAddressMatch
    && runtimePresent
    && (!target.requireExactMetadata || exactCreationMatch)
  );
  if (
    !localRequirementsPass
    && target.allowVerifiedSourceFallback
    && verification === 'exact_match'
  ) {
    const record = await sourcifyDetails(target.address);
    sourceEvidence = assessSourcifyReproducibility({
      record,
      buildInfo: loadBuildInfo(artifact),
      artifact,
      transactionData: transaction.data,
      runtimeCode,
    });
  }
  const evaluation = evaluateTargetVerification({
    constructorArgsMatch,
    executableCreationMatch,
    exactCreationMatch,
    receiptAddressMatch,
    runtimePresent,
    requireExactMetadata: target.requireExactMetadata,
    allowVerifiedSourceFallback: target.allowVerifiedSourceFallback,
    sourceEvidence,
  });
  const { pass } = evaluation;

  failed ||= !pass;
  console.log(
    JSON.stringify(
      {
        label: target.label,
        status: pass ? 'PASS' : 'FAIL',
        sourceArtifact: `${target.contractName}.sol:${target.contractName}`,
        address: getAddress(target.address),
        transactionHash: target.transactionHash,
        constructorArgsMatch,
        executableCreationMatch,
        exactCreationMatch,
        receiptAddressMatch,
        runtimeCodeHash: runtimePresent ? keccak256(runtimeCode) : null,
        sourcify: verification,
        verificationBasis: evaluation.verificationBasis,
        ...(sourceEvidence ?? {}),
      },
      null,
      2,
    ),
  );
}

if (failed) process.exitCode = 1;
