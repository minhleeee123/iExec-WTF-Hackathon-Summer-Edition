import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Contract, JsonRpcProvider, Wallet, formatEther } from 'ethers';

const rootDir = path.resolve(import.meta.dirname, '..');
const deployment = JSON.parse(fs.readFileSync(path.join(rootDir, 'deployment-sepolia.json'), 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const runUnwrap = process.env.SAFE_UNWRAP_E2E === 'true';
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

const artifact = (name) => JSON.parse(
  fs.readFileSync(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`), 'utf8'),
);
const safeArtifact = JSON.parse(
  fs.readFileSync(
    path.resolve(rootDir, '../../node_modules/@safe-global/safe-smart-account/build/artifacts/contracts/Safe.sol/Safe.json'),
    'utf8',
  ),
);

async function send(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1, `${label} must succeed`);
  return receipt;
}

async function executeSafe({ safe, signer, target, data }) {
  const nonce = await safe.nonce();
  const transactionHash = await safe.getTransactionHash(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    nonce,
  );
  const signature = signer.signingKey.sign(transactionHash).serialized;
  return send('Execute Safe unwrap request', safe.execTransaction(
    target,
    0,
    data,
    0,
    0,
    0,
    0,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    signature,
  ));
}

function eventFrom(contract, receipt, name) {
  return receipt.logs
    .map((log) => {
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === name);
}

async function publicDecryptWithRetry(client, handle, attempts = 12) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.publicDecrypt(handle);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw lastError;
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const safe = new Contract(deployment.safe.address, safeArtifact.abi, wallet);
  const module = new Contract(deployment.safe.module, artifact('NoxSafeModule').abi, wallet);
  const wrapper = new Contract(deployment.contracts.cUSDC, artifact('NoxConfidentialToken').abi, wallet);
  const underlying = new Contract(deployment.contracts.underlyingUSDC, artifact('NoxTestToken').abi, wallet);

  assert.notEqual(await provider.getCode(deployment.safe.module), '0x', 'Safe module bytecode must exist');
  assert.equal(await safe.isOwner(wallet.address), true, 'E2E signer must be a Safe owner');
  assert.equal(await safe.isModuleEnabled(deployment.safe.module), true, 'Current Nox module must be enabled');
  assert.equal((await module.safe()).toLowerCase(), deployment.safe.address.toLowerCase());
  assert.equal((await module.router()).toLowerCase(), deployment.contracts.noxSwapRouter.toLowerCase());
  assert.equal((await module.orderBook()).toLowerCase(), deployment.safe.orderBook.toLowerCase());
  for (const token of ['cUSDC', 'cETH', 'cWBTC', 'cSOL']) {
    assert.equal(await module.immutableToken(deployment.contracts[token]), true, `${token} must be allowlisted`);
  }
  console.log(`Safe module configuration: PASS (${formatEther(await provider.getBalance(wallet.address))} Sepolia ETH)`);

  if (!runUnwrap) {
    console.log('Safe unwrap write test: SKIP (set SAFE_UNWRAP_E2E=true to run)');
    return;
  }

  const amount = 1n;
  const client = await createEthersHandleClient(wallet);
  const currentHandle = await wrapper.confidentialBalanceOf(deployment.safe.address);
  const currentBalance = await client.decrypt(currentHandle);
  assert(currentBalance.value >= amount, 'Safe needs at least one cUSDC base unit for the unwrap test');
  const publicBalanceBefore = await underlying.balanceOf(wallet.address);

  const encrypted = await client.encryptInput(amount, 'uint256', deployment.safe.module);
  await send(
    'Prepare Safe unwrap ciphertext ACL',
    module.prepareInput(encrypted.handle, encrypted.handleProof, deployment.contracts.cUSDC),
  );
  const data = module.interface.encodeFunctionData('requestUnwrap', [
    deployment.contracts.cUSDC,
    encrypted.handle,
    wallet.address,
  ]);
  const requestReceipt = await executeSafe({
    safe,
    signer: wallet,
    target: deployment.safe.module,
    data,
  });
  const requested = eventFrom(module, requestReceipt, 'SafeUnwrapRequested');
  assert(requested, 'SafeUnwrapRequested must be emitted');
  const requestId = requested.args.unwrapRequestId;
  assert.equal((await wrapper.unwrapRequester(requestId)).toLowerCase(), wallet.address.toLowerCase());

  const publicResult = await publicDecryptWithRetry(client, requestId);
  assert.equal(publicResult.value, amount, 'Public unwrap proof must preserve the requested amount');
  await send('Finalize Safe unwrap proof', wrapper.finalizeUnwrap(requestId, publicResult.decryptionProof));
  assert.equal(await wrapper.unwrapRequester(requestId), '0x0000000000000000000000000000000000000000');
  assert.equal(await underlying.balanceOf(wallet.address), publicBalanceBefore + amount);
  console.log(`Safe unwrap lifecycle: PASS (${requestId})`);
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
