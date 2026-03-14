// scripts/scan-sepolia-pools.js
// Scans for real Uniswap v4 poolIds and LPs on Sepolia

const { ethers } = require("hardhat");

// Sepolia v4 PositionManager address
const POSITION_MANAGER = "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4";

// Minimal ABI for PositionManager
const ABI = [
  "event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

async function main() {
  const provider = ethers.provider;
  const pm = new ethers.Contract(POSITION_MANAGER, ABI, provider);

  // Scan recent blocks for IncreaseLiquidity events
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 50000; // scan last 50k blocks
  console.log(`Scanning IncreaseLiquidity events from block ${fromBlock} to ${currentBlock}...`);

  const events = await pm.queryFilter("IncreaseLiquidity", fromBlock, currentBlock);
  if (events.length === 0) {
    console.log("No IncreaseLiquidity events found in recent blocks.");
    return;
  }

  // Your deployed test token address (update as needed)
  const TEST_TOKEN = "0xF31D5D3f768eC505bdd164EcAd2B2085bAf69931".toLowerCase();

  for (const evt of events) {
    const tokenId = evt.args.tokenId;
    const owner = await pm.ownerOf(tokenId);
    const pos = await pm.positions(tokenId);
    const isTestToken =
      pos.token0.toLowerCase() === TEST_TOKEN ||
      pos.token1.toLowerCase() === TEST_TOKEN;
    if (isTestToken) {
      console.log("*** FOUND TEST TOKEN POSITION ***");
    }
    console.log("---");
    console.log("tokenId:", tokenId.toString());
    console.log("owner:", owner);
    console.log("token0:", pos.token0);
    console.log("token1:", pos.token1);
    console.log("fee:", pos.fee);
    console.log("tickLower:", pos.tickLower);
    console.log("tickUpper:", pos.tickUpper);
    console.log("liquidity:", pos.liquidity.toString());
    if (isTestToken) {
      console.log("*** END TEST TOKEN POSITION ***");
    }
  }
}

main().catch(console.error);
