// scripts/wrap-eth-to-weth.js
// Wrap Sepolia ETH to WETH for your deployer address

const { ethers } = require("hardhat");

// Sepolia WETH contract address
const WETH = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81";

// Minimal WETH ABI for deposit and balanceOf
const WETH_ABI = [
  "function deposit() public payable",
  "function balanceOf(address owner) view returns (uint256)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const weth = new ethers.Contract(WETH, WETH_ABI, deployer);

  // Show current WETH balance
  const before = await weth.balanceOf(deployer.address);
  console.log("WETH before:", ethers.formatUnits(before, 18));

  // Amount of ETH to wrap (e.g., 0.001 ETH)
  const amount = ethers.parseUnits("0.001", 18);

  // Wrap ETH to WETH
  const tx = await weth.deposit({ value: amount });
  await tx.wait();
  console.log(`Wrapped ${ethers.formatUnits(amount, 18)} ETH to WETH.`);

  // Show new WETH balance
  const after = await weth.balanceOf(deployer.address);
  console.log("WETH after:", ethers.formatUnits(after, 18));
}

main().catch(console.error);
