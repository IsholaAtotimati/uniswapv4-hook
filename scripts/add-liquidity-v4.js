// scripts/add-liquidity-v4.js
// Approves test token and adds liquidity to Uniswap v4 pool on Sepolia

const { ethers } = require("hardhat");

// Addresses (update as needed)
const TEST_TOKEN = "0xF31D5D3f768eC505bdd164EcAd2B2085bAf69931"; // your deployed test token
const WETH = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81"; // example: Sepolia WETH
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

// Minimal ERC20 ABI
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function decimals() public view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)"
];

// Minimal PositionManager ABI (addLiquidity)
const PM_ABI = [
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, address recipient, uint256 deadline)) public returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);


  // Check balances
  const token0 = new ethers.Contract(TEST_TOKEN, ERC20_ABI, deployer);
  const token1 = new ethers.Contract(WETH, ERC20_ABI, deployer);
  const bal0 = await token0.balanceOf(deployer.address);
  const bal1 = await token1.balanceOf(deployer.address);
  console.log(`Test token balance: ${ethers.formatUnits(bal0, 18)}`);
  console.log(`WETH balance: ${ethers.formatUnits(bal1, 18)}`);
  const approveAmount = ethers.parseUnits("1000", 18);
  if (bal0 < ethers.parseUnits("10", 18)) {
    console.error("Insufficient test token balance for adding liquidity.");
    return;
  }
  if (bal1 < ethers.parseUnits("0.001", 18)) {
    console.error("Insufficient WETH balance for adding liquidity.");
    return;
  }
  await token0.approve(POSITION_MANAGER, approveAmount);
  await token1.approve(POSITION_MANAGER, approveAmount);
  console.log("Tokens approved");

  // Add liquidity
  const pm = new ethers.Contract(POSITION_MANAGER, PM_ABI, deployer);
  const params = {
    token0: TEST_TOKEN,
    token1: WETH,
    fee: 3000, // 0.3%
    tickLower: -60000,
    tickUpper: 60000,
    amount0Desired: ethers.parseUnits("10", 18), // 10 test token
    amount1Desired: ethers.parseUnits("0.001", 18), // 0.001 WETH
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 600
  };
  try {
    const tx = await pm.mint(params);
    const receipt = await tx.wait();
    console.log("Liquidity added. Tx hash:", receipt.hash);
  } catch (err) {
    if (err && err.message) {
      console.error("Add liquidity failed:", err.message);
    } else {
      console.error("Add liquidity failed:", err);
    }
    if (err && err.data && err.data.message) {
      console.error("Revert reason:", err.data.message);
    }
  }
}

main().catch(console.error);
