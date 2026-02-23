require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const { POOL_MANAGER_ADDRESS } = process.env;
  if (!POOL_MANAGER_ADDRESS) {
    console.error('Set POOL_MANAGER_ADDRESS in .env');
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log('Using deployer', await deployer.getAddress());

  // Deploy the Create2Deployer helper
  const DeployerFactory = await hre.ethers.getContractFactory('Create2Deployer');
  const deployerContract = await DeployerFactory.deploy();
  await deployerContract.waitForDeployment();
  console.log('Create2Deployer deployed to', deployerContract.target);

  // Prepare hook init code (bytecode + constructor args)
  const HookFactory = await hre.ethers.getContractFactory('IdleLiquidityHookEnterprise');
  // Build init code (bytecode + constructor args) in ethers v6
  const encodedArgs = HookFactory.interface.encodeDeploy([POOL_MANAGER_ADDRESS]);
  const initCode = HookFactory.bytecode + (encodedArgs ? encodedArgs.slice(2) : '');
  if (!initCode || initCode.length <= 2) throw new Error('Failed to build init code');

  const initCodeHash = hre.ethers.keccak256(initCode);

  // Uniswap Hooks low-bit mask and target permission for this hook
  // We require address low 14 bits equal AFTER_SWAP_FLAG (1 << 6 == 64)
  const ALL_HOOK_MASK = BigInt((1 << 14) - 1);
  const AFTER_SWAP_FLAG = BigInt(1 << 6);

  console.log('Searching for salt to satisfy hook address flags (this may take a little time)...');

  let found = false;
  let salt;
  let targetAddress;
  for (let i = 0; i < 500000; i++) {
    let hex = i.toString(16);
    const saltHex = '0x' + hex.padStart(64, '0');
    const addr = hre.ethers.getCreate2Address(deployerContract.target, saltHex, initCodeHash);
    const addrNum = BigInt(addr);
    if ((addrNum & ALL_HOOK_MASK) === AFTER_SWAP_FLAG) {
      found = true;
      salt = saltHex;
      targetAddress = addr;
      console.log('Found salt:', saltHex, '->', targetAddress);
      break;
    }
  }

  if (!found) {
    console.error('Failed to find suitable salt in reasonable iterations. Try rerunning or increase iterations.');
    process.exit(1);
  }

  // Deploy via the Create2Deployer
  const tx = await deployerContract.deploy(initCode, salt);
  console.log('Sent CREATE2 deploy tx, waiting for confirmation...');
  await tx.wait();

  // Verify code at the expected address
  const code = await hre.ethers.provider.getCode(targetAddress);
  if (code === '0x') {
    console.error('Deployment failed, no contract code at', targetAddress);
    process.exit(1);
  }

  console.log('Hook deployed to', targetAddress);
  console.log('Done. You can now run your post-deploy steps or run the regular deploy script without constructor arg.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
