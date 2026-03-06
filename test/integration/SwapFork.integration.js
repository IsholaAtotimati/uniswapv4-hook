const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdleLiquidityHookEnterprise - Multi-Pool Multi-LP Full Integration", function () {
  let hook, poolManager, user1, user2, whale;
  let USDC, DAI, WETH, token0, token1, token2;
  let vault, vaultUSDC; // vault instances for two pools
  // pool identifiers (bytes32) for two dummy pools
  let pool0Id, pool1Id;
  let pool2Id; // additional pool used for Aave strategy
  let useRealAave; // configured in before()
  // when running against a mainnet fork we may want to target the real Aave
  // lending pool instead of the mock helper.  set REAL_AAVE=true in the
  // environment to flip behaviour (default is mock so existing CI keeps
  // running without needing mainnet state).
  const AAVE_LENDING_POOL = "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9"; // Aave v2
  const AAVE_USDC_ATOKEN = "0xBcca60bB61934080951369a648Fb03DF4F96263C";
  let aTokenAddr; // address of the aToken used by the lending pool

  const USDC_ADDR = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const DAI_ADDR = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const WETH_ADDR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  before(async function () {
    // fork reset can take a while; give mocha extra time
    this.timeout(120000);
    [user1, user2] = await ethers.getSigners();

    // ensure we are running against a mainnet fork so that the real ERC20
    // contracts exist at their canonical addresses.  The CLI may be using the
    // default hardhat network without forking, so we explicitly reset the
    // provider here before doing any on‑chain operations.
    await ethers.provider.send("hardhat_reset", [{
      forking: {
        jsonRpcUrl: process.env.MAINNET_RPC_URL ||
          "https://mainnet.infura.io/v3/5741534f26d042999a28f7afd1e61fd7",
        blockNumber: 19700000,
      },
    }]);
    const forkedBlock = await ethers.provider.getBlockNumber();
    // (forkedBlock consumed but not logged)

    // quickly verify that common mainnet addresses actually have code
    const codeUSDC = await ethers.provider.getCode(USDC_ADDR);
    const codeDAI = await ethers.provider.getCode(DAI_ADDR);
    // lengths are checked implicitly by later operations

    // Attach mainnet tokens
    token0 = await ethers.getContractAt("IERC20", USDC_ADDR);
    token1 = await ethers.getContractAt("IERC20", DAI_ADDR);
    token2 = await ethers.getContractAt("IERC20", WETH_ADDR);

    // Impersonate USDC whale
    const USDC_WHALE = "0x55fe002aeff02f77364de339a1292923a15844b8";
    await ethers.provider.send("hardhat_impersonateAccount", [USDC_WHALE]);
    whale = await ethers.getSigner(USDC_WHALE);
    // give the whale some ETH so it can pay gas on the fork
    const tinyEth = ethers.parseEther("1");
    // convert BigInt to hex string for hardhat_setBalance
    await ethers.provider.send("hardhat_setBalance", [USDC_WHALE, "0x" + tinyEth.toString(16)]);

    // Make next block cheap so the whale's transfer transactions don't fail
    await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
    // Fund test users (not strictly required but useful to mimic mainnet)
    await token0.connect(whale).transfer(user1.address, ethers.parseUnits("1000", 6));
    await token0.connect(whale).transfer(user2.address, ethers.parseUnits("1000", 6));
    await token1.connect(whale).transfer(user1.address, ethers.parseUnits("1000", 18));
    await token1.connect(whale).transfer(user2.address, ethers.parseUnits("1000", 18));
    // check whether the USDC whale also holds any DAI
    const whaleDaiBal = await token1.balanceOf(USDC_WHALE);
    // whaleDaiBal available if needed
    // later we will also deposit some tokens directly into the hook
    // optional check: code lengths fetched (not explicitly logged)
    await ethers.provider.getCode(USDC_ADDR);
    await ethers.provider.getCode(DAI_ADDR);

    // Deploy mock PoolManager
    const PoolManager = await ethers.getContractFactory("PoolManagerMock");
    poolManager = await PoolManager.deploy();
    await poolManager.waitForDeployment();

    // choose stable pool identifiers
    pool0Id = ethers.keccak256(ethers.toUtf8Bytes("POOL_0"));
    pool1Id = ethers.keccak256(ethers.toUtf8Bytes("POOL_1"));
    console.log('pool0Id', pool0Id);
    console.log('pool1Id', pool1Id);

    // Deploy hook
    const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
    hook = await Hook.deploy(await poolManager.getAddress());
    await hook.waitForDeployment();

    // Deploy mock ERC4626 vault for DAI
    const ERC4626Mock = await ethers.getContractFactory("contracts/mocks/ERC4626Mock.sol:ERC4626Mock");
    vault = await ERC4626Mock.deploy(await token1.getAddress());
    await vault.waitForDeployment();

    // after deployments, top up the hook with a small amount of tokens so
    // it can successfully pay out yield during the claim test
    await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]);
    const hookAddr = await hook.getAddress();
    await token0.connect(whale).transfer(hookAddr, ethers.parseUnits("1000", 6));
    // whale only has ~800 DAI on the fork; send a smaller amount so the transfer
    // doesn't revert
    await token1.connect(whale).transfer(hookAddr, ethers.parseUnits("100", 18));

    // Configure pool 0: USDC → ERC4626 vault (use a dedicated vault instance)
    vaultUSDC = await ERC4626Mock.deploy(await token0.getAddress());
    await vaultUSDC.waitForDeployment();
    await hook.setPoolConfigVault(
      pool0Id, 0, USDC_ADDR, await vaultUSDC.getAddress(), 8000, 2000
    );

    // Configure pool 1: DAI → ERC4626 vault
    await hook.setPoolConfigVault(
      pool1Id, 0, DAI_ADDR, await vault.getAddress(), 7000, 3000
    );

    // ---- new Aave pool configuration -------------------------------------
    // pool2 will use USDC with the Aave strategy.  tests can either deploy a
    // tiny mock lending pool (default) or point at the real Aave contract on
    // mainnet by exporting REAL_AAVE=true when running the integration suite.
    pool2Id = ethers.keccak256(ethers.toUtf8Bytes("POOL_2"));
    useRealAave = process.env.REAL_AAVE === "true";
    let lendingPoolAddress;
    if (useRealAave) {
      lendingPoolAddress = AAVE_LENDING_POOL;
      aTokenAddr = AAVE_USDC_ATOKEN;
      console.log("Using real Aave lending pool", lendingPoolAddress);
    } else {
      const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
      const aTokenMock = await ERC20Mock.deploy("aUSDC", "aUSDC", 0);
      await aTokenMock.waitForDeployment();
      aTokenAddr = await aTokenMock.getAddress();
      const LendingPoolMock = await ethers.getContractFactory("LendingPoolMock");
      const lendingPool = await LendingPoolMock.deploy(USDC_ADDR, aTokenAddr);
      await lendingPool.waitForDeployment();
      lendingPoolAddress = await lendingPool.getAddress();
    }

    await hook.setPoolConfigAave(
      pool2Id,
      0,
      USDC_ADDR,
      lendingPoolAddress,
      aTokenAddr,
      8000,
      2000
    );

    // Register positions (note: must connect as the correct LP)
    await hook.registerPosition(pool0Id, ethers.parseUnits("500", 6), 0, 0, 1000); // user1 position
    await hook.connect(user2).registerPosition(pool1Id, ethers.parseUnits("500", 18), 0, 0, 1000); // user2 position
    // position for Aave pool (owner is user1 by default)
    await hook.registerPosition(pool2Id, ethers.parseUnits("500", 6), 0, 1, 100);
  });

  it("should mark pool update after simulated swap", async function () {
    // Manually mark pools as needing update
    console.log('debug: calling testMarkNeedUpdate pool0Id', pool0Id);
    await hook.testMarkNeedUpdate(pool0Id);
    console.log('debug: succeeded first call');
    console.log('debug: calling testMarkNeedUpdate pool1Id', pool1Id);
    await hook.testMarkNeedUpdate(pool1Id);
    console.log('debug: succeeded second call');

    console.log('debug: reading needUpdate for pool0Id');
    const flag0 = await hook.needUpdate(pool0Id);
    console.log('flag0', flag0);
    expect(flag0).to.equal(true);
    const flag1 = await hook.needUpdate(pool1Id);
    console.log('flag1', flag1);
    expect(flag1).to.equal(true);
  });

  it("should simulate yield and rebalance all LPs", async function () {
    // mark pools needing update (snapshot isolation wipes prior state)
    await hook.testMarkNeedUpdate(pool0Id);
    await hook.testMarkNeedUpdate(pool1Id);

    // bump global yield indices to simulate generated yield
    console.log('debug2: addGlobalYield pool0');
    await hook.addGlobalYield(pool0Id, 0, ethers.parseUnits("10", 6));
    console.log('debug2: addGlobalYield pool1');
    await hook.addGlobalYield(pool1Id, 0, ethers.parseUnits("20", 18));

    // Rebalance pool 0 (USDC vault)
    console.log('debug2: calling rebalance pool0');
    await hook.rebalance(pool0Id, 0, 1);
    console.log('debug2: calling rebalance pool1');
    // Rebalance pool 1 (DAI vault)
    await hook.rebalance(pool1Id, 0, 1);

    // Ensure needUpdate flags reset
    const flag0 = await hook.needUpdate(pool0Id);
    const flag1 = await hook.needUpdate(pool1Id);
    console.log('debug2 flags', flag0, flag1);
    expect(flag0).to.equal(false);
    expect(flag1).to.equal(false);
  });

  it("should accrue yield and allow LPs to claim", async function () {
    // configure price feeds for both assets
    const MockAgg = await ethers.getContractFactory("MockAggregator");
    const aggUSDC = await MockAgg.deploy(1);
    await aggUSDC.waitForDeployment();
    const aggDAI = await MockAgg.deploy(1);
    await aggDAI.waitForDeployment();
    await hook.setPriceFeed(USDC_ADDR, await aggUSDC.getAddress());
    await hook.setPriceFeed(DAI_ADDR, await aggDAI.getAddress());

    // we are in a fresh snapshot so previously added yield is gone; bump again
    const idle0 = await hook.totalIdleLiquidity(pool0Id, 0);
    const idle1 = await hook.totalIdleLiquidity(pool1Id, 0);
    console.log('debug: totalIdleLiquidity pool0 side0', idle0.toString());
    console.log('debug: totalIdleLiquidity pool1 side0', idle1.toString());
    await hook.addGlobalYield(pool0Id, 0, ethers.parseUnits("10", 6));
    await hook.addGlobalYield(pool1Id, 0, ethers.parseUnits("20", 18));
    const idx0 = await hook.globalYieldIndex(pool0Id, 0);
    const idx1 = await hook.globalYieldIndex(pool1Id, 0);
    console.log('debug: globalYieldIndex pool0 side0', idx0.toString());
    console.log('debug: globalYieldIndex pool1 side0', idx1.toString());

    // Process positions to accrue yield
    const posBefore0 = await hook.positions(pool0Id, user1.address);
    console.log('debug: posBefore0', posBefore0);
    const posBefore1 = await hook.positions(pool1Id, user2.address);
    console.log('debug: posBefore1', posBefore1);

    await hook.processPosition(pool0Id, user1.address);
    await hook.processPosition(pool1Id, user2.address);

    const pos1 = await hook.positions(pool0Id, user1.address);
    const pos2 = await hook.positions(pool1Id, user2.address);
    console.log('debug: posAfter0', pos1);
    console.log('debug: posAfter1', pos2);

    expect(pos1.accumulatedYield0).to.be.gt(0);
    expect(pos2.accumulatedYield0).to.be.gt(0);

    // claim and verify balances increased
    console.log('debug: token0 address', await token0.getAddress());
    const code0 = await ethers.provider.getCode(await token0.getAddress());
    console.log('debug: token0 code length', code0.length);
    const code1 = await ethers.provider.getCode(await token1.getAddress());
    console.log('debug: token1 code length', code1.length);
    const usdcBalanceBefore = await token0.balanceOf(user1.address);
    const daiBalanceBefore = await token1.balanceOf(user2.address);

    await hook.connect(user1).claimYield(pool0Id);
    await hook.connect(user2).claimYield(pool1Id);

    const usdcBalanceAfter = await token0.balanceOf(user1.address);
    const daiBalanceAfter = await token1.balanceOf(user2.address);

    expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
    expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
  });

  // --- Aave pool sanity check ------------------------------------------------
  it("should deposit and withdraw via Aave strategy", async function () {
    // price feed for USDC required for oracle safety
    const MockAgg = await ethers.getContractFactory("MockAggregator");
    const feed = await MockAgg.deploy(1);
    await feed.waitForDeployment();
    await hook.setPriceFeed(USDC_ADDR, await feed.getAddress());

    // aTokenMock address saved in before() closure? we need to capture it earlier
    // unfortunately the variable was declared inside before(), so recreate handle
    const aTokenMock = await ethers.getContractAt("IERC20", aTokenAddr);

    // capture hook USDC balance before doing anything
    const hookAddress = await hook.getAddress();
    const initialHookUsdc = await token0.balanceOf(hookAddress);
    const depositAmount = ethers.parseUnits("500", 6);

    // trigger deposit
    await hook.testMarkNeedUpdate(pool2Id);
    await hook.rebalance(pool2Id, 0, 1);

    if (useRealAave) {
      // real aTokens may accrue interest immediately, so just assert a positive
      // balance rather than exact equality; also compute delta instead of
      // direct comparison on USDC because Aave rounds.
      const aBal = await aTokenMock.balanceOf(hookAddress);
      expect(aBal).to.be.gt(0);
      const postDepositUsdc = await token0.balanceOf(hookAddress);
      expect(postDepositUsdc).to.be.lt(initialHookUsdc);

      // move back in range and execute a second rebalance to withdraw funds
      await hook.testSetPositionRange(pool2Id, user1.address, -100, 100);
      await hook.testMarkNeedUpdate(pool2Id);
      await hook.rebalance(pool2Id, 0, 1);

      const aBalAfter = await aTokenMock.balanceOf(hookAddress);
      // some tiny remainder is acceptable due to rounding; make sure it's
      // significantly smaller than the original deposit.
      const oneUsdc = ethers.parseUnits("1", 6);
      expect(aBalAfter).to.be.lt(oneUsdc);
      const postWithdrawUsdc = await token0.balanceOf(hookAddress);
      // on a real pool we may lose or gain a few wei due to rounding/interest;
      // assert that we are roughly back where we started (within 1 USDC unit).
      expect(postWithdrawUsdc).to.be.gte(initialHookUsdc - 1n);
      expect(postWithdrawUsdc).to.be.lte(initialHookUsdc + 1n);
    } else {
      expect(await aTokenMock.balanceOf(hookAddress)).to.equal(depositAmount);
      // hook's USDC should have decreased by depositAmount
      const postDepositUsdc = await token0.balanceOf(hookAddress);
      expect(postDepositUsdc).to.equal(initialHookUsdc - depositAmount);

      // move back in range and withdraw
      await hook.testSetPositionRange(pool2Id, user1.address, -100, 100);
      await hook.testMarkNeedUpdate(pool2Id);
      await hook.rebalance(pool2Id, 0, 1);

      expect(await aTokenMock.balanceOf(hookAddress)).to.equal(0);
      // final USDC balance should return to where we started
      expect(await token0.balanceOf(hookAddress)).to.equal(initialHookUsdc);
    }
  });
});