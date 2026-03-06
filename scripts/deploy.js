const { ethers } = require("hardhat");

async function main() {
  // constructor requires poolManager address
  const poolManagerAddress = process.env.POOL_MANAGER || process.env.POOL_MANAGER_ADDRESS || "";
  if (!poolManagerAddress) {
    console.error("Please set POOL_MANAGER or POOL_MANAGER_ADDRESS environment variable to the pool manager address");
    process.exit(1);
  }

  const IdleLiquidityHook = await ethers.getContractFactory(
    "contracts/hooks/IdleLiquidityHookEnterprise.sol:IdleLiquidityHookEnterprise"
  );

  console.log("Deploying IdleLiquidityHookEnterprise with poolManager:", poolManagerAddress);
  const hook = await IdleLiquidityHook.deploy(poolManagerAddress);
  await hook.deployed();

  console.log("IdleLiquidityHookEnterprise deployed to:", hook.address);
  console.log("Network:", await hook.provider.getNetwork());
  console.log("Transaction hash:", hook.deployTransaction.hash);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
