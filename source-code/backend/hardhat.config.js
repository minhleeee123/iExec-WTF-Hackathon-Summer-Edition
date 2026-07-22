import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import {defineConfig} from "hardhat/config";

export default defineConfig({
  plugins: [hardhatEthersPlugin, noxPlugin],
  solidity: {
    version: "0.8.35",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    default: {
      type: "edr-simulated",
      chainType: "op",
      allowUnlimitedContractSize: true,
    },
  },
  nox: {
    // Docker is unavailable in this workspace. Live Nox behavior is tested on Sepolia.
    skipTestOverride: true,
  },
});
