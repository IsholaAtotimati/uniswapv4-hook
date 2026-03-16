require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
require("dotenv").config();
const { task } = require("hardhat/config");

// Ensure RPC URLs exist
if (!process.env.SEPOLIA_RPC_URL) console.warn("⚠️ SEPOLIA_RPC_URL not set in .env");
if (!process.env.UNICHAIN_RPC_URL) console.warn("⚠️ UNICHAIN_RPC_URL not set in .env");
if (!process.env.MAINNET_RPC_URL) console.warn("⚠️ MAINNET_RPC_URL not set in .env");

// Private key
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error("Please set DEPLOYER_PRIVATE_KEY in .env");

const config = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
      evmVersion: "cancun"
    }
  },

  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      timeout: 120_000,
      accounts: [PRIVATE_KEY],
    },

    unichainTest: {
      url: process.env.UNICHAIN_RPC_URL || "",
      chainId: Number(process.env.UNICHAIN_CHAIN_ID || "1301"),
      accounts: [PRIVATE_KEY],
    },

    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
      chainId: 421614,
      accounts: [PRIVATE_KEY],
    },

    hardhat: {
      chainId: 31337,
      gasPrice: 20_000_000_000,
      initialBaseFeePerGas: 0,
      mining: { auto: true, interval: 0 },
      forking: process.env.MAINNET_RPC_URL
        ? { url: process.env.MAINNET_RPC_URL }
        : process.env.UNICHAIN_RPC_URL
          ? { url: process.env.UNICHAIN_RPC_URL }
          : undefined
    },

    sepoliaFork: {
      url: process.env.SEPOLIA_RPC_URL || "",
      chainId: 31337,
      forking: {
        url: process.env.SEPOLIA_RPC_URL || ""
        // blockNumber removed to always use latest
      },
      accounts: [PRIVATE_KEY], // must be array of strings
      gasPrice: 20_000_000_000,
      initialBaseFeePerGas: 0,
      mining: { auto: true, interval: 0 },
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v6"
  },

  gasReporter: {
    enabled: true,
    currency: "USD",
    showMethodSig: true,
    showTimeSpent: true
  },

  mocha: {
    require: ["./test/setup.js"]
  },
};

// --------------------------
// Custom Hardhat Task
// --------------------------
task("full-test", "Runs all unit, fuzz, integration tests and gas reports").setAction(
  async (taskArgs, hre) => {
    console.log("Running all tests with gas reporting...");
    await hre.run("test");
  }
);

module.exports = config;