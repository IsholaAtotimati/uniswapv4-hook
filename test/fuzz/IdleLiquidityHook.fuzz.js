const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Fuzz Tests", function () {
  let hook, poolManager, owner, accounts;
  let pid;

  beforeEach(async function () {
    [owner, ...accounts] = await ethers.getSigners();

    // deploy a mock pool manager
    const PoolManager = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManager.connect(owner).deploy(); // ethers v6: no .deployed()

    // deploy the hook
    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.connect(owner).deploy(poolManager.target); // ethers v6 uses .target
    // generate a pool id
    pid = ethers.keccak256(ethers.toUtf8Bytes("POOL_1"));
  });

  it("should handle random LP registrations", async function () {
    const max = Math.min(accounts.length, 5);
    for (let i = 0; i < max; i++) {
      const user = accounts[i];
      if (!user) throw new Error("Not enough signers for fuzz test");
      const liquidity0 = Math.floor(Math.random() * 1000) + 1;
      const liquidity1 = Math.floor(Math.random() * 1000) + 1;

      await hook.connect(user).registerPosition(pid, liquidity0, liquidity1, -60, 60);
      const pos = await hook.positions(pid, user.address);

      expect(pos.liquidity0).to.equal(liquidity0);
      expect(pos.liquidity1).to.equal(liquidity1);
    }
  });
});