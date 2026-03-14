const { ethers, network } = require("hardhat");

const POOL_MANAGER = "0x00b036b58a818b1bc34d502d3fe730db729e62ac"; // your deployed PoolManager
const HOOK = "0xaf911bdc75f8644fc7ed653b2d493383657c4040";      // your deployed hook
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// A whale with lots of USDC (for the fork)
const USDC_WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8";

async function main() {
  // Impersonate whale
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [USDC_WHALE],
  });
  const whaleSigner = await ethers.getSigner(USDC_WHALE);

  console.log("Whale signer:", whaleSigner.address);

  const poolManager = await ethers.getContractAt("IPoolManager", POOL_MANAGER, whaleSigner);
  const hook = await ethers.getContractAt("IdleLiquidityHookEnterprise", HOOK, whaleSigner);

  // Transfer some ETH to whale for gas if needed
  const [deployer] = await ethers.getSigners();
  await deployer.sendTransaction({ to: USDC_WHALE, value: ethers.parseEther("1") });

  // Approve USDC
  const usdc = await ethers.getContractAt(
    ["function approve(address spender, uint256 amount) external returns (bool)"],
    USDC,
    whaleSigner
  );
  const amountIn = ethers.parseUnits("1000", 6);
  await usdc.approve(POOL_MANAGER, amountIn);
  console.log("✅ USDC approved for PoolManager");

  // PoolKey
  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: 3000,
    tickSpacing: 60,
    hooks: HOOK,
  };

  const sqrtPriceX96 = "79228162514264337593543950336"; // price = 1

  // Initialize pool
  try {
    const txInit = await poolManager.initialize(poolKey, sqrtPriceX96);
    await txInit.wait();
    console.log("✅ Pool initialized");
  } catch (err) {
    console.warn("⚠️ Pool init skipped or already exists:", err.message);
  }

  // Execute a swap
  try {
    const swapParams = {
      zeroForOne: true,
      amountSpecified: ethers.parseUnits("10", 6),
      sqrtPriceLimitX96: 0,
    };
    const txSwap = await poolManager.swap(poolKey, swapParams, "0x");
    await txSwap.wait();
    console.log("✅ Swap executed");
  } catch (err) {
    console.warn("⚠️ Swap failed:", err.message);
  }

  // Check hook update
  const poolId = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [USDC, WETH, 3000, 60, HOOK]
    )
  );
  const needUpdate = await hook.needUpdate(poolId);
  console.log("Need update:", needUpdate);

  if (needUpdate) {
    console.log("Running rebalance...");
    const txRebalance = await hook.rebalance(poolId, 0, 10);
    await txRebalance.wait();
    console.log("✅ Rebalance executed");
  }
}

main().catch(console.error);