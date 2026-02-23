require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const PoolManagerMock = await hre.ethers.getContractFactory('PoolManagerMock');
  const poolManager = await PoolManagerMock.deploy();
  await poolManager.waitForDeployment();
  console.log('PoolManagerMock deployed to:', await poolManager.getAddress());

  const Hook = await hre.ethers.getContractFactory('IdleLiquidityHookEnterprise');
  const hook = await Hook.deploy(await poolManager.getAddress());
  await hook.waitForDeployment();
  console.log('IdleLiquidityHookEnterprise deployed to:', await hook.getAddress());

  const out = {
    poolManager: poolManager.address,
    hook: hook.address,
    deployer: await deployer.getAddress(),
    network: hre.network.name
  };

  fs.writeFileSync('frontend/addresses.json', JSON.stringify(out, null, 2));
  console.log('Wrote frontend/addresses.json');
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
