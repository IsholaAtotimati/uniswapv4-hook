const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require("fs");
const path = require("path");

// ✅ Mainnet addresses (EIP‑55 checksummed)
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const WHALE = "0x55FE002aefF02F77364de339a1292923A15844B8";
const FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984"; // Uniswap V3 Factory

const routerAbi = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      "../node_modules/@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json"
    ),
    "utf8"
  )
).abi;

const factoryAbi = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)"
];

const quoterAbi = [
  // view function; marking it as such ensures ethers performs a call and returns a BigNumber
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)"
];

// You can deploy or use existing Quoter from mainnet
const QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"; // Mainnet quoter

async function main() {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [WHALE],
  });
  const whaleSigner = await ethers.getSigner(WHALE);

  const [deployer] = await ethers.getSigners();
  await deployer.sendTransaction({
    to: WHALE,
    value: ethers.parseEther("1"),
  });

  const usdc = await ethers.getContractAt(
    ["function approve(address spender, uint256 amount) external returns (bool)",
     "function balanceOf(address account) view returns (uint256)"],
    USDC
  );

  const weth = await ethers.getContractAt(
    ["function balanceOf(address account) view returns (uint256)"],
    WETH
  );

  // Find pool fee dynamically
  const feeTiers = [500, 3000, 10000];
  let poolFee = null;
  const factory = new ethers.Contract(FACTORY, factoryAbi, deployer);

  for (const fee of feeTiers) {
    const poolAddress = await factory.getPool(USDC, WETH, fee);
    if (poolAddress !== ethers.ZeroAddress) {
      poolFee = fee;
      console.log(`✅ Found USDC→WETH pool with fee: ${fee}`);
      break;
    }
  }
  if (!poolFee) throw new Error("No USDC→WETH pool found!");

  const amountIn = ethers.parseUnits("1000", 6);

  // Pre-swap quote
  const quoter = new ethers.Contract(QUOTER, quoterAbi, deployer);
  const expectedWETH = await quoter.quoteExactInputSingle(
    USDC,
    WETH,
    poolFee,
    amountIn,
    0
  );
  console.log("💡 Expected WETH output:", ethers.formatEther(expectedWETH));

  // Approve router
  await usdc.connect(whaleSigner).approve(ROUTER, amountIn);
  console.log("✅ Approved USDC:", ethers.formatUnits(amountIn, 6));

  const usdcBefore = await usdc.balanceOf(WHALE);
  const wethBefore = await weth.balanceOf(WHALE);

  // Swap
  const router = new ethers.Contract(ROUTER, routerAbi, whaleSigner);
  // bump deadline using network time to avoid any client-clock drift
  const deadline = await time.latest() + 60 * 10;

  // guard against low gas errors by fetching fee data and overprovisioning
  const feeData = await ethers.provider.getFeeData();
  let extraMax;
  if (feeData.maxFeePerGas) {
    // normalize to BigInt and double; ethers accepts BigInt for gas values
    const base = BigInt(feeData.maxFeePerGas.toString());
    extraMax = base * 2n;
  }

  const params = {
    tokenIn: USDC,
    tokenOut: WETH,
    fee: poolFee,
    recipient: WHALE,
    deadline,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0
  };

  const txOptions = {};
  if (extraMax) txOptions.maxFeePerGas = extraMax;

  const tx = await router.exactInputSingle(params, txOptions);
  await tx.wait();
  console.log("🚀 Swap completed!");

  const usdcAfter = await usdc.balanceOf(WHALE);
  const wethAfter = await weth.balanceOf(WHALE);

  // ethers v6 methods return BigInt; use native arithmetic
  const usdcSpent = usdcBefore - usdcAfter;
  const wethGained = wethAfter - wethBefore;

  console.log("💰 USDC spent:", ethers.formatUnits(usdcSpent, 6));
  console.log("💎 WETH received:", ethers.formatEther(wethGained));
}

main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});