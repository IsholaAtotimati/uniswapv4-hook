const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("IdleLiquidityHookEnterprise Upgraded", function () {
  let hook;
  let poolManager;
  let owner;
  let poolId;
  let asset;
  let aToken;
  let lendingPool;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy mocks
    const PoolManagerMock = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManagerMock.deploy();
    await poolManager.waitForDeployment();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    asset = await ERC20Mock.deploy("USDC", "USDC", ethers.parseUnits("1000000", 6));
    await asset.waitForDeployment();


    const ATokenMock = await ethers.getContractFactory("ATokenMock");
    aToken = await ATokenMock.deploy("aUSDC", "aUSDC");
    await aToken.waitForDeployment();

    const LendingPoolMock = await ethers.getContractFactory("contracts/mocks/LendingPoolMock.sol:LendingPoolMock");
    lendingPool = await LendingPoolMock.deploy();
    await lendingPool.waitForDeployment();
    await aToken.setLendingPool(await lendingPool.getAddress());
    await lendingPool.initReserve(await asset.getAddress(), await aToken.getAddress());

    // Deploy hook
    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.deploy(await poolManager.getAddress());
    await hook.waitForDeployment();

    poolId = ethers.keccak256(ethers.toUtf8Bytes("UPGRADED_POOL"));

    // Configure pool for Aave strategy (side 0)
    await hook.setPoolConfigAave(
      poolId,
      0,
      await asset.getAddress(),
      await lendingPool.getAddress(),
      await aToken.getAddress(),
      5000,
      5000
    );

    // Mint asset to owner for testing
    await asset.mint(owner.address, ethers.parseUnits("10000", 6));
    // Approve hook to spend owner's asset
    await asset.connect(owner).approve(await hook.getAddress(), ethers.parseUnits("10000", 6));
  });

  /*
  it("should move liquidity to idle and back to active", async function () {
    // ---------------------------
    // 1. Register position (ACTIVE)
    // ---------------------------
    // Transfer asset to hook so it can deposit to lending pool
    await asset.connect(owner).transfer(await hook.getAddress(), ethers.parseUnits("1000", 6));

    await hook.registerPosition(
      poolId,
      ethers.parseUnits("1000", 6),
      0,
      -60000,
      60000
    );

    let pos = await hook.positions(poolId, owner.address);

    expect(pos.liquidity0).to.be.gt(0);   // ✅ active liquidity exists
    expect(pos.aTokenPrincipal0).to.equal(0);

  // ---------------------------
  // 2. Force OUT OF RANGE using setTestTick
  // ---------------------------
  await poolManager.setTestTick(70000); // Out of range
  await hook.testMarkNeedUpdate(poolId);
  await hook.rebalance(poolId, 0, 10);

  pos = await hook.positions(poolId, owner.address);

  // ---------------------------
  // ✅ VALIDATE: moved to IDLE
  // ---------------------------
  expect(pos.liquidity0).to.equal(0);              // removed from pool
  expect(pos.aTokenPrincipal0).to.be.gt(0);        // deposited to Aave

  // ---------------------------
  // 3. Move BACK IN RANGE using setTestTick
  // ---------------------------
  await poolManager.setTestTick(0); // In range
  await hook.testMarkNeedUpdate(poolId);
  await hook.rebalance(poolId, 0, 10);

  pos = await hook.positions(poolId, owner.address);

  // Debug output for diagnosis
  const aTokenBalance = await aToken.balanceOf(owner.address);
  const hookATokenBalance = await aToken.balanceOf(await hook.getAddress());
  const hookAssetBalance = await asset.balanceOf(await hook.getAddress());
  console.log("DEBUG: pos after in-range", pos);
  console.log("DEBUG: aTokenBalance (owner)", aTokenBalance.toString());
  console.log("DEBUG: aTokenBalance (hook)", hookATokenBalance.toString());
  console.log("DEBUG: assetBalance (hook)", hookAssetBalance.toString());

  // ---------------------------
  // ✅ VALIDATE: back to ACTIVE
  // ---------------------------
  expect(pos.liquidity0).to.be.gt(0);     // liquidity restored
  expect(pos.aTokenPrincipal0).to.equal(0); // withdrawn from Aave
});
*/
});