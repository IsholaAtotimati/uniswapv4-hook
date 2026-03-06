// Simple automation script for rebalance calls
// Run with: npx hardhat run scripts/autoRebalance.js --network <network>
// The script will poll a hardcoded list of pool names and invoke
// `rebalance` when the hook reports `needUpdate` for a given pool.

const { ethers } = require("hardhat");

// pools known to the front end; update as needed
// you can override this list by setting POOL_NAMES=comma,separated,names
// when using the Aave strategy the pool identifier used in tests/examples is
// literally "POOL_2" (hashed the same way).  a production deploy would expose
// human‑readable names for all configured pools.
const defaultPools = ["ETH/USDC", "DAI/USDC", "WBTC/ETH", "POOL_2"];
const poolNames = process.env.POOL_NAMES
  ? process.env.POOL_NAMES.split(",").map((s) => s.trim()).filter((s) => s)
  : defaultPools;

function getPoolId(name) {
  return ethers.id(name);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("automation running as", await deployer.getAddress());

  // load addresses.json for hook address
  let addr;
  try {
    addr = require("../frontend/addresses.json");
  } catch (e) {
    console.error("could not load addresses.json", e);
    process.exit(1);
  }

  if (!addr.hook) {
    console.error("hook address missing from addresses.json");
    process.exit(1);
  }

  const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
  const hook = Hook.attach(addr.hook).connect(deployer);

  console.log("using hook at", addr.hook);

  // simple enum copy for JS to interpret on‑chain struct values
  const Strategy = { NONE: 0, ERC4626: 1, AAVE: 2 };

  async function checkPools() {
    for (const name of poolNames) {
      // allow passing raw hex ids if the name already looks like one
      const pid = /^0x[0-9a-fA-F]{64}$/.test(name) ? name : getPoolId(name);
      try {
        const need = await hook.needUpdate(pid);
        // inspect config to see if this is an Aave pool
        let isAave = false;
        try {
          const cfg = await hook.poolConfig(pid);
          // cfg.assets is an array of two AssetConfig structs;
          // check either side for the AAVE enum value
          isAave = cfg.assets[0].strategy === Strategy.AAVE ||
                   cfg.assets[1].strategy === Strategy.AAVE;
        } catch (_) {
          // ignore, maybe pool not configured yet
        }

        if (need) {
          console.log(`rebalance needed for ${name} (${pid})`);
          if (isAave) {
            console.log(`  > detected Aave strategy, will log aToken balance before/after`);
            // attempt to fetch the aToken address as well
            try {
              const cfg = await hook.poolConfig(pid);
              const asset = cfg.assets[0].strategy === Strategy.AAVE ? cfg.assets[0] : cfg.assets[1];
              const aToken = await ethers.getContractAt("IERC20", asset.aToken);
              const balBefore = await aToken.balanceOf(await hook.getAddress());
              console.log(`  > aToken balance before: ${balBefore}`);
              const tx = await hook.rebalance(pid, 0, 50);
              await tx.wait();
              const balAfter = await aToken.balanceOf(await hook.getAddress());
              console.log(`  > aToken balance after:  ${balAfter}`);
              console.log(`rebalance tx confirmed: ${tx.hash}`);
              continue; // skip generic tx logging below
            } catch (e) {
              console.error("  > failed to fetch aToken info", e);
            }
          }

          const tx = await hook.rebalance(pid, 0, 50);
          await tx.wait();
          console.log(`rebalance tx confirmed: ${tx.hash}`);
        } else {
          console.log(`${name}: no update needed`);
        }
      } catch (err) {
        console.error(`error checking/processing ${name}:`, err);
      }
    }
  }

  // run once immediately and then every 30 seconds
  await checkPools();
  setInterval(checkPools, 30_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
