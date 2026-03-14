const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ERC20 = await ethers.getContractFactory("ERC20Mock");

  // Deploy mock USDC (6 decimals)
  const usdc = await ERC20.deploy("Mock USDC", "USDC", 6, ethers.parseUnits("1000000", 6));
  await usdc.wait();
  console.log("✅ Mock USDC deployed at:", usdc.target);

  // Deploy mock WETH (18 decimals)
  const weth = await ERC20.deploy("Mock WETH", "WETH", 18, ethers.parseEther("1000"));
  await weth.wait();
  console.log("✅ Mock WETH deployed at:", weth.target);

  console.log("\n📌 Copy these addresses into your test flow:");
  console.log("USDC:", usdc.target);
  console.log("WETH:", weth.target);
}

main().catch(console.error);