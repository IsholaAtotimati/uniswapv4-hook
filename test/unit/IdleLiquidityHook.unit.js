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
      // supply equal liquidity on both sides for simplicity
      await hook.registerPosition(
        poolId,
        1000,
        1000,
        -600,
        600
      );

      const ownerAddress = await owner.getAddress();
      const position = await hook.positions(poolId, ownerAddress);
      expect(position.liquidity0).to.equal(1000);
      expect(position.liquidity1).to.equal(1000);
    });
  it("should deregister a position", async function () {
      await hook.registerPosition(
        poolId,
        500,
        250,
        -600,
        600
      );

      const ownerAddress = await owner.getAddress();
      await hook.deregisterPosition(poolId);

      const position = await hook.positions(poolId, ownerAddress);
      expect(position.liquidity0).to.equal(0);
      expect(position.liquidity1).to.equal(0);
    });

  describe("configuration guards", function () {
    it("setPoolConfigVault rejects zero vault", async function () {
      // The contract expects asset and vault addresses, so pass both as zero to trigger the revert
      await expect(
        hook.setPoolConfigVault(poolId, 0, ethers.ZeroAddress, ethers.ZeroAddress, 5000, 5000)
      ).to.be.revertedWith("zero asset");
      await expect(
        hook.setPoolConfigVault(poolId, 0, await owner.getAddress(), ethers.ZeroAddress, 5000, 5000)
      ).to.be.revertedWith("zero vault");
    });

    it("setPoolConfigAave rejects zero parameters", async function () {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const token = await ERC20Mock.deploy("Token", "TKN", 18);
      await token.waitForDeployment();
      // asset zero
      await expect(
        hook.setPoolConfigAave(poolId, 0, ethers.ZeroAddress, token.getAddress(), await owner.getAddress(), 5000, 5000)
      ).to.be.revertedWith("zero asset");
      // lendingPool zero
      await expect(
        hook.setPoolConfigAave(poolId, 0, token.getAddress(), ethers.ZeroAddress, await owner.getAddress(), 5000, 5000)
      ).to.be.revertedWith("zero lendingPool");
      // aToken zero
      await expect(
        hook.setPoolConfigAave(poolId, 0, token.getAddress(), token.getAddress(), ethers.ZeroAddress, 5000, 5000)
      ).to.be.revertedWith("zero aToken");
    });
  });

  describe("dual-token asset selection", function () {
    it("claims yield using configured asset regardless of pool key currency0", async function () {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const tokenA = await ERC20Mock.deploy("TokenA", "TKNA", 1000);
      await tokenA.waitForDeployment();
      const tokenAAddress = await tokenA.getAddress();
      const tokenB = await ERC20Mock.deploy("TokenB", "TKNB", 1000);
      await tokenB.waitForDeployment();
      const tokenBAddress = await tokenB.getAddress();
      const VaultMock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
      const vaultA = await VaultMock.deploy(tokenAAddress);
      await vaultA.waitForDeployment();
      const vaultB = await VaultMock.deploy(tokenBAddress);
      await vaultB.waitForDeployment();
      // Set up mock aggregators and set price feeds for both tokens
      const MockAgg = await ethers.getContractFactory("MockAggregator");
      const aggA = await MockAgg.deploy(777);
      await aggA.waitForDeployment();
      const aggB = await MockAgg.deploy(888);
      await aggB.waitForDeployment();
      await hook.setPriceFeed(tokenAAddress, aggA.getAddress());
      await hook.setPriceFeed(tokenBAddress, aggB.getAddress());
      // Ensure price feed is fresh (simulate Chainlink update)
      const now = Math.floor(Date.now() / 1000);
      await aggA.setRoundData(777, now);
      await aggB.setRoundData(888, now);
      // configure vaults for both asset sides
      await hook.setPoolConfigVault(poolId, 0, tokenAAddress, vaultA.getAddress(), 5000, 5000);
      await hook.setPoolConfigVault(poolId, 1, tokenBAddress, vaultB.getAddress(), 5000, 5000);
      // register a position and simulate yield distribution
      await hook.registerPosition(poolId, 1000, 0, -600, 600);
      const ownerAddress = await owner.getAddress();
      // bump index as if 123 tokens were earned
      await hook.addGlobalYield(poolId, 0, 123);
      await hook.processPosition(poolId, ownerAddress);
      await tokenA.transfer(hook.getAddress(), 123);
      await expect(() => hook.claimYield(poolId)).to.changeTokenBalance(
        tokenA,
        owner,
        123
      );
    });

    it("allows owner to set and read price feeds", async function () {
      // Deploy aggregator and token mocks first
      const MockAgg = await ethers.getContractFactory("MockAggregator");
      const agg = await MockAgg.deploy(777);
      await agg.waitForDeployment();
      const now = Math.floor(Date.now() / 1000);
      await agg.setRoundData(777, now);
      const ownerAddress = await owner.getAddress();

      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const tokenA = await ERC20Mock.deploy("TokenA", "TKNA", 1000);
      await tokenA.waitForDeployment();

      await expect(hook.setPriceFeed(tokenA.getAddress(), agg.getAddress()))
        .to.emit(hook, "PriceFeedUpdated");
      expect(await hook.priceFeed(tokenA.getAddress())).to.equal(await agg.getAddress());

      const price = await hook.getLatestPrice(tokenA.getAddress());
      expect(price).to.equal(777);

      await agg.setAnswer(888);
      const price2 = await hook.getLatestPrice(tokenA.getAddress());
      expect(price2).to.equal(888);

      // deploy a second token and attach a feed for it as well
      const tokenB = await ERC20Mock.deploy("TokenB", "TKNB", 1000);
      await tokenB.waitForDeployment();
      const aggB = await MockAgg.deploy(2);
      await aggB.waitForDeployment();
      await aggB.setRoundData(2, now);
      await hook.setPriceFeed(tokenB.getAddress(), aggB.getAddress());
      expect(await hook.priceFeed(tokenB.getAddress())).to.equal(await aggB.getAddress());

      // configure pool so assets are recognised
      const VaultMock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
      const vaultA = await VaultMock.deploy(tokenA.getAddress());
      await vaultA.waitForDeployment();
      const vaultB = await VaultMock.deploy(tokenB.getAddress());
      await vaultB.waitForDeployment();
      await hook.setPoolConfigVault(poolId, 0, tokenA.getAddress(), vaultA.getAddress(), 5000, 5000);
      await hook.setPoolConfigVault(poolId, 1, tokenB.getAddress(), vaultB.getAddress(), 5000, 5000);

      // create a position with 10 units of each side
      await hook.registerPosition(poolId, 10, 10, -10, 10);
      const val = await hook.getPositionValue(poolId, ownerAddress);
      expect(val).to.equal(8880 + 20);
    });
  });

  describe("migration helpers", function () {
    it("importPosition copies data correctly", async function () {
      const ownerAddress = await owner.getAddress();
      // simulate old position values
      const pid = poolId;
      await hook.importPosition(pid, ownerAddress, 1234, 5678, -100, 100, 0, 42, 84);
      const pos = await hook.positions(pid, ownerAddress);
      expect(pos.liquidity0).to.equal(1234);
      expect(pos.liquidity1).to.equal(5678);
      expect(pos.lowerTick).to.equal(-100);
      expect(pos.upperTick).to.equal(100);
      expect(pos.accumulatedYield0).to.equal(42);
      expect(pos.accumulatedYield1).to.equal(84);
    });
  });

  describe("global index accounting", function () {
    it("lets owner bump index and LP collect correct share", async function () {
      // Set up mock aggregators and set price feeds for both assets
      const MockAgg = await ethers.getContractFactory("MockAggregator");
      const aggA = await MockAgg.deploy(777);
      await aggA.waitForDeployment();
      const aggB = await MockAgg.deploy(888);
      await aggB.waitForDeployment();
      const now = Math.floor(Date.now() / 1000);
      await aggA.setRoundData(777, now);
      await aggB.setRoundData(888, now);
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const tokenA = await ERC20Mock.deploy("TokenA", "TKNA", 1000000);
      await tokenA.waitForDeployment();
      const tokenB = await ERC20Mock.deploy("TokenB", "TKNB", 1000000);
      await tokenB.waitForDeployment();
      await hook.setPriceFeed(tokenA.getAddress(), aggA.getAddress());
      await hook.setPriceFeed(tokenB.getAddress(), aggB.getAddress());
      const VaultMock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
      const vaultA = await VaultMock.deploy(tokenA.getAddress());
      await vaultA.waitForDeployment();
      const vaultB = await VaultMock.deploy(tokenB.getAddress());
      await vaultB.waitForDeployment();
      await hook.setPoolConfigVault(poolId, 0, tokenA.getAddress(), vaultA.getAddress(), 5000, 5000);
      await hook.setPoolConfigVault(poolId, 1, tokenB.getAddress(), vaultB.getAddress(), 5000, 5000);

      // register a position with 1000 liquidity0
      await hook.registerPosition(poolId, 1000, 0, -100, 100);
      const ownerAddress = await owner.getAddress();

      // bump index as if 500 tokens of yield were generated for side0
      await hook.addGlobalYield(poolId, 0, 500);

      // simulate LP lazy accrual via keeper
      await hook.processPosition(poolId, ownerAddress);

      const pos = await hook.positions(poolId, ownerAddress);
      expect(pos.accumulatedYield0).to.equal(500);

      // claiming should transfer tokens and clear the amount
      await tokenA.transfer(hook.getAddress(), 500);
      await expect(() => hook.claimYield(poolId)).to.changeTokenBalance(
        tokenA,
        owner,
        500
      );
      const posAfter = await hook.positions(poolId, ownerAddress);
      expect(posAfter.accumulatedYield0).to.equal(0);
    });


  });

});
