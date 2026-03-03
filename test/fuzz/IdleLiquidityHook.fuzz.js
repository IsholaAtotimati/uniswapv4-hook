const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Fuzz Tests", function () {
  let hook, owner, accounts;
  let pid;

  beforeEach(async function () {
    [owner, ...accounts] = await ethers.getSigners();

    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.deploy(owner.address);

    pid = ethers.keccak256(ethers.toUtf8Bytes("POOL_1"));
  });

  it("should handle random LP registrations", async function () {
    for (let i = 0; i < 5; i++) {
      const user = accounts[i];
      const liquidity0 = Math.floor(Math.random() * 1000) + 1;
      const liquidity1 = Math.floor(Math.random() * 1000) + 1;

      await hook.connect(user).registerPosition(pid, liquidity0, liquidity1, -60, 60);
      const pos = await hook.positions(pid, user.address);

      expect(pos.liquidity0).to.equal(liquidity0);
      expect(pos.liquidity1).to.equal(liquidity1);
    }
  });
});
