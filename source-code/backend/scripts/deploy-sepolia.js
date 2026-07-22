import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEthersHandleClient } from '@iexec-nox/handle';
import {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  formatEther,
  parseUnits,
} from 'ethers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  throw new Error('Set PRIVATE_KEY in the environment; deployment scripts never contain a fallback key.');
}

function loadArtifact(name) {
  const artifactPath = path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
}

async function waitFor(label, transactionPromise) {
  const transaction = await transactionPromise;
  console.log(`${label}: ${transaction.hash}`);
  const receipt = await transaction.wait();
  if (receipt.status !== 1) throw new Error(`${label} reverted: ${transaction.hash}`);
  return receipt;
}

async function deploy(label, artifact, signer, args = []) {
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args);
  const transaction = contract.deploymentTransaction();
  console.log(`${label} deployment: ${transaction.hash}`);
  await contract.waitForDeployment();
  console.log(`${label}: ${await contract.getAddress()}`);
  return { contract, transactionHash: transaction.hash };
}

async function main() {
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    throw new Error(`Expected Ethereum Sepolia (11155111), received ${network.chainId}.`);
  }

  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${formatEther(await provider.getBalance(wallet.address))} Sepolia ETH`);

  const tokenArtifact = loadArtifact('NoxTestToken');
  const wrapperArtifact = loadArtifact('NoxConfidentialToken');
  const swapArtifact = loadArtifact('NoxSwap');

  const usdc = await deploy('Test USDC', tokenArtifact, wallet, [
    'NoxSwap Test USDC',
    'nUSDC',
    6,
    parseUnits('10000', 6),
  ]);
  const weth = await deploy('Test WETH', tokenArtifact, wallet, [
    'NoxSwap Test Wrapped Ether',
    'nWETH',
    18,
    parseUnits('5', 18),
  ]);
  const usdcAddress = await usdc.contract.getAddress();
  const wethAddress = await weth.contract.getAddress();

  const cUsdc = await deploy('Confidential USDC', wrapperArtifact, wallet, [
    'NoxSwap Confidential USDC',
    'cUSDC',
    usdcAddress,
  ]);
  const cEth = await deploy('Confidential ETH', wrapperArtifact, wallet, [
    'NoxSwap Confidential ETH',
    'cETH',
    wethAddress,
  ]);
  const router = await deploy('NoxSwap Router', swapArtifact, wallet);
  const cUsdcAddress = await cUsdc.contract.getAddress();
  const cEthAddress = await cEth.contract.getAddress();
  const routerAddress = await router.contract.getAddress();

  const usdcLiquidity = parseUnits('1000000', 6);
  const wethLiquidity = parseUnits('500', 18);
  await waitFor('Mint USDC liquidity', usdc.contract.mintLiquidity(wallet.address, usdcLiquidity));
  await waitFor('Mint WETH liquidity', weth.contract.mintLiquidity(wallet.address, wethLiquidity));
  await waitFor('Approve cUSDC wrapper', usdc.contract.approve(cUsdcAddress, usdcLiquidity));
  await waitFor('Approve cETH wrapper', weth.contract.approve(cEthAddress, wethLiquidity));
  await waitFor('Wrap cUSDC liquidity', cUsdc.contract.wrap(wallet.address, usdcLiquidity));
  await waitFor('Wrap cETH liquidity', cEth.contract.wrap(wallet.address, wethLiquidity));

  const operatorExpiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
  await waitFor('Authorize router for cUSDC', cUsdc.contract.setOperator(routerAddress, operatorExpiry));
  await waitFor('Authorize router for cETH', cEth.contract.setOperator(routerAddress, operatorExpiry));

  const handleClient = await createEthersHandleClient(wallet);
  const encryptedUsdc = await handleClient.encryptInput(usdcLiquidity, 'uint256', routerAddress);
  const encryptedEth = await handleClient.encryptInput(wethLiquidity, 'uint256', routerAddress);
  const liquidityReceipt = await waitFor(
    'Add encrypted cUSDC/cETH liquidity',
    router.contract.addLiquidity(
      cUsdcAddress,
      cEthAddress,
      encryptedUsdc.handle,
      encryptedUsdc.handleProof,
      encryptedEth.handle,
      encryptedEth.handleProof,
    ),
  );

  const pool = await router.contract.getPoolHandles(cUsdcAddress, cEthAddress);
  const deploymentInfo = {
    network: 'ethereum-sepolia',
    chainId: Number(network.chainId),
    deployer: wallet.address,
    contracts: {
      underlyingUSDC: usdcAddress,
      underlyingWETH: wethAddress,
      cUSDC: cUsdcAddress,
      cETH: cEthAddress,
      noxSwapRouter: routerAddress,
      noxCompute: '0x24Ef36Ec5b626D7DCD09a98F3083c2758F0F77bF',
    },
    pool: {
      token0: pool.token0,
      token1: pool.token1,
      reserve0Handle: pool.reserve0,
      reserve1Handle: pool.reserve1,
      liquidityTransaction: liquidityReceipt.hash,
    },
    deploymentTransactions: {
      underlyingUSDC: usdc.transactionHash,
      underlyingWETH: weth.transactionHash,
      cUSDC: cUsdc.transactionHash,
      cETH: cEth.transactionHash,
      noxSwapRouter: router.transactionHash,
    },
    gatewayUrl: 'https://gateway-testnets.noxprotocol.dev',
    explorerUrl: `https://sepolia.etherscan.io/address/${routerAddress}`,
    deployedAt: new Date().toISOString(),
  };

  const serializedDeployment = `${JSON.stringify(deploymentInfo, null, 2)}\n`;
  fs.writeFileSync(path.join(rootDir, 'deployment-sepolia.json'), serializedDeployment);
  fs.writeFileSync(
    path.resolve(rootDir, '../frontend/src/deployment.json'),
    serializedDeployment,
  );
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`Remaining balance: ${formatEther(await provider.getBalance(wallet.address))} Sepolia ETH`);
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
