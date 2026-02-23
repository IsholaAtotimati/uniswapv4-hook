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
    console.log('Estimating gas for deploy transaction...');
    const gas = await hre.ethers.provider.estimateGas({
      from: (await hre.ethers.getSigners())[0].address,
      data: deployTx.data,
    });
    console.log('Estimated gas:', gas.toString());
  } catch (err) {
    console.error('EstimateGas error:', err);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
