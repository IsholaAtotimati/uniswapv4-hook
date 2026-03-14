// scripts/deploy-test-token.js
// Deploys a simple ERC20 test token on Sepolia

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying test token with:", deployer.address);

  // Use OpenZeppelin ERC20Mock if available, otherwise use a minimal ERC20
  // Explicitly specify the contract path to ensure correct ABI
  const Token = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");

  // Deploy with 18 decimals, 1 million supply to deployer
  // ERC20Mock expects (string name, string symbol, uint256 initialSupply)
  const token = await Token.deploy(
    "TestToken",
    "TST",
    ethers.parseUnits("1000000", 18)
  );
  await token.waitForDeployment();
  console.log("Test token deployed at:", await token.getAddress());
}

main().catch(console.error);
