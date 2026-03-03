require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS;
  if(!poolManagerAddress){
    console.error('POOL_MANAGER_ADDRESS not set in .env');
    process.exit(1);
  }

  console.log('Using PoolManager at:', poolManagerAddress);

  const Hook = await hre.ethers.getContractFactory('IdleLiquidityHookEnterprise');
  // Provide a gas limit override to avoid RPC estimateGas issues on some providers
  const hook = await Hook.deploy(poolManagerAddress, { gasLimit: 5000000 });
  await hook.waitForDeployment();
  console.log('IdleLiquidityHookEnterprise deployed to:', await hook.getAddress());

  const out = {
    poolManager: poolManagerAddress,
    hook: hook.address,
    deployer: await deployer.getAddress(),
    network: hre.network.name,
    readOnlyRpc: process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || null
  };

  fs.writeFileSync('frontend/addresses.json', JSON.stringify(out, null, 2));
  console.log('Wrote frontend/addresses.json');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
