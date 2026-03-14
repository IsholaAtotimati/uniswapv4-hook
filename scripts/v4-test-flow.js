const hre = require("hardhat");
const { ethers } = hre;

async function main() {

  const signer = (await ethers.getSigners())[0];
  console.log("Signer:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("Balance:", ethers.formatEther(balance));

  // -----------------------------
  // Addresses
  // -----------------------------

  const POOL_MANAGER = "0x000000000004444c5dc75cB358380D2e3dE08A90";

  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

  const FEE = 3000;
  const TICK_SPACING = 60;

  const poolManager = await ethers.getContractAt(
    "@uniswap/v4-core/src/interfaces/IPoolManager.sol:IPoolManager",
    POOL_MANAGER,
    signer
  );

  const usdc = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    USDC,
    signer
  );

  const weth = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    WETH,
    signer
  );

  // -----------------------------
  // Approve tokens
  // -----------------------------

  const amountUSDC = ethers.parseUnits("1000", 6);
  const amountWETH = ethers.parseEther("1");

  await usdc.approve(POOL_MANAGER, amountUSDC);
  await weth.approve(POOL_MANAGER, amountWETH);

  console.log("Tokens approved");

  // -----------------------------
  // Pool key
  // -----------------------------

  const poolKey = {
    currency0: USDC,
    currency1: WETH,
    fee: FEE,
    tickSpacing: TICK_SPACING,
    hooks: ethers.ZeroAddress
  };

  // -----------------------------
  // Initialize pool
  // -----------------------------

  const sqrtPriceX96 = "79228162514264337593543950336";

  console.log("Initializing pool...");

  try {
    await poolManager.initialize(poolKey, sqrtPriceX96);
    console.log("Pool initialized");
  } catch (e) {
    console.log("Pool may already exist");
  }

  // -----------------------------
  // Add liquidity
  // -----------------------------

  const tickLower = -60000;
  const tickUpper = 60000;

  const liquidityParams = {
    tickLower,
    tickUpper,
    liquidityDelta: ethers.parseUnits("1000", 18),
    salt: ethers.ZeroHash
  };

  console.log("Adding liquidity...");

  await poolManager.modifyLiquidity(poolKey, liquidityParams);

  console.log("Liquidity added");

  console.log("Test flow finished");
}

main().catch(console.error);