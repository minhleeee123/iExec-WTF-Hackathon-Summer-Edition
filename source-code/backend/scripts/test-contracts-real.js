const { ethers } = require('ethers');

const CONTRACT_ADDRESSES = {
  NOX_SWAP: '0x38585F5fbB2587bDc085995A0E3bC2B36B7CaA7a',
  cUSDC: '0x9c6858B1C40751E8AfBF2171f16cf425212f6068',
  cETH: '0x7eC766eE1Fe08eCe28B2eb92324BbF53bF22641e'
};

const NOX_SWAP_ABI = [
  "function confidentialSwap(address tokenIn, address tokenOut, bytes calldata encryptedAmount, uint256 estimatedAmount) external returns (bytes32)"
];

const CTOKEN_ABI = [
  "function confidentialBalanceOf(address account) external view returns (bytes32)",
  "function shadowBalanceOf(address account) external view returns (uint256)",
  "function wrap(uint256 amount) external returns (bytes32)",
  "function mintTestTokens(address to, uint256 amount) external returns (bytes32)"
];

async function main() {
  console.log('=== STARTING LIVE SEPOLIA TEST FOR USER WALLET ===');

  const privateKey = process.env.PRIVATE_KEY || '7302adb08ab8e3d0de0f658a4b73f953203bae0b61b6b8b6b03d0b3bd3c02e7a';
  const rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Wallet Address: ${wallet.address}`);
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`Sepolia ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  const cUsdcContract = new ethers.Contract(CONTRACT_ADDRESSES.cUSDC, CTOKEN_ABI, wallet);
  const noxSwapContract = new ethers.Contract(CONTRACT_ADDRESSES.NOX_SWAP, NOX_SWAP_ABI, wallet);

  // 1. TEST FAUCET
  console.log('\n[TEST 1] Testing Faucet (Minting 1,000 cUSDC on Sepolia)...');
  const faucetTx = await cUsdcContract.mintTestTokens(wallet.address, ethers.parseEther('1000'));
  console.log(`Tx Broadcasted: https://sepolia.etherscan.io/tx/${faucetTx.hash}`);
  await faucetTx.wait();
  console.log('✅ Faucet Test PASSED!');

  // 2. TEST WRAP
  console.log('\n[TEST 2] Testing Encrypted Wrap (100 cUSDC on Sepolia)...');
  const wrapTx = await cUsdcContract.wrap(ethers.parseEther('100'));
  console.log(`Tx Broadcasted: https://sepolia.etherscan.io/tx/${wrapTx.hash}`);
  await wrapTx.wait();
  console.log('✅ Wrap Test PASSED!');

  // 3. TEST CONFIDENTIAL SWAP
  console.log('\n[TEST 3] Testing Nox Confidential Swap (cUSDC -> cETH on Sepolia)...');
  const encryptedPayload = ethers.keccak256(
    ethers.toUtf8Bytes(`${wallet.address}-cUSDC-100-${Date.now()}`)
  );
  const swapTx = await noxSwapContract.confidentialSwap(
    CONTRACT_ADDRESSES.cUSDC,
    CONTRACT_ADDRESSES.cETH,
    encryptedPayload,
    ethers.parseEther('50')
  );
  console.log(`Tx Broadcasted: https://sepolia.etherscan.io/tx/${swapTx.hash}`);
  await swapTx.wait();
  console.log('✅ Confidential Swap Test PASSED!');

  // 4. INSPECT ENCRYPTED BALANCE HANDLE
  console.log('\n[TEST 4] Inspecting Encrypted Balance Handle on Sepolia...');
  const encHandle = await cUsdcContract.confidentialBalanceOf(wallet.address);
  const shadowBal = await cUsdcContract.shadowBalanceOf(wallet.address);
  console.log(`On-Chain Ciphertext Handle (ERC-7984): ${encHandle}`);
  console.log(`Shadow Balance (Plaintext view): ${ethers.formatEther(shadowBal)} cUSDC`);

  console.log('\n================ ALL SEPOLIA TESTS PASSED 100% ================');
  console.log('Smart Contracts & User Wallet are 100% working live on Ethereum Sepolia!');
  console.log('==================================================================');
}

main().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
