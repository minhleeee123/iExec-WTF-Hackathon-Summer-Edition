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

test('web and contracts reference the same current Sepolia deployment and ABI snapshot', () => {
  const contracts = json('deployment-sepolia.json');
  const web = JSON.parse(
    fs.readFileSync(path.join(workspace, 'apps/web/src/deployment.json'), 'utf8'),
  );
  assert.equal(web.chainId, 11155111);
  assert.deepEqual(web.contracts, contracts.contracts);
  assert.equal(web.pool.liquidityTransaction, contracts.pool.liquidityTransaction);
  const canonicalAbi = read('client/abis.js');
  const webAbi = fs.readFileSync(path.join(workspace, 'apps/web/src/contracts.js'), 'utf8');
  assert.equal(
    webAbi,
    canonicalAbi.replace(
      '// Canonical browser-safe ABI surface. Run `npm run sync:client` after editing.',
      '// Generated from packages/contracts/client/abis.js. Do not edit directly.',
    ),
  );
});

test('runtime source does not expose retired mocks or embedded private keys', () => {
  const app = fs.readFileSync(path.join(workspace, 'apps/web/src/App.jsx'), 'utf8');
  const mcp = fs.readFileSync(path.join(workspace, 'apps/mcp-server/src/server.js'), 'utf8');
  const deploymentScript = read('scripts/deploy-sepolia.js');
  const runtime = `${app}\n${mcp}\n${deploymentScript}`;

  assert.doesNotMatch(runtime, /shadowBalance|Math\.random|0xelim_7984/);
  assert.doesNotMatch(runtime, /PRIVATE_KEY\s*=\s*['"][0-9a-f]{64}['"]/i);
  assert.match(mcp, /process\.env\.PRIVATE_KEY/);
  assert.match(mcp, /addresses\.limitOrderBook/);
});
