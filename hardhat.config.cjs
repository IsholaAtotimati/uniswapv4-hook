// hardhat.config.cjs
require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");
const { task } = require("hardhat/config");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false, // 🔥 fixes "stack too deep" errors
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    showMethodSig: true,
    showTimeSpent: true,
  },
  mocha: {
    require: ["./test/setup.js"]
  }
};

// --------------------------
// Custom Hardhat Task
// --------------------------
task("full-test", "Runs all unit, fuzz, integration tests and gas reports")
  .setAction(async (taskArgs, hre) => {
    console.log("Running all tests with gas reporting...");
    await hre.run("test"); // runs all test files under /test
  });

module.exports = config;
