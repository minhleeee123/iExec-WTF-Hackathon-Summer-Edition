import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { keccak256 } from 'ethers';

const FORBIDDEN_KEY = /(private.?key|secret|signature|authorization|plaintext|decrypted|handle|proof)/i;

export function assertEvidenceSafe(value, currentPath = 'evidence') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertEvidenceSafe(item, `${currentPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error(`Unsafe evidence field: ${currentPath}.${key}`);
    assertEvidenceSafe(item, `${currentPath}.${key}`);
  }
}

export function resolveCommitSha(repositoryRoot) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function resolveSourceState(repositoryRoot) {
  const commitSha = resolveCommitSha(repositoryRoot);
  try {
    const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
    });
    return { commitSha, dirty: status.trim().length > 0 };
  } catch {
    return { commitSha, dirty: null };
  }
}

export async function createLiveEvidence({
  assertions,
  deployment,
  provider,
  repositoryRoot,
  runnerAddress,
  toolchain,
  transactions,
  type,
}) {
  const network = await provider.getNetwork();
  const latest = await provider.getBlock('latest');
  const contracts = {};
  for (const [name, address] of Object.entries(deployment.contracts)) {
    const code = await provider.getCode(address);
    contracts[name] = { address, codeHash: keccak256(code) };
  }
  const evidence = {
    schemaVersion: 1,
    type,
    status: 'PASS',
    generatedAt: new Date().toISOString(),
    source: resolveSourceState(repositoryRoot),
    network: deployment.network,
    chainId: Number(network.chainId),
    runnerAddress,
    observedBlock: { number: latest.number, hash: latest.hash, timestamp: latest.timestamp },
    contracts,
    transactions,
    assertions,
    toolchain,
  };
  assertEvidenceSafe(evidence);
  return evidence;
}

export function writeEvidence(filePath, evidence) {
  assertEvidenceSafe(evidence);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  return filePath;
}
