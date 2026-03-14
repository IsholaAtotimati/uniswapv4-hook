const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Wallet Address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("ETH Balance:", ethers.formatEther(balance));
}

main().catch(console.error);