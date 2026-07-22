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
  const orders = read('contracts/NoxLimitOrderBook.sol');
  const combined = `${token}\n${router}\n${orders}`;

  assert.match(token, /ERC20ToERC7984Wrapper/);
  assert.match(router, /Nox\.fromExternal/);
  assert.match(router, /Nox\.(mul|div|add|sub)/);
  assert.match(router, /Nox\.ge/);
  assert.match(router, /Nox\.select/);
  assert.match(router, /encryptedRefund/);
  assert.match(orders, /confidentialTransferFrom/);
  assert.match(orders, /latestRoundData/);
  assert.doesNotMatch(combined, /shadowBalance|estimatedAmount|mintTestTokens/);
  assert.doesNotMatch(router, /keccak256\(abi\.encodePacked\(msg\.sender/);
});

test('compiled router ABI requires encrypted input, minOut proofs, and deadline', () => {
  const routerArtifact = artifact('NoxSwap');
  const swap = routerArtifact.abi.find((entry) => entry.type === 'function' && entry.name === 'confidentialSwap');
  assert(swap);
  assert.deepEqual(
    swap.inputs.map((input) => input.type),
    ['address', 'address', 'bytes32', 'bytes', 'bytes32', 'bytes', 'uint64'],
  );
  assert(routerArtifact.abi.some((entry) => entry.type === 'function' && entry.name === 'confidentialSwapAuthorized'));
  assert(routerArtifact.abi.some((entry) => entry.type === 'event' && entry.name === 'SwapExecuted'));
  assert(routerArtifact.abi.some((entry) => entry.type === 'function' && entry.name === 'tokenURI'));
});

test('compiled limit order ABI supports create, execute, cancel, and expiry refund', () => {
  const orderArtifact = artifact('NoxLimitOrderBook');
  for (const name of ['createOrder', 'executeOrder', 'cancelOrder', 'expireOrder', 'canExecute']) {
    assert(orderArtifact.abi.some((entry) => entry.type === 'function' && entry.name === name), `${name} missing`);
  }
  assert(orderArtifact.abi.some((entry) => entry.type === 'event' && entry.name === 'OrderExecuted'));
});

test('compiled contracts stay below the EVM runtime bytecode limit', () => {
  for (const name of ['NoxTestToken', 'NoxConfidentialToken', 'NoxSwap', 'NoxLimitOrderBook']) {
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

test('runtime source does not expose retired mocks or embedded private keys', () => {
  const app = fs.readFileSync(path.join(workspace, 'source-code/frontend/src/App.jsx'), 'utf8');
  const mcp = read('mcp-server.js');
  const deploymentScript = read('scripts/deploy-sepolia.js');
  const runtime = `${app}\n${mcp}\n${deploymentScript}`;

  assert.doesNotMatch(runtime, /shadowBalance|Math\.random|0xelim_7984/);
  assert.doesNotMatch(runtime, /PRIVATE_KEY\s*=\s*['"][0-9a-f]{64}['"]/i);
  assert.match(mcp, /process\.env\.PRIVATE_KEY/);
  assert.match(mcp, /addresses\.limitOrderBook/);
});
