const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Owner:", owner.address);

  // ActionsRouter
  const ActionsRouter = await ethers.getContractFactory("ActionsRouter");
  const actionsRouter = await ActionsRouter.attach(
    "0x54077c1cA4787a9800E6b8F0B38FD66A7d25b2f1" // your deployed router
  );

  // ERC20 tokens (fully qualified names)
  const token0 = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    "0xYourToken0Address" // replace
  );
  const token1 = await ethers.getContractAt(
    "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
    "0xYourToken1Address" // replace
  );

  // PoolManager
  const poolManager = await ethers.getContractAt(
    "IPoolManager",
    "0x00b036b58a818b1bc34d502d3fe730db729e62ac" // replace
  );

  // --- Ensure router has tokens ---
  const neededAmount = ethers.utils.parseUnits("1000", 18); // amount to top up if low

  const routerToken0Balance = await token0.balanceOf(actionsRouter.address);
  if (routerToken0Balance.lt(neededAmount)) {
    console.log("Minting token0 to router...");
    await token0.mint(actionsRouter.address, neededAmount.sub(routerToken0Balance));
  }

  const routerToken1Balance = await token1.balanceOf(actionsRouter.address);
  if (routerToken1Balance.lt(neededAmount)) {
    console.log("Minting token1 to router...");
    await token1.mint(actionsRouter.address, neededAmount.sub(routerToken1Balance));
  }

  // --- Ensure router has allowance ---
  const allowance0 = await token0.allowance(owner.address, actionsRouter.address);
  if (allowance0.lt(neededAmount)) {
    console.log("Approving token0 for router...");
    await token0.approve(actionsRouter.address, ethers.constants.MaxUint256);
  }

  const allowance1 = await token1.allowance(owner.address, actionsRouter.address);
  if (allowance1.lt(neededAmount)) {
    console.log("Approving token1 for router...");
    await token1.approve(actionsRouter.address, ethers.constants.MaxUint256);
  }

  // --- Display balances and allowances ---
  console.log("Router token0 balance:", (await token0.balanceOf(actionsRouter.address)).toString());
  console.log("Router token1 balance:", (await token1.balanceOf(actionsRouter.address)).toString());
  console.log("Allowance token0:", (await token0.allowance(owner.address, actionsRouter.address)).toString());
  console.log("Allowance token1:", (await token1.allowance(owner.address, actionsRouter.address)).toString());

  // --- Pool info ---
  const poolData = await poolManager.getPool(token0.address, token1.address, 3000);
  console.log("Pool data:", poolData);

  // --- Attempt a safe swap ---
  const amountIn = ethers.utils.parseUnits("10", 18); // adjust for your token decimals
  const minAmountOut = ethers.utils.parseUnits("1", 18); // small min out

  try {
    console.log("Attempting swap...");
    const tx = await actionsRouter.swap(token0.address, token1.address, amountIn, minAmountOut);
    await tx.wait();
    console.log("Swap success!");
  } catch (err) {
    console.error("Swap failed:", err.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});