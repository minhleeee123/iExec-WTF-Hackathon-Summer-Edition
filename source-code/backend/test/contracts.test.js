import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const workspace = path.resolve(root, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (relativePath) => JSON.parse(read(relativePath));
const artifact = (name) => json(`artifacts/contracts/${name}.sol/${name}.json`);

test('contracts use official Nox encrypted types and no plaintext shadow ledger', () => {
  const token = read('contracts/NoxConfidentialToken.sol');
  const router = read('contracts/NoxSwap.sol');
  const combined = `${token}\n${router}`;

  assert.match(token, /ERC20ToERC7984Wrapper/);
  assert.match(router, /Nox\.fromExternal/);
  assert.match(router, /Nox\.(mul|div|add|sub)/);
  assert.doesNotMatch(combined, /shadowBalance|estimatedAmount|mintTestTokens/);
  assert.doesNotMatch(router, /keccak256\(abi\.encodePacked\(msg\.sender/);
});

test('compiled router ABI requires an external encrypted handle and proof', () => {
  const routerArtifact = artifact('NoxSwap');
  const swap = routerArtifact.abi.find((entry) => entry.type === 'function' && entry.name === 'confidentialSwap');
  assert(swap);
  assert.deepEqual(swap.inputs.map((input) => input.type), ['address', 'address', 'bytes32', 'bytes']);
  assert(routerArtifact.abi.some((entry) => entry.type === 'event' && entry.name === 'SwapExecuted'));
  assert(routerArtifact.abi.some((entry) => entry.type === 'function' && entry.name === 'tokenURI'));
});

test('compiled contracts stay below the EVM runtime bytecode limit', () => {
  for (const name of ['NoxTestToken', 'NoxConfidentialToken', 'NoxSwap']) {
    const runtimeBytes = (artifact(name).deployedBytecode.length - 2) / 2;
    assert(runtimeBytes > 0, `${name} must have runtime bytecode`);
    assert(runtimeBytes < 24_576, `${name} exceeds EIP-170: ${runtimeBytes} bytes`);
  }
});

test('frontend and backend reference the same current Sepolia deployment', () => {
  const backend = json('deployment-sepolia.json');
  const frontend = JSON.parse(
    fs.readFileSync(path.join(workspace, 'source-code/frontend/src/deployment.json'), 'utf8'),
  );
  assert.equal(frontend.chainId, 11155111);
  assert.deepEqual(frontend.contracts, backend.contracts);
  assert.equal(frontend.pool.liquidityTransaction, backend.pool.liquidityTransaction);
});

test('runtime source does not expose retired mock features or embedded private keys', () => {
  const app = fs.readFileSync(path.join(workspace, 'source-code/frontend/src/App.jsx'), 'utf8');
  const mcp = read('mcp-server.js');
  const deploymentScript = read('scripts/deploy-sepolia.js');
  const runtime = `${app}\n${mcp}\n${deploymentScript}`;

  assert.doesNotMatch(runtime, /shadowBalance|Math\.random|nox_create_limit_order|0xelim_7984/);
  assert.doesNotMatch(runtime, /PRIVATE_KEY\s*=\s*['"][0-9a-f]{64}['"]/i);
  assert.match(mcp, /process\.env\.PRIVATE_KEY/);
});
