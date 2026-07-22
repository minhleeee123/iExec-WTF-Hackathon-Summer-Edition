import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const deployment = JSON.parse(fs.readFileSync(path.join(root, 'deployment-sepolia.json'), 'utf8'));
const baseUrl = 'https://sourcify.dev/server';
const chainId = deployment.chainId;

const targets = [
  ['NoxTestToken', deployment.contracts.underlyingUSDC, deployment.deploymentTransactions.underlyingUSDC],
  ['NoxTestToken', deployment.contracts.underlyingWETH, deployment.deploymentTransactions.underlyingWETH],
  ['NoxConfidentialToken', deployment.contracts.cUSDC, deployment.deploymentTransactions.cUSDC],
  ['NoxConfidentialToken', deployment.contracts.cETH, deployment.deploymentTransactions.cETH],
  ['NoxTestToken', deployment.contracts.underlyingWBTC, deployment.deploymentTransactions.underlyingWBTC],
  ['NoxTestToken', deployment.contracts.underlyingSOL, deployment.deploymentTransactions.underlyingSOL],
  ['NoxConfidentialToken', deployment.contracts.cWBTC, deployment.deploymentTransactions.cWBTC],
  ['NoxConfidentialToken', deployment.contracts.cSOL, deployment.deploymentTransactions.cSOL],
  ['NoxSwap', deployment.contracts.noxSwapRouter, deployment.deploymentTransactions.noxSwapRouter],
  ['NoxLimitOrderBook', deployment.contracts.limitOrderBook, deployment.deploymentTransactions.limitOrderBook],
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function getBuildData(contractName) {
  const artifactPath = path.join(root, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const buildInfoPath = path.join(root, 'artifacts', 'build-info', `${artifact.buildInfoId}.json`);
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
  return {
    stdJsonInput: buildInfo.input,
    compilerVersion: buildInfo.solcLongVersion,
    contractIdentifier: `${artifact.inputSourceName}:${contractName}`,
  };
}

async function lookup(address) {
  const response = await fetch(`${baseUrl}/v2/contract/${chainId}/${address}`);
  return response.ok ? response.json() : null;
}

async function verify(contractName, address, creationTransactionHash) {
  const existing = await lookup(address);
  if (existing?.match) return { contractName, address, ...existing, status: 'already-verified' };

  const response = await fetch(`${baseUrl}/v2/verify/${chainId}/${address}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...getBuildData(contractName),
      creationTransactionHash,
    }),
  });
  const submitted = await response.json();
  if (!response.ok || !submitted.verificationId) {
    throw new Error(`${contractName} submission failed: ${JSON.stringify(submitted)}`);
  }

  let job;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const poll = await fetch(`${baseUrl}/v2/verify/${submitted.verificationId}`);
    job = await poll.json();
    if (job.isJobCompleted || job.status === 'verified' || job.status === 'failed') break;
    await sleep(3000);
  }
  const verified = await lookup(address);
  if (!verified?.match) throw new Error(`${contractName} was not verified: ${JSON.stringify(job)}`);
  return { contractName, address, verificationId: submitted.verificationId, ...verified, status: 'verified' };
}

const results = [];
for (const target of targets) {
  const result = await verify(...target);
  results.push(result);
  console.log(`${result.contractName} ${result.address}: ${result.match}`);
}
console.log(JSON.stringify(results, null, 2));
