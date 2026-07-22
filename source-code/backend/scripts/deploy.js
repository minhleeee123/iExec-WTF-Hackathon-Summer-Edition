const hre = require("hardhat");

async function main() {
  console.log("Starting deployment of NoxSwap confidential ecosystem to Ethereum Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  if (deployer) {
    console.log("Deploying contracts with account:", deployer.address);
  }

  // 1. Deploy Confidential Token: cUSDC (ERC-7984)
  const NoxConfidentialToken = await hre.ethers.getContractFactory("NoxConfidentialToken");
  const cUSDC = await NoxConfidentialToken.deploy(
    "Confidential USDC",
    "cUSDC",
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // Sepolia USDC Address
  );
  await cUSDC.waitForDeployment();
  const cUSDCAddress = await cUSDC.getAddress();
  console.log("cUSDC (ERC-7984) deployed to:", cUSDCAddress);

  // 2. Deploy Confidential Token: cETH (ERC-7984)
  const cETH = await NoxConfidentialToken.deploy(
    "Confidential ETH",
    "cETH",
    "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9" // Sepolia WETH Address
  );
  await cETH.waitForDeployment();
  const cETHAddress = await cETH.getAddress();
  console.log("cETH (ERC-7984) deployed to:", cETHAddress);

  // 3. Deploy NoxSwap Router Contract
  const NoxSwap = await hre.ethers.getContractFactory("NoxSwap");
  const noxSwap = await NoxSwap.deploy();
  await noxSwap.waitForDeployment();
  const noxSwapAddress = await noxSwap.getAddress();
  console.log("NoxSwap Router deployed to:", noxSwapAddress);

  // 4. Initialize Pool Liquidity (1,000,000 cUSDC <-> 500 cETH)
  console.log("Initializing cUSDC/cETH Liquidity Pool...");
  const initTx = await noxSwap.addLiquidity(
    cUSDCAddress,
    cETHAddress,
    hre.ethers.parseEther("1000000"),
    hre.ethers.parseEther("500")
  );
  await initTx.wait();
  console.log("Liquidity Pool initialized successfully!");

  console.log("\n================ Deployment Summary ================");
  console.log("Network: Ethereum Sepolia");
  console.log("cUSDC (ERC-7984):", cUSDCAddress);
  console.log("cETH (ERC-7984):", cETHAddress);
  console.log("NoxSwap Router:", noxSwapAddress);
  console.log("====================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
