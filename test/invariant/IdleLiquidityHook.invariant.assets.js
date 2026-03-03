const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Invariant: totalAssets >= totalUserBalances", function () {
  let hook;
  let poolManager;
  let owner;
  let poolId;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const PoolManagerMock = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManagerMock.deploy();
    await poolManager.waitForDeployment();
    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.deploy(await poolManager.getAddress());
    await hook.waitForDeployment();
    poolId = ethers.keccak256(ethers.toUtf8Bytes("INVARIANT_POOL"));
  });

  it("should always have totalAssets >= totalUserBalances", async function () {
    // Register a few positions
    await hook.registerPosition(poolId, 1000, 2000, -100, 100);
    await hook.registerPosition(poolId, 500, 1500, -200, 200);
    // Simulate yield and rebalance
    await hook.testMarkNeedUpdate(poolId);
    await hook.rebalance(poolId, 0, 2);
    // Calculate totalAssets and totalUserBalances
    // (Assume getPositionValue and trackedLPs are public)
    const lps = await hook.getTrackedLPs(poolId);
    let totalUser = ethers.toBigInt(0);
    for (const lp of lps) {
      totalUser += await hook.getPositionValue(poolId, lp);
    }
    // For demo, use contract balance as totalAssets (should sum vaults, aTokens, etc. in real impl)
    const totalAssets = await ethers.provider.getBalance(hook.getAddress());
    expect(totalAssets).to.be.gte(totalUser);
  });
});
