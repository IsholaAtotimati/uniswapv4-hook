// scripts/check-balance.js
require("dotenv").config();
const hre = require("hardhat"); // Hardhat Runtime Environment

async function main() {
  // Get the provider from Hardhat + your network
  const provider = new hre.ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);

  // Create wallet with deployer key
  const wallet = new hre.ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  // Get balance
  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer Unichain ETH balance:", hre.ethers.formatEther(balance));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});