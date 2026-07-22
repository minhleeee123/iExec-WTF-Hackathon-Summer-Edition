require('dotenv').config();
const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

async function main() {
  console.log('Compiling Solidity contracts...');

  const ier7984Src = fs.readFileSync(path.join(__dirname, '../contracts/IERC7984.sol'), 'utf8');
  const tokenSrc = fs.readFileSync(path.join(__dirname, '../contracts/NoxConfidentialToken.sol'), 'utf8');
  const swapSrc = fs.readFileSync(path.join(__dirname, '../contracts/NoxSwap.sol'), 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'IERC7984.sol': { content: ier7984Src },
      'NoxConfidentialToken.sol': { content: tokenSrc },
      'NoxSwap.sol': { content: swapSrc }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      },
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const fatal = output.errors.filter(e => e.severity === 'error');
    if (fatal.length > 0) {
      console.error('Compilation Errors:', fatal);
      process.exit(1);
    }
  }

  console.log('Compilation successful!');

  const tokenContractBuild = output.contracts['NoxConfidentialToken.sol']['NoxConfidentialToken'];
  const swapContractBuild = output.contracts['NoxSwap.sol']['NoxSwap'];

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is missing in .env file!');
  }
  const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`\nDeploying from Account: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Current Balance: ${ethers.formatEther(balance)} Sepolia ETH`);

  // 1. Deploy cUSDC
  console.log('\n[1/3] Deploying cUSDC (ERC-7984)...');
  const TokenFactory = new ethers.ContractFactory(tokenContractBuild.abi, tokenContractBuild.evm.bytecode.object, wallet);
  const cUSDC = await TokenFactory.deploy('Confidential USDC', 'cUSDC', '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238');
  await cUSDC.waitForDeployment();
  const cUSDCAddress = await cUSDC.getAddress();
  console.log(`✅ cUSDC Deployed at: ${cUSDCAddress}`);

  // 2. Deploy cETH
  console.log('\n[2/3] Deploying cETH (ERC-7984)...');
  const cETH = await TokenFactory.deploy('Confidential ETH', 'cETH', '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9');
  await cETH.waitForDeployment();
  const cETHAddress = await cETH.getAddress();
  console.log(`✅ cETH Deployed at: ${cETHAddress}`);

  // 3. Deploy NoxSwap Router
  console.log('\n[3/3] Deploying NoxSwap Router...');
  const SwapFactory = new ethers.ContractFactory(swapContractBuild.abi, swapContractBuild.evm.bytecode.object, wallet);
  const noxSwap = await SwapFactory.deploy();
  await noxSwap.waitForDeployment();
  const noxSwapAddress = await noxSwap.getAddress();
  console.log(`✅ NoxSwap Router Deployed at: ${noxSwapAddress}`);

  // 4. Initialize Pool
  console.log('\n[4/4] Initializing cUSDC/cETH Liquidity Pool...');
  const initTx = await noxSwap.addLiquidity(
    cUSDCAddress,
    cETHAddress,
    ethers.parseEther('1000000'),
    ethers.parseEther('500')
  );
  await initTx.wait();
  console.log('✅ Liquidity Pool initialized!');

  console.log('\n================ SEPOLIA DEPLOYMENT SUMMARY ================');
  console.log(`Network: Ethereum Sepolia Testnet`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`cUSDC Address: ${cUSDCAddress}`);
  console.log(`cETH Address: ${cETHAddress}`);
  console.log(`NoxSwap Router Address: ${noxSwapAddress}`);
  console.log(`Etherscan Link: https://sepolia.etherscan.io/address/${noxSwapAddress}`);
  console.log('===========================================================');

  // Write deployment addresses to JSON file
  const deploymentInfo = {
    network: 'sepolia',
    chainId: 11155111,
    deployer: wallet.address,
    cUSDC: cUSDCAddress,
    cETH: cETHAddress,
    noxSwapRouter: noxSwapAddress,
    etherscanUrl: `https://sepolia.etherscan.io/address/${noxSwapAddress}`,
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, '../deployment-sepolia.json'), JSON.stringify(deploymentInfo, null, 2));
}

main().catch(err => {
  console.error('Deployment Failed:', err);
  process.exit(1);
});
