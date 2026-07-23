import { ethers } from 'ethers';
import { SAFE_ABI, SAFE_MODULE_ABI } from '../contracts.js';

export const SAFE_SENTINEL_MODULE = '0x0000000000000000000000000000000000000001';

const ZERO_ADDRESS = ethers.ZeroAddress;

export function createSafeContracts(provider, safeAddress, moduleAddress) {
  return {
    safe: new ethers.Contract(safeAddress, SAFE_ABI, provider),
    module: new ethers.Contract(moduleAddress, SAFE_MODULE_ABI, provider),
  };
}

/**
 * Safe v1.4.x accepts an eth_sign/personal_sign signature when v is 31/32.
 * Browser wallets expose signMessage rather than the owner's private key, so
 * normalize the returned ECDSA signature to Safe's approved eth_sign mode.
 */
async function signSafeHash(signer, safeTxHash) {
  const raw = await signer.signMessage(ethers.getBytes(safeTxHash));
  return normalizeSafeEthSign(raw);
}

export function normalizeSafeEthSign(rawSignature) {
  const signature = ethers.Signature.from(rawSignature);
  const v = Number(signature.v) + 4;
  return ethers.concat([signature.r, signature.s, ethers.toBeHex(v, 1)]);
}

export async function executeSafeTransaction({ signer, safeAddress, to, data, value = 0n }) {
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, signer);
  const owner = await signer.getAddress();
  const [isOwner, threshold, nonce] = await Promise.all([
    safe.isOwner(owner),
    safe.getThreshold(),
    safe.nonce(),
  ]);
  if (!isOwner) throw new Error('The connected wallet is not an owner of this Safe.');
  if (threshold !== 1n) {
    throw new Error('This browser flow requires a 1-of-1 Safe. Use Safe{Wallet} to collect signatures for a multisig Safe.');
  }
  const safeTxHash = await safe.getTransactionHash(
    to,
    value,
    data,
    0,
    0,
    0,
    0,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    nonce,
  );
  const signature = await signSafeHash(signer, safeTxHash);
  const transaction = await safe.execTransaction(
    to,
    value,
    data,
    0,
    0,
    0,
    0,
    ZERO_ADDRESS,
    ZERO_ADDRESS,
    signature,
  );
  return { transaction, safeTxHash, nonce };
}

export async function executeSafeModule({ signer, safeAddress, moduleAddress, method, args = [] }) {
  const module = new ethers.Contract(moduleAddress, SAFE_MODULE_ABI, signer);
  const data = module.interface.encodeFunctionData(method, args);
  return executeSafeTransaction({ signer, safeAddress, to: moduleAddress, data });
}

export function parseSafeModuleEvent(receipt, module, eventName) {
  return receipt.logs
    .map((log) => { try { return module.interface.parseLog(log); } catch { return null; } })
    .find((event) => event?.name === eventName) ?? null;
}
