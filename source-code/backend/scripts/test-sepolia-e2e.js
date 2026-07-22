import 'dotenv/config';

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Contract, JsonRpcProvider, Wallet, formatUnits, parseUnits } from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function artifact(name) {
  return readJson(path.join('artifacts', 'contracts', `${name}.sol`, `${name}.json`));
}

async function send(label, transactionPromise) {
  const transaction = await transactionPromise;
  const receipt = await transaction.wait();
  assert.equal(receipt.status, 1, `${label} must succeed`);
  console.log(`${label}: ${transaction.hash}`);
  return receipt;
}

async function decryptWithRetry(client, handle, attempts = 12) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await client.decrypt(handle);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw lastError;
}

async function waitForAcl(client, handle, expectedAccount, attempts = 12) {
  let latest;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      latest = await client.viewACL(handle);
      const authorized = [...latest.admins, ...latest.viewers].map((account) => account.toLowerCase());
      if (authorized.includes(expectedAccount.toLowerCase())) return latest;
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw lastError ?? new Error(`ACL did not index ${expectedAccount}: ${JSON.stringify(latest)}`);
}

async function main() {
  const deployment = readJson('deployment-sepolia.json');
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  assert.equal(network.chainId, 11155111n, 'E2E tests only run on Ethereum Sepolia');
  assert.equal(wallet.address, deployment.deployer, 'Test signer must be the deployment demo wallet');

  const addresses = deployment.contracts;
  for (const [name, address] of Object.entries(addresses)) {
    const code = await provider.getCode(address);
    assert.notEqual(code, '0x', `${name} must have deployed bytecode`);
  }
  console.log('Deployment bytecode: PASS');

  const tokenAbi = artifact('NoxTestToken').abi;
  const wrapperAbi = artifact('NoxConfidentialToken').abi;
  const routerAbi = artifact('NoxSwap').abi;
  const usdc = new Contract(addresses.underlyingUSDC, tokenAbi, wallet);
  const weth = new Contract(addresses.underlyingWETH, tokenAbi, wallet);
  const cUsdc = new Contract(addresses.cUSDC, wrapperAbi, wallet);
  const cEth = new Contract(addresses.cETH, wrapperAbi, wallet);
  const router = new Contract(addresses.noxSwapRouter, routerAbi, wallet);
  const handleClient = await createEthersHandleClient(wallet);

  const swapAmount = parseUnits('100', 6);
  let publicBalance = await usdc.balanceOf(wallet.address);
  if (publicBalance < swapAmount) {
    await send('Underlying faucet', usdc.faucet());
    publicBalance = await usdc.balanceOf(wallet.address);
  }
  assert(publicBalance >= swapAmount, 'Faucet must fund at least one test swap');
  await send('Approve confidential wrapper', usdc.approve(addresses.cUSDC, swapAmount));
  await send('Wrap nUSDC to cUSDC', cUsdc.wrap(wallet.address, swapAmount));

  const inputBalanceHandle = await cUsdc.confidentialBalanceOf(wallet.address);
  assert.notEqual(inputBalanceHandle, '0x'.padEnd(66, '0'), 'Wrapped balance needs a Nox handle');
  const encryptedInput = await handleClient.encryptInput(
    swapAmount,
    'uint256',
    addresses.noxSwapRouter,
  );
  assert.equal(encryptedInput.handle.length, 66, 'Encrypted input handle must be bytes32');
  assert(encryptedInput.handleProof.length > 2, 'Encrypted input proof must not be empty');

  const swapReceipt = await send(
    'Confidential swap',
    router.confidentialSwap(
      addresses.cUSDC,
      addresses.cETH,
      encryptedInput.handle,
      encryptedInput.handleProof,
    ),
  );
  const swapEvent = swapReceipt.logs
    .map((log) => {
      try {
        return router.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === 'SwapExecuted');
  assert(swapEvent, 'SwapExecuted event must be emitted');
  assert.equal(swapEvent.args.trader, wallet.address, 'Swap event trader must match signer');

  const outputHandle = swapEvent.args.encryptedOutput;
  const receiptId = swapEvent.args.receiptId;
  const decrypted = await decryptWithRetry(handleClient, outputHandle);
  assert.equal(decrypted.solidityType, 'uint256', 'Swap output should decrypt as uint256');
  assert(decrypted.value > 0n, 'Swap output must be greater than zero');

  const outputBalanceHandle = await cEth.confidentialBalanceOf(wallet.address);
  assert.notEqual(outputBalanceHandle, '0x'.padEnd(66, '0'), 'Output balance needs a Nox handle');
  const owner = await router.ownerOf(receiptId);
  assert.equal(owner, wallet.address, 'Swap receipt NFT must be minted to trader');
  const tokenUri = await router.tokenURI(receiptId);
  assert(tokenUri.startsWith('data:application/json;base64,'), 'Receipt metadata must be on-chain');

  const acl = await waitForAcl(handleClient, outputHandle, wallet.address);
  const authorizedAccounts = [...acl.admins, ...acl.viewers].map((account) => account.toLowerCase());
  assert(
    authorizedAccounts.includes(wallet.address.toLowerCase()),
    'Trader must be authorized to decrypt the encrypted output',
  );

  const auditor = '0x000000000000000000000000000000000000dEaD';
  const currentUsdcHandle = await cUsdc.confidentialBalanceOf(wallet.address);
  await send('Grant cUSDC balance viewer', cUsdc.grantBalanceViewer(auditor));
  await waitForAcl(handleClient, currentUsdcHandle, auditor);

  const unwrapAmount = parseUnits('0.01', 18);
  const publicWethBefore = await weth.balanceOf(wallet.address);
  const encryptedUnwrap = await handleClient.encryptInput(unwrapAmount, 'uint256', addresses.cETH);
  const unwrapRequestReceipt = await send(
    'Request confidential unwrap',
    cEth['unwrap(address,address,bytes32,bytes)'](
      wallet.address,
      wallet.address,
      encryptedUnwrap.handle,
      encryptedUnwrap.handleProof,
    ),
  );
  const unwrapEvent = unwrapRequestReceipt.logs
    .map((log) => {
      try {
        return cEth.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((event) => event?.name === 'UnwrapRequested');
  assert(unwrapEvent, 'UnwrapRequested event must be emitted');
  const publicDecryption = await decryptWithRetry(
    { decrypt: (handle) => handleClient.publicDecrypt(handle) },
    unwrapEvent.args.amount,
  );
  assert.equal(publicDecryption.value, unwrapAmount, 'Public decryption must match unwrap amount');
  await send(
    'Finalize confidential unwrap',
    cEth.finalizeUnwrap(unwrapEvent.args.amount, publicDecryption.decryptionProof),
  );
  const publicWethAfter = await weth.balanceOf(wallet.address);
  assert.equal(publicWethAfter - publicWethBefore, unwrapAmount, 'Unwrap must release underlying nWETH');

  console.log(JSON.stringify({
    status: 'PASS',
    chainId: Number(network.chainId),
    swapTransaction: swapReceipt.hash,
    encryptedInputHandle: encryptedInput.handle,
    encryptedOutputHandle: outputHandle,
    decryptedOutput: `${formatUnits(decrypted.value, 18)} cETH`,
    receiptId: receiptId.toString(),
    receiptOwner: owner,
    aclAccessConfirmed: true,
    selectiveViewerConfirmed: auditor,
    unwrappedUnderlying: `${formatUnits(unwrapAmount, 18)} nWETH`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
