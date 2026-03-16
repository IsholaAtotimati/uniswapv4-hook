const { ethers, network } = require("hardhat");

// Minimal ERC20 ABI with allowance added
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

function step(title) {
  console.log("\n=================================");
  console.log("🚀 " + title);
  console.log("=================================\n");
}

function flow(message) {
  console.log("   ➜ " + message);
}

async function main() {
  console.log("\n=========== ADVANCED LIVE DEMO START ===========\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer / LP:", deployer.address, "\n");

  if (network.name !== "hardhat" && network.name !== "localhost") {
    throw new Error("Run this script on Hardhat fork or localhost");
  }

  const ADDR = {
    USDC: ethers.getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
    WETH: ethers.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
    AAVE_POOL: ethers.getAddress("0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2"),
    A_USDC: ethers.getAddress("0xbcca60bb61934080951369a648fb03df4f96263c")
  };

  const poolId = ethers.keccak256(ethers.toUtf8Bytes("DEMO_POOL"));

  const USDC = new ethers.Contract(ADDR.USDC, ERC20_ABI, deployer);
  const aUSDC = new ethers.Contract(ADDR.A_USDC, ["function balanceOf(address owner) view returns (uint256)"], deployer);

  // -------------------------------
  // Fund Demo Wallet
  // -------------------------------
  step("Fund Demo Wallet with USDC");

  const USDC_WHALE = "0x55fe002aeff02f77364de339a1292923a15844b8";
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [USDC_WHALE]
  });

  const whale = await ethers.getSigner(USDC_WHALE);
  await network.provider.send("hardhat_setBalance", [USDC_WHALE, "0x1000000000000000000"]);
  await USDC.connect(whale).transfer(deployer.address, ethers.parseUnits("2000", 6));
  flow("Deployer funded with 2000 USDC");

  const balance = await USDC.balanceOf(deployer.address);
  console.log("   Balance:", Number(ethers.formatUnits(balance, 6)), "USDC\n");

  // -------------------------------
  // Deploy PoolManager + Hook
  // -------------------------------
  step("Deploy PoolManager + Hook");
  const PoolManagerFactory = await ethers.getContractFactory("PoolManagerMock");
  const poolManager = await PoolManagerFactory.deploy();
  await poolManager.waitForDeployment();

  const HookFactory = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
  const hook = await HookFactory.deploy(await poolManager.getAddress());
  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();
  flow("Hook deployed");
  console.log("   Address:", hookAddress, "\n");

  // -------------------------------
  // Deploy MockAggregator for USDC
  // -------------------------------
  step("Deploy MockAggregator for USDC");
  const MockAggregatorFactory = await ethers.getContractFactory("MockAggregator");
  const mockFeed = await MockAggregatorFactory.deploy(ethers.parseUnits("1", 8));
  await mockFeed.waitForDeployment();
  await hook.setPriceFeed(ADDR.USDC, await mockFeed.getAddress());
  flow("MockAggregator set as USDC price feed");

  // -------------------------------
  // Configure Aave Strategy
  // -------------------------------
  step("Configure Aave Strategy");
  await hook.setPoolConfigAave(poolId, 0, ADDR.USDC, ADDR.AAVE_POOL, ADDR.A_USDC, 8000, 2000);
  flow("Aave strategy configured");

  // -------------------------------
  // LP Deposits Liquidity
  // -------------------------------
  step("LP Deposits Liquidity");
  await poolManager.setPositionLiquidity(poolId, deployer.address, -60000, 60000, ethers.parseUnits("1000", 6));

  await USDC.approve(hookAddress, ethers.parseUnits("1000", 6));
  await USDC.transfer(hookAddress, ethers.parseUnits("1000", 6));

  await hook.registerPosition(poolId, ethers.parseUnits("1000", 6), 0, -60000, 60000);
  await hook.addTrackedLP(poolId, deployer.address);
  flow("Position registered with 1000 USDC and hook funded");

  // -------------------------------
  // Swap Pushes Position Out of Range
  // -------------------------------
  step("Swap Pushes Position Out of Range");
  await hook.testMarkNeedUpdate(poolId);
  flow("Idle liquidity detected");

  // -------------------------------
  // Hook Moves Idle Liquidity To Aave
  // -------------------------------
  step("Hook Moves Idle Liquidity To Aave");

  const usdcBalanceBefore = await USDC.balanceOf(hookAddress);
  console.log("   [DEBUG] Hook USDC balance before rebalance:", Number(ethers.formatUnits(usdcBalanceBefore, 6)), "USDC");

  const aaveStrategyAddress = ADDR.AAVE_POOL;
  const allowance = await USDC.allowance(hookAddress, aaveStrategyAddress);

  // BigInt comparison in ethers v6
  if (allowance < usdcBalanceBefore) {
    console.log("   [DEBUG] Approving USDC to Aave strategy...");
    const approveTx = await USDC.connect(deployer).approve(aaveStrategyAddress, usdcBalanceBefore);
    await approveTx.wait();
  } else {
    console.log("   [DEBUG] Sufficient allowance exists:", Number(ethers.formatUnits(allowance, 6)), "USDC");
  }

  const aUSDC_Before = await aUSDC.balanceOf(hookAddress);
  console.log("   [DEBUG] Hook aUSDC balance before deposit:", Number(ethers.formatUnits(aUSDC_Before, 6)));

  const rebalanceTx = await hook.rebalance(poolId, 0, 10);
  await rebalanceTx.wait();

  const usdcBalanceAfter = await USDC.balanceOf(hookAddress);
  console.log("   [DEBUG] Hook USDC balance after rebalance:", Number(ethers.formatUnits(usdcBalanceAfter, 6)), "USDC");

  const aUSDC_After = await aUSDC.balanceOf(hookAddress);
  const deposited = aUSDC_After - aUSDC_Before;
  flow("Idle liquidity deposited to Aave");
  console.log("   Deposited:", Number(ethers.formatUnits(deposited, 6)), "USDC\n");

  // -------------------------------
  // Simulate Yield
  // -------------------------------
  step("Simulate Yield");
  await network.provider.send("hardhat_setStorageAt", [
    ADDR.A_USDC,
    "0x0",
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  ]);
  flow("Simulated yield environment");

  await hook.processPosition(poolId, deployer.address);

  // -------------------------------
  // LP Claims Yield
  // -------------------------------
  step("LP Claims Yield");
  await hook.claimYield(poolId);
  flow("Yield claimed");

  // -------------------------------
  // LP Withdraws Liquidity
  // -------------------------------
  step("LP Withdraws Liquidity");
  const pos = await hook.positions(poolId, deployer.address);
  console.log("   [DEBUG] Position liquidity0:", pos.liquidity0.toString(), "liquidity1:", pos.liquidity1.toString());
  console.log("All tracked LPs for pool:", await hook.getTrackedLPs(poolId));

  await hook.processPosition(poolId, deployer.address);
  await hook.connect(deployer).deregisterPosition(poolId);
  flow("Position closed");

  console.log("\n=========== DEMO COMPLETE ===========\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });