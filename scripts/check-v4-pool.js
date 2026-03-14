// scripts/check-v4-pool.js
// Checks if a Uniswap v4 pool exists and is initialized for a given token pair and fee

const { ethers } = require("hardhat");

// Addresses (update as needed)
const TEST_TOKEN = "0xF31D5D3f768eC505bdd164EcAd2B2085bAf69931"; // your deployed test token
const WETH = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81"; // Sepolia WETH
const POOL_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4"; // Uniswap v4 PoolManager

// Minimal PoolManager ABI for getPool and pool state
const PM_ABI = [
  "function getPool(address token0, address token1, uint24 fee) view returns (address)",
  "function pools(address) view returns (uint8 state)"
];

async function main() {
  // Ensure token0 < token1 by address
  let token0 = TEST_TOKEN;
  let token1 = WETH;
  if (token1.toLowerCase() < token0.toLowerCase()) {
    [token0, token1] = [token1, token0];
  }
  const fee = 3000; // 0.3%

  const pm = new ethers.Contract(POOL_MANAGER, PM_ABI, ethers.provider);
  const poolAddr = await pm.getPool(token0, token1, fee);
  console.log("Pool address:", poolAddr);
  if (poolAddr === ethers.ZeroAddress) {
    console.log("Pool does not exist for this pair and fee.");
    return;
  }
  // Check pool state (if available)
  try {
    const state = await pm.pools(poolAddr);
    console.log("Pool state:", state);
    if (state === 0) {
      console.log("Pool is not initialized.");
    } else {
      console.log("Pool is initialized.");
    }
  } catch (e) {
    console.log("Could not fetch pool state (may not be available in ABI):", e.message);
  }
}

main().catch(console.error);
