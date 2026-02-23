require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(await deployer.getAddress());
  console.log('Deployer:', await deployer.getAddress());
  console.log('Balance (wei):', balance.toString());
  console.log('Balance (ether):', hre.ethers.formatEther(balance));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
