const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Batch Import", function () {
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
    poolId = ethers.keccak256(ethers.toUtf8Bytes("BATCH_POOL"));
  });

  it("should batch import multiple positions", async function () {
    // Prepare test data
    const signers = await ethers.getSigners();
    const lps = [await signers[1].getAddress(), await signers[2].getAddress()];
    const liqu0 = [1000, 2000];
    const liqu1 = [1500, 2500];
    const lowers = [-100, -200];
    const uppers = [100, 200];
    const statuses = [0, 1]; // ACTIVE, IDLE
    const acc0s = [10, 20];
    const acc1s = [15, 25];


    // Build array of ImportPositionParams structs
    const params = lps.map((lp, i) => ({
      lp,
      liquidity0: liqu0[i],
      liquidity1: liqu1[i],
      lower: lowers[i],
      upper: uppers[i],
      status: statuses[i],
      acc0: acc0s[i],
      acc1: acc1s[i]
    }));

    await hook.importPositionsBatch(poolId, params);

    // Check imported positions
    for (let i = 0; i < lps.length; i++) {
      const pos = await hook.positions(poolId, lps[i]);
      expect(pos.liquidity0).to.equal(liqu0[i]);
      expect(pos.liquidity1).to.equal(liqu1[i]);
      expect(pos.lowerTick).to.equal(lowers[i]);
      expect(pos.upperTick).to.equal(uppers[i]);
      expect(pos.status).to.equal(statuses[i]);
      expect(pos.accumulatedYield0).to.equal(acc0s[i]);
      expect(pos.accumulatedYield1).to.equal(acc1s[i]);
    }
  });
});
