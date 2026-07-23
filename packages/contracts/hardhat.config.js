import noxPlugin from "@iexec-nox/nox-hardhat-plugin";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import hardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import {defineConfig} from "hardhat/config";

export default defineConfig({
  plugins: [hardhatEthersPlugin, hardhatNodeTestRunner, noxPlugin],
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
    // Unit tests stay Docker-free. The dedicated runtime workflow opts in explicitly.
    skipTestOverride: process.env.NOX_RUNTIME_TESTS !== "true",
  },
});
