require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const { POOL_MANAGER_ADDRESS } = process.env;
  if (!POOL_MANAGER_ADDRESS) {
    console.error('No POOL_MANAGER_ADDRESS in .env');
    process.exit(1);
  }

  const code = await hre.ethers.provider.getCode(POOL_MANAGER_ADDRESS);
  if (!code || code === '0x') {
    console.log('No contract code found at', POOL_MANAGER_ADDRESS);
    process.exit(0);
  }

  console.log('Contract code exists at', POOL_MANAGER_ADDRESS, 'length:', code.length);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
