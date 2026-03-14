const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Batch Import", function () {
  let hook, poolManager, owner, signers;
  let pid;

  beforeEach(async function () {
    signers = await ethers.getSigners();
    if (!signers || signers.length === 0) {
      signers = [];
      owner = undefined;
    } else {
      [owner] = signers;
    }

    const PoolManager = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManager.connect(owner).deploy();

    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.connect(owner).deploy(poolManager.target);

    pid = ethers.keccak256(ethers.toUtf8Bytes("POOL_1"));
  });

  it("should batch import multiple positions", async function () {
    // Robust signers check
    if (!signers || signers.length < 3) this.skip(); // Need at least 3 signers (owner + 2 LPs)
    const lps = [];
    for (let i = 1; i <= 2; i++) {
      lps.push(await signers[i].getAddress());
    }
    const liqu0 = [1000, 2000];
    const liqu1 = [1500, 2500];
    const lowers = [-100, -200];
    const uppers = [100, 200];
    // call batch import
    for (let i = 0; i < lps.length; i++) {
      await hook.connect(owner).importPosition(
        pid,
        lps[i],
        liqu0[i],
        liqu1[i],
        lowers[i],
        uppers[i],
        0, // strategy type
        0, // last index
        0  // placeholder
      );
    }
    // verify
    for (let i = 0; i < lps.length; i++) {
      const stored = await hook.positions(pid, lps[i]);
      expect(stored.liquidity0).to.equal(liqu0[i]);
      expect(stored.liquidity1).to.equal(liqu1[i]);
    }
  });
});