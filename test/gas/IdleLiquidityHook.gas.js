const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Gas Tests", function () {
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

    poolId = ethers.keccak256(
      ethers.toUtf8Bytes("GAS_POOL")
    );
  });

  it("measure register + deregister gas", async function () {
    const tx1 = await hook.registerPosition(
      poolId,
      10000,
      -500,
      500
    );

    const receipt1 = await tx1.wait();
    console.log("Register Gas Used:", receipt1.gasUsed.toString());
    const ownerAddress = await owner.getAddress();
    const poolKey = [
      ownerAddress,
      ownerAddress,
      3000,
      60,
      await hook.getAddress()
    ];

    const tx2 = await hook.deregisterPosition(poolId, poolKey);
    const receipt2 = await tx2.wait();

    console.log("Deregister Gas Used:", receipt2.gasUsed.toString());
  });
});