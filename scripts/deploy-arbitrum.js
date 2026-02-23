require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const { ARBITRUM_SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, POOL_MANAGER_ADDRESS } = process.env;
  if (!ARBITRUM_SEPOLIA_RPC_URL || !DEPLOYER_PRIVATE_KEY || !POOL_MANAGER_ADDRESS) {
    console.error('Missing env vars. See .env.example');
    process.exit(1);
  }

  if (
    POOL_MANAGER_ADDRESS === '0x...' ||
    POOL_MANAGER_ADDRESS.toLowerCase().includes('pool_manager') ||
    POOL_MANAGER_ADDRESS.length < 42
  ) {
    console.error('POOL_MANAGER_ADDRESS appears to be a placeholder. Set a valid address in .env');
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with', await deployer.getAddress());

  const Hook = await hre.ethers.getContractFactory('IdleLiquidityHookEnterprise');
  const hook = await Hook.deploy(POOL_MANAGER_ADDRESS);
  await hook.deployed();

  console.log('IdleLiquidityHookEnterprise deployed to:', hook.address);
  console.log('Run post-deploy steps: setPoolConfigVault or setPoolConfigAave as owner.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
