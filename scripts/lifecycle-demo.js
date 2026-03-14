const { ethers, network } = require("hardhat");

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

// Pretty output helpers
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
    throw new Error("Run this script on a Hardhat fork or localhost");
  }

  // -------------------------------
  // Addresses
  // -------------------------------
  const ADDR = {
    USDC: ethers.getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"),
    WETH: ethers.getAddress("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"),
    AAVE_POOL: ethers.getAddress("0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2"),
    A_USDC: ethers.getAddress("0xbcca60bb61934080951369a648fb03df4f96263c")
  };

  const poolId = ethers.keccak256(ethers.toUtf8Bytes("DEMO_POOL"));

  // -------------------------------
  // Connect tokens
  // -------------------------------
  const USDC = new ethers.Contract(ADDR.USDC, ERC20_ABI, deployer);

  const aUSDC = new ethers.Contract(
    ADDR.A_USDC,
    ["function balanceOf(address owner) view returns (uint256)"],
    deployer
  );

  // -------------------------------
  // Impersonate USDC whale
  // -------------------------------
  step("Fund Demo Wallet with USDC");

  const USDC_WHALE = "0x55fe002aeff02f77364de339a1292923a15844b8";

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [USDC_WHALE]
  });

  const whale = await ethers.getSigner(USDC_WHALE);

  await network.provider.send("hardhat_setBalance", [
    USDC_WHALE,
    "0x1000000000000000000"
  ]);

  await USDC.connect(whale).transfer(
    deployer.address,
    ethers.parseUnits("2000", 6)
  );

  flow("Deployer funded with 2000 USDC");

  const balance = await USDC.balanceOf(deployer.address);
  console.log("   Balance:", Number(ethers.formatUnits(balance, 6)), "USDC\n");

  // -------------------------------
  // Deploy PoolManager + Hook
  // -------------------------------
  step("Deploy IdleLiquidityHookEnterprise");

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
  // Deploy price feed
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

  await hook.setPoolConfigAave(
    poolId,
    0,
    ADDR.USDC,
    ADDR.AAVE_POOL,
    ADDR.A_USDC,
    8000,
    2000
  );

  flow("Aave strategy configured");

  // -------------------------------
  // Initialize position
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

  await hook.registerPosition(
    poolId,
    ethers.parseUnits("1000", 6),
    0,
    -60000,
    60000
  );

  flow("Position registered with 1000 USDC");

  // -------------------------------
  // Simulated swap
  // -------------------------------
  step("Swap Pushes Position Out of Range");

  await hook.testMarkNeedUpdate(poolId);

  flow("Idle liquidity detected");

  // -------------------------------
  // Move idle liquidity to Aave
  // -------------------------------
  step("Hook Moves Idle Liquidity To Aave");

  const beforeBalance = await aUSDC.balanceOf(hookAddress);

  await hook.rebalance(poolId, 0, 10);

  const afterBalance = await aUSDC.balanceOf(hookAddress);

  const deposited = Number(
    ethers.formatUnits(afterBalance - beforeBalance, 6)
  );

  flow("Idle liquidity deposited to Aave");
  console.log("   Deposited:", deposited, "USDC\n");

  // -------------------------------
  // Simulate yield
  // -------------------------------
  step("Yield Accrues");

  const simulatedYield = deposited * 0.002;

  console.log("   Simulated Yield:", simulatedYield.toFixed(4), "USDC\n");

  // -------------------------------
  // Claim yield
  // -------------------------------
  step("LP Claims Yield");

  await hook.claimYield(poolId);

  flow("Yield claimed");

  // -------------------------------
  // Withdraw
  // -------------------------------
  step("LP Withdraws Liquidity");

  await hook.deregisterPosition(poolId);

  flow("Position closed");

  console.log("\n=========== DEMO COMPLETE ===========\n");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });