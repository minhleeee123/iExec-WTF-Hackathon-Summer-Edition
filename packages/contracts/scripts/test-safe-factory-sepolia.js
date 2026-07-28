import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
} from 'ethers';
import { SAFE_ABI, SAFE_FACTORY_ABI, SAFE_MODULE_ABI } from '../client/abis.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const deployment = JSON.parse(fs.readFileSync(path.join(rootDir, 'deployment-sepolia.json'), 'utf8'));
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;

if (process.env.SAFE_FACTORY_E2E !== 'true') throw new Error('Set SAFE_FACTORY_E2E=true to create a live canary Safe.');
if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

function parseCreated(receipt, factory) {
  return receipt.logs
    .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
    .find((event) => event?.name === 'NoxSafeCreated') ?? null;
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl, deployment.chainId, { staticNetwork: true });
  const funder = new Wallet(privateKey, provider);
  const canary = Wallet.createRandom().connect(provider);
  const factory = new Contract(deployment.contracts.noxSafeFactory, SAFE_FACTORY_ABI, canary);
  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
  if (!maxFeePerGas) throw new Error('Sepolia fee data is unavailable.');
  const createGas = await factory.createSafe.estimateGas();
  const sweepGas = 21_000n;
  const fundingValue = (createGas * maxFeePerGas * 2n) + (sweepGas * maxFeePerGas * 2n);

  const funding = await funder.sendTransaction({ to: canary.address, value: fundingValue });
  const fundingReceipt = await funding.wait();
  if (fundingReceipt.status !== 1) throw new Error('Canary funding reverted.');

  const creation = await factory.createSafe({ gasLimit: (createGas * 12n) / 10n });
  const creationReceipt = await creation.wait();
  if (creationReceipt.status !== 1) throw new Error('Canary Safe creation reverted.');
  const event = parseCreated(creationReceipt, factory);
  if (!event) throw new Error('NoxSafeCreated event was not found.');

  const safeAddress = getAddress(event.args.safe);
  const moduleAddress = getAddress(event.args.module);
  const safe = new Contract(safeAddress, SAFE_ABI, provider);
  const module = new Contract(moduleAddress, SAFE_MODULE_ABI, provider);
  const [registeredSafe, registeredModule, registeredOwner, owners, threshold, enabled, boundSafe] = await Promise.all([
    factory.safeOf(canary.address),
    factory.moduleOf(safeAddress),
    factory.registeredOwner(safeAddress),
    safe.getOwners(),
    safe.getThreshold(),
    safe.isModuleEnabled(moduleAddress),
    module.safe(),
  ]);
  if (
    getAddress(registeredSafe) !== safeAddress
    || getAddress(registeredModule) !== moduleAddress
    || getAddress(registeredOwner) !== canary.address
    || owners.length !== 1
    || getAddress(owners[0]) !== canary.address
    || threshold !== 1n
    || !enabled
    || getAddress(boundSafe) !== safeAddress
  ) throw new Error('Canary Safe invariants failed.');

  const remaining = await provider.getBalance(canary.address);
  const sweepFee = sweepGas * maxFeePerGas;
  let sweepHash = null;
  if (remaining > sweepFee) {
    const sweep = await canary.sendTransaction({
      to: funder.address,
      value: remaining - sweepFee,
      gasLimit: sweepGas,
      maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 0n,
    });
    await sweep.wait();
    sweepHash = sweep.hash;
  }

  console.log(JSON.stringify({
    status: 'PASS',
    factory: deployment.contracts.noxSafeFactory,
    canaryOwner: canary.address,
    safe: safeAddress,
    module: moduleAddress,
    threshold: Number(threshold),
    moduleEnabled: enabled,
    fundingTransaction: funding.hash,
    creationTransaction: creation.hash,
    sweepTransaction: sweepHash,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
