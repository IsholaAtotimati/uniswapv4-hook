const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Unit Tests", function () {
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
      ethers.toUtf8Bytes("UNIT_POOL")
    );
  });

  it("should register a position", async function () {
    await hook.registerPosition(
      poolId,
      1000,
      -600,
      600
    );

    const ownerAddress = await owner.getAddress();
    const position = await hook.positions(poolId, ownerAddress);
    expect(position.liquidity).to.equal(1000);
  });

  it("should deregister a position", async function () {
    await hook.registerPosition(
      poolId,
      1000,
      -600,
      600
    );

    const ownerAddress = await owner.getAddress();
    const poolKey = [ownerAddress, ownerAddress, 3000, 60, await hook.getAddress()];

    await hook.deregisterPosition(poolId, poolKey);

    const position = await hook.positions(poolId, ownerAddress);
    expect(position.liquidity).to.equal(0);
  });
});