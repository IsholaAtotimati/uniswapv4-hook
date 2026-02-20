const { ethers } = require("hardhat");

async function deployIdleLiquidityHook() {
  const signers = await ethers.getSigners();

  // Deploy PoolManagerMock
  const PoolManagerMock = await ethers.getContractFactory("PoolManagerMock");
  const poolManager = await PoolManagerMock.deploy();
  await poolManager.waitForDeployment();

  // Deploy ERC4626Mock
  const ERC4626Mock = await ethers.getContractFactory("ERC4626Mock");
  const vaultMock = await ERC4626Mock.deploy();
  await vaultMock.waitForDeployment();

  // Deploy IdleLiquidityHookEnterprise
  const IdleLiquidityHook = await ethers.getContractFactory(
    "contracts/hooks/IdleLiquidityHookEnterprise.sol:IdleLiquidityHookEnterprise"
  );
  const idleLiquidityHook = await IdleLiquidityHook.deploy(await poolManager.getAddress());
  await idleLiquidityHook.waitForDeployment();

  // Configure a pool
  const poolId = ethers.encodeBytes32String("1");
  await idleLiquidityHook.setPoolConfig(poolId, await vaultMock.getAddress(), 5000, 5000);

  return { signers, poolManager, vaultMock, idleLiquidityHook, poolId };
}

module.exports = { deployIdleLiquidityHook };
