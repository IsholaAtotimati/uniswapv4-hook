const { ethers } = require("hardhat");

async function main() {
  // Fully qualified name ensures the correct contract is loaded
  const IdleLiquidityHook = await ethers.getContractFactory(
    "contracts/hooks/IdleLiquidityHookEnterprise.sol:IdleLiquidityHookEnterprise"
  );

  console.log("Constructor inputs:", IdleLiquidityHook.interface.deploy.inputs);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
