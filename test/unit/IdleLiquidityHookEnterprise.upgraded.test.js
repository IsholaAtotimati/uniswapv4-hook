const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise Upgraded", function () {
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
    poolId = ethers.keccak256(ethers.toUtf8Bytes("UPGRADED_POOL"));
  });

  it("should register and track LPs efficiently", async function () {
    await hook.registerPosition(poolId, 1000, 2000, -100, 100);
    await hook.registerPosition(poolId, 500, 1500, -200, 200);
    // Check tracked LPs
    // This will require a public getter for trackedLPs or EnumerableSet
    // For now, check positions
    const ownerAddress = await owner.getAddress();
    const pos = await hook.positions(poolId, ownerAddress);
    expect(pos.liquidity0).to.equal(500);
    expect(pos.liquidity1).to.equal(1500);
  });

  it("should move liquidity to idle and back to active", async function () {
    // Deploy mock aggregators first
    const MockAgg = await ethers.getContractFactory("MockAggregator");
    const aggA = await MockAgg.deploy(100000000); // 8 decimals
    await aggA.waitForDeployment();
    const aggB = await MockAgg.deploy(200000000); // 8 decimals
    await aggB.waitForDeployment();
    const now = Math.floor(Date.now() / 1000);
    await aggA.setRoundData(100000000, now);
    await aggB.setRoundData(200000000, now);
    // Deploy mock tokens, vaults, and price feeds for both assets
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const tokenA = await ERC20Mock.deploy("TokenA", "TKNA", 1000000);
    await tokenA.waitForDeployment();
    const tokenB = await ERC20Mock.deploy("TokenB", "TKNB", 1000000);
    await tokenB.waitForDeployment();
    const VaultMock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
    const vaultA = await VaultMock.deploy(tokenA.getAddress());
    await vaultA.waitForDeployment();
    const vaultB = await VaultMock.deploy(tokenB.getAddress());
    await vaultB.waitForDeployment();
    await hook.setPoolConfigVault(poolId, 0, tokenA.getAddress(), vaultA.getAddress(), 5000, 5000);
    await hook.setPoolConfigVault(poolId, 1, tokenB.getAddress(), vaultB.getAddress(), 5000, 5000);
    await hook.setPriceFeed(tokenA.getAddress(), aggA.getAddress());
    await hook.setPriceFeed(tokenB.getAddress(), aggB.getAddress());

    // Transfer enough tokens from owner to the contract for both assets
    const ownerAddress = await owner.getAddress();
    // Approve and transfer tokens to the contract so it can deposit to the vault
    await tokenA.approve(hook.getAddress(), 1000000);
    await tokenB.approve(hook.getAddress(), 1000000);
    await tokenA.transfer(hook.getAddress(), 1000);
    await tokenB.transfer(hook.getAddress(), 2000);
    // Register position and rebalance
    await hook.registerPosition(poolId, 1000, 2000, 1, 100); // range excludes 0
    // Simulate out of range
    await hook.testMarkNeedUpdate(poolId);
    await hook.rebalance(poolId, 0, 1);
    // Check status
    const pos = await hook.positions(poolId, ownerAddress);
    expect(pos.status).to.equal(1); // IDLE
    // Deregister and re-register with range that includes 0
    await hook.deregisterPosition(poolId);
    // Transfer tokens again for the new registration
    await tokenA.transfer(hook.getAddress(), 1000);
    await tokenB.transfer(hook.getAddress(), 2000);
    await hook.registerPosition(poolId, 1000, 2000, -100, 100); // range includes 0
    await hook.testMarkNeedUpdate(poolId);
    await hook.rebalance(poolId, 0, 1);
    const pos2 = await hook.positions(poolId, ownerAddress);
    expect(pos2.status).to.equal(0); // ACTIVE
  });

  it("should accrue and claim yield correctly", async function () {
    // Deploy mock aggregators first
    const MockAgg = await ethers.getContractFactory("MockAggregator");
    const aggA = await MockAgg.deploy(100000000); // 8 decimals
    await aggA.waitForDeployment();
    const aggB = await MockAgg.deploy(200000000); // 8 decimals
    await aggB.waitForDeployment();
    const now = Math.floor(Date.now() / 1000);
    await aggA.setRoundData(100000000, now);
    await aggB.setRoundData(200000000, now);
    // Deploy mock token and vault for asset0
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const tokenA = await ERC20Mock.deploy("TokenA", "TKNA", 1000000);
    await tokenA.waitForDeployment();
    const VaultMock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
    const vault = await VaultMock.deploy(tokenA.getAddress());
    await vault.waitForDeployment();
    await hook.setPoolConfigVault(poolId, 0, tokenA.getAddress(), vault.getAddress(), 5000, 5000);
    await hook.setPriceFeed(tokenA.getAddress(), aggA.getAddress());
    // Deploy mock token and vault for asset1
    const tokenB = await ERC20Mock.deploy("TokenB", "TKNB", 1000000);
    await tokenB.waitForDeployment();
    const vaultB = await VaultMock.deploy(tokenB.getAddress());
    await vaultB.waitForDeployment();
    await hook.setPoolConfigVault(poolId, 1, tokenB.getAddress(), vaultB.getAddress(), 5000, 5000);
    await hook.setPriceFeed(tokenB.getAddress(), aggB.getAddress());
    await hook.registerPosition(poolId, 1000, 2000, -100, 100);
    // Simulate yield
    await hook.addGlobalYield(poolId, 0, 100);
    await hook.addGlobalYield(poolId, 1, 200);
    await hook.claimYield(poolId);
    const ownerAddress = await owner.getAddress();
    const pos = await hook.positions(poolId, ownerAddress);
    expect(pos.accumulatedYield0).to.equal(0);
    expect(pos.accumulatedYield1).to.equal(0);
  });
});
