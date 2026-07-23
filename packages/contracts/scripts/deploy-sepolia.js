import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEthersHandleClient } from '@iexec-nox/handle';
import {
  Contract,
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  formatEther,
  parseUnits,
} from 'ethers';
import { syncClientArtifacts } from './sync-client-artifacts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const privateKey = process.env.PRIVATE_KEY;
const ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306';

if (!privateKey) throw new Error('Set PRIVATE_KEY in the environment.');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadArtifact(name) {
  return readJson(path.join(rootDir, 'artifacts', 'contracts', `${name}.sol`, `${name}.json`));
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

async function addPool({ label, router, client, tokenA, tokenB, amountA, amountB }) {
  const routerAddress = await router.getAddress();
  const encryptedA = await client.encryptInput(amountA, 'uint256', routerAddress);
  const encryptedB = await client.encryptInput(amountB, 'uint256', routerAddress);
  const receipt = await waitFor(
    `Add encrypted ${label} liquidity`,
    router.addLiquidity(
      tokenA,
      tokenB,
      encryptedA.handle,
      encryptedA.handleProof,
      encryptedB.handle,
      encryptedB.handleProof,
    ),
  );
  const pool = await router.getPoolHandles(tokenA, tokenB);
  return {
    id: label,
    token0: pool.token0,
    token1: pool.token1,
    reserve0Handle: pool.reserve0,
    reserve1Handle: pool.reserve1,
    liquidityTransaction: receipt.hash,
  };
}

async function main() {
  const currentDeploymentPath = path.join(rootDir, 'deployment-sepolia.json');
  const current = readJson(currentDeploymentPath);
  const provider = new JsonRpcProvider(rpcUrl, 11155111, { staticNetwork: true });
  const wallet = new Wallet(privateKey, provider);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error(`Expected Sepolia, received ${network.chainId}.`);
  if (wallet.address.toLowerCase() !== current.deployer.toLowerCase()) {
    throw new Error('Extension deployment must use the existing deployment owner.');
  }

  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance: ${formatEther(await provider.getBalance(wallet.address))} Sepolia ETH`);

  const tokenArtifact = loadArtifact('NoxTestToken');
  const wrapperArtifact = loadArtifact('NoxConfidentialToken');
  const swapArtifact = loadArtifact('NoxSwap');
  const orderArtifact = loadArtifact('NoxLimitOrderBook');
  const addresses = current.contracts;

  const usdc = new Contract(addresses.underlyingUSDC, tokenArtifact.abi, wallet);
  const weth = new Contract(addresses.underlyingWETH, tokenArtifact.abi, wallet);
  const cUsdc = new Contract(addresses.cUSDC, wrapperArtifact.abi, wallet);
  const cEth = new Contract(addresses.cETH, wrapperArtifact.abi, wallet);

  const wbtc = await deploy('Test WBTC', tokenArtifact, wallet, [
    'NoxSwap Test Wrapped Bitcoin',
    'nWBTC',
    8,
    parseUnits('0.25', 8),
  ]);
  const sol = await deploy('Test SOL', tokenArtifact, wallet, [
    'NoxSwap Test Wrapped SOL',
    'nSOL',
    9,
    parseUnits('100', 9),
  ]);
  const wbtcAddress = await wbtc.contract.getAddress();
  const solAddress = await sol.contract.getAddress();
  const cWbtc = await deploy('Confidential WBTC', wrapperArtifact, wallet, [
    'NoxSwap Confidential WBTC',
    'cWBTC',
    wbtcAddress,
  ]);
  const cSol = await deploy('Confidential SOL', wrapperArtifact, wallet, [
    'NoxSwap Confidential SOL',
    'cSOL',
    solAddress,
  ]);
  const router = await deploy('NoxSwap Router V2', swapArtifact, wallet);
  const routerAddress = await router.contract.getAddress();
  const cWbtcAddress = await cWbtc.contract.getAddress();
  const cSolAddress = await cSol.contract.getAddress();
  const orderBook = await deploy('Nox Limit Order Book', orderArtifact, wallet, [
    routerAddress,
    ETH_USD_FEED,
    addresses.cUSDC,
    addresses.cETH,
  ]);
  const orderBookAddress = await orderBook.contract.getAddress();

  const liquidity = {
    usdcEth: { usdc: parseUnits('1000000', 6), eth: parseUnits('500', 18) },
    wbtcUsdc: { wbtc: parseUnits('100', 8), usdc: parseUnits('6000000', 6) },
    solUsdc: { sol: parseUnits('50000', 9), usdc: parseUnits('7500000', 6) },
  };
  const totalUsdc = liquidity.usdcEth.usdc + liquidity.wbtcUsdc.usdc + liquidity.solUsdc.usdc;

  await waitFor('Mint USDC extension liquidity', usdc.mintLiquidity(wallet.address, totalUsdc));
  await waitFor('Mint WETH extension liquidity', weth.mintLiquidity(wallet.address, liquidity.usdcEth.eth));
  await waitFor('Mint WBTC liquidity', wbtc.contract.mintLiquidity(wallet.address, liquidity.wbtcUsdc.wbtc));
  await waitFor('Mint SOL liquidity', sol.contract.mintLiquidity(wallet.address, liquidity.solUsdc.sol));

  for (const [label, underlying, wrapper, amount] of [
    ['cUSDC', usdc, cUsdc, totalUsdc],
    ['cETH', weth, cEth, liquidity.usdcEth.eth],
    ['cWBTC', wbtc.contract, cWbtc.contract, liquidity.wbtcUsdc.wbtc],
    ['cSOL', sol.contract, cSol.contract, liquidity.solUsdc.sol],
  ]) {
    const wrapperAddress = await wrapper.getAddress();
    await waitFor(`Approve ${label} wrapper`, underlying.approve(wrapperAddress, amount));
    await waitFor(`Wrap ${label} liquidity`, wrapper.wrap(wallet.address, amount));
    await waitFor(
      `Authorize Router V2 for ${label}`,
      wrapper.setOperator(routerAddress, BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60)),
    );
  }

  const handleClient = await createEthersHandleClient(wallet);
  const pools = {};
  pools.cUSDC_cETH = await addPool({
    label: 'cUSDC/cETH',
    router: router.contract,
    client: handleClient,
    tokenA: addresses.cUSDC,
    tokenB: addresses.cETH,
    amountA: liquidity.usdcEth.usdc,
    amountB: liquidity.usdcEth.eth,
  });
  pools.cWBTC_cUSDC = await addPool({
    label: 'cWBTC/cUSDC',
    router: router.contract,
    client: handleClient,
    tokenA: cWbtcAddress,
    tokenB: addresses.cUSDC,
    amountA: liquidity.wbtcUsdc.wbtc,
    amountB: liquidity.wbtcUsdc.usdc,
  });
  pools.cSOL_cUSDC = await addPool({
    label: 'cSOL/cUSDC',
    router: router.contract,
    client: handleClient,
    tokenA: cSolAddress,
    tokenB: addresses.cUSDC,
    amountA: liquidity.solUsdc.sol,
    amountB: liquidity.solUsdc.usdc,
  });

  const deploymentInfo = {
    ...current,
    contracts: {
      ...addresses,
      underlyingWBTC: wbtcAddress,
      underlyingSOL: solAddress,
      cWBTC: cWbtcAddress,
      cSOL: cSolAddress,
      noxSwapRouter: routerAddress,
      limitOrderBook: orderBookAddress,
    },
    feeds: {
      ethUsd: ETH_USD_FEED,
    },
    pool: pools.cUSDC_cETH,
    pools,
    deploymentTransactions: {
      ...current.deploymentTransactions,
      underlyingWBTC: wbtc.transactionHash,
      underlyingSOL: sol.transactionHash,
      cWBTC: cWbtc.transactionHash,
      cSOL: cSol.transactionHash,
      noxSwapRouter: router.transactionHash,
      limitOrderBook: orderBook.transactionHash,
    },
    explorerUrl: `https://sepolia.etherscan.io/address/${routerAddress}`,
    extendedFromRouter: addresses.noxSwapRouter,
    deployedAt: new Date().toISOString(),
  };

  const serialized = `${JSON.stringify(deploymentInfo, null, 2)}\n`;
  fs.writeFileSync(currentDeploymentPath, serialized);
  syncClientArtifacts();
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log(`Remaining balance: ${formatEther(await provider.getBalance(wallet.address))} Sepolia ETH`);
}

main().catch((error) => {
  console.error(error.shortMessage ?? error.message ?? error);
  process.exitCode = 1;
});
