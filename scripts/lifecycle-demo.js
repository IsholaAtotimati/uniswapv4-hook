// lifecycle-demo.js
const { ethers, network } = require("hardhat");

// Minimal ERC20 ABI (not used directly but kept if needed)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)"
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

  // -------------------------------
  // Deploy USDC mock
  // -------------------------------
  step("Deploy USDC mock");
  const ERC20MockFactory = await ethers.getContractFactory("ERC20Mock");
  const USDCMock = await ERC20MockFactory.deploy(
    "USD Coin",
    "USDC",
    ethers.parseUnits("3000", 6)
  );
  await USDCMock.waitForDeployment();
  const USDC = USDCMock;

  // -------------------------------
  // Deploy aUSDC mock
  // -------------------------------
  step("Deploy aUSDC mock");
  const aUSDCMock = await ERC20MockFactory.deploy("Aave USDC", "aUSDC", 0);
  await aUSDCMock.waitForDeployment();
  const aUSDC = aUSDCMock;

  // -------------------------------
  // Deploy LendingPoolMock
  // -------------------------------
  step("Deploy LendingPoolMock");
  const LendingPoolMockFactory = await ethers.getContractFactory(
    "contracts/mocks/LendingPoolMock.sol:LendingPoolMock"
  );

  // Deploy with no constructor arguments
  const lendingPoolMockInstance = await LendingPoolMockFactory.deploy();
  await lendingPoolMockInstance.waitForDeployment();
  const lendingPoolMockAddress = await lendingPoolMockInstance.getAddress();
  flow(`LendingPoolMock deployed at ${lendingPoolMockAddress}`);

  // Initialize reserve with USDC and aUSDC
  await lendingPoolMockInstance.initReserve(
    await USDC.getAddress(),
    await aUSDC.getAddress()
  );
  flow(`LendingPoolMock reserve initialized with USDC and aUSDC`);

  // -------------------------------
  // Fund deployer with USDC
  // -------------------------------
  step("Fund Demo Wallet with USDC");
  await USDC.mint(deployer.address, ethers.parseUnits("2000", 6));

  const balance = await USDC.balanceOf(deployer.address);
  flow(`Deployer balance: ${ethers.formatUnits(balance, 6)} USDC`);

  // -------------------------------
  // Deploy PoolManager + Hook
  // -------------------------------
  step("Deploy PoolManager + Hook");

  const PoolManagerFactory = await ethers.getContractFactory("PoolManagerMock");
  const poolManager = await PoolManagerFactory.deploy();
  await poolManager.waitForDeployment();

 const HookFactory = await ethers.getContractFactory(
  "contracts/hooks/IdleLiquidityHookEnterprise.sol:IdleLiquidityHookEnterprise"
);
console.log(
  "Constructor inputs:",
  HookFactory.interface.deploy.inputs
);
  const hook = await HookFactory.deploy(
  poolManager.target  
);
  await hook.waitForDeployment();

  const hookAddress = await hook.getAddress();
  flow(`Hook deployed at ${hookAddress}`);

  // -------------------------------
  // DEBUG (now safe ✅)
  // -------------------------------
  console.log(
    "   [DEBUG] Before rebalance:",
    "USDC", await USDC.balanceOf(hookAddress),
    "aUSDC", await aUSDC.balanceOf(hookAddress)
  );

  // -------------------------------
  // Deploy MockAggregator
  // -------------------------------
  step("Deploy MockAggregator for USDC");

  const MockAggregatorFactory = await ethers.getContractFactory("MockAggregator");
  const mockFeed = await MockAggregatorFactory.deploy(ethers.parseUnits("1", 8));
  await mockFeed.waitForDeployment();

  await hook.setPriceFeed(
    await USDC.getAddress(),
    await mockFeed.getAddress()
  );

  flow("MockAggregator set as USDC price feed");

  // -------------------------------
  // Configure Aave Strategy
  // -------------------------------
  step("Configure Aave Strategy");

  const poolId = ethers.keccak256(ethers.toUtf8Bytes("DEMO_POOL"));

  await hook.setPoolConfigAave(
    poolId,
    0,
    await USDC.getAddress(),
    lendingPoolMockAddress,
    await aUSDC.getAddress(),
    8000,
    2000
  );

  flow("Aave strategy configured");

  // -------------------------------
  // LP Deposits Liquidity
  // -------------------------------
  step("LP Deposits Liquidity");

  await poolManager.setPositionLiquidity(
    poolId,
    deployer.address,
    -60000,
    60000,
    ethers.parseUnits("1000", 6)
  );

  await USDC.approve(hookAddress, ethers.parseUnits("1000", 6));
  await USDC.transfer(hookAddress, ethers.parseUnits("1000", 6));


  await hook.registerPosition(
    poolId,
    ethers.parseUnits("1000", 6),
    0,
    -60000,
    60000
  );

  flow("Position registered with 1000 USDC and hook funded");

  // --- For production: do not attempt to set tick via test helpers ---
  // In production, ensure your PoolManager returns the correct tick for your use case.
  // For demo/testing, you may need to modify PoolManagerMock to simulate out-of-range ticks.
  flow("[INFO] For production, ensure PoolManager returns the correct tick for your scenario. No test helpers called.");

  // -------------------------------
  // Rebalance (Move to Aave)
  // -------------------------------
  step("Hook Moves Idle Liquidity To Aave");

  const usdcBefore = await USDC.balanceOf(hookAddress);
  const aTokenBefore = await aUSDC.balanceOf(hookAddress);

  await hook.testMarkNeedUpdate(poolId);
  await hook.rebalance(poolId, 0, 10);

  const usdcAfter = await USDC.balanceOf(hookAddress);
  const aTokenAfter = await aUSDC.balanceOf(hookAddress);

  const deposited = aTokenAfter - aTokenBefore;

  flow("Idle liquidity deposited to Aave");

  console.log(`   Hook USDC before: ${ethers.formatUnits(usdcBefore, 6)}`);
  console.log(`   Hook USDC after: ${ethers.formatUnits(usdcAfter, 6)}`);
  console.log(`   Deposited aUSDC: ${ethers.formatUnits(deposited, 6)}`);

  // --- Debug checks ---
  const posDebug = await hook.positions(poolId, deployer.address);
  console.log("   [DEBUG] Position liquidity0:", posDebug.liquidity0.toString());
  console.log("   [DEBUG] aTokenPrincipal0:", posDebug.aTokenPrincipal0.toString());
  // Try to get current tick and range
  try {
    const tick = await hook.getCurrentTick(poolId);
    console.log("   [DEBUG] Current tick:", tick.toString());
    console.log("   [DEBUG] Position range:", posDebug.lowerTick.toString(), posDebug.upperTick.toString());
    const isInRange = tick >= posDebug.lowerTick && tick <= posDebug.upperTick;
    console.log("   [DEBUG] Is position in range?", isInRange);
  } catch (e) {
    console.log("   [DEBUG] Could not fetch current tick or range:", e.message);
  }

  // -------------------------------
  // Simulate Yield
  // -------------------------------
  step("Simulate Yield");

  const fakeYield = ethers.parseUnits("50", 6);
  await aUSDC.mint(hookAddress, fakeYield);

  flow("Simulated ~50 USDC yield");

  // -------------------------------
  // Claim Yield
  // -------------------------------
  step("LP Claims Yield");

  await hook.claimYield(poolId);
  flow("Yield claimed");

  // -------------------------------
  // Withdraw
  // -------------------------------
  step("LP Withdraws Liquidity");

  await hook.processPosition(poolId, deployer.address);
  await hook.connect(deployer).deregisterPosition(poolId);

  flow("Position closed");

  console.log("\n=========== DEMO COMPLETE ===========\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });// force update
