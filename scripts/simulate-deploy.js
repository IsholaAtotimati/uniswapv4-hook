require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const { POOL_MANAGER_ADDRESS } = process.env;
  if (!POOL_MANAGER_ADDRESS) {
    console.error('No POOL_MANAGER_ADDRESS in .env');
    process.exit(1);
  }

  const Hook = await hre.ethers.getContractFactory('IdleLiquidityHookEnterprise');
  const deployTx = Hook.getDeployTransaction(POOL_MANAGER_ADDRESS);

  try {
    console.log('Simulating deploy via eth_call...');
    const result = await hre.ethers.provider.call({
      from: (await hre.ethers.getSigners())[0].address,
      data: deployTx.data,
    });
    console.log('Call result:', result);
  } catch (err) {
    console.error('Simulation error:', err.message || err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
