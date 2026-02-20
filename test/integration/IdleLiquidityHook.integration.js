const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Integration Tests", function () {
  let hook;
  let poolManager;
  let owner;
  let poolId;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];

    const PoolManagerMock = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManagerMock.deploy();
    await poolManager.waitForDeployment();

    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.deploy(await poolManager.getAddress());
    await hook.waitForDeployment();

    poolId = ethers.keccak256(
      ethers.toUtf8Bytes("INTEGRATION_POOL")
    );
  });

  it("full LP lifecycle simulation", async function () {
    await hook.registerPosition(
      poolId,
      5000,
      -120,
      120
    );

    // ✅ get owner address and check position
    const ownerAddress = await owner.getAddress();
    let position = await hook.positions(poolId, ownerAddress);
    expect(position.liquidity).to.equal(5000);

    const poolKey = [ownerAddress, ownerAddress, 3000, 60, await hook.getAddress()];

    await hook.deregisterPosition(poolId, poolKey);

    position = await hook.positions(poolId, ownerAddress);
    expect(position.liquidity).to.equal(0);
  });
});