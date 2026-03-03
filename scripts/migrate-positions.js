/*
 * Example migration script: read state from old hook and import into new hook.
 *
 * Run with `node scripts/migrate-positions.js --old <oldAddress> --new <newAddress>`
 * or adapt as a Hardhat task.
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const yargs = require("yargs");

async function main() {
  const argv = yargs
    .option("old", { type: "string", demandOption: true, describe: "old hook address" })
    .option("new", { type: "string", demandOption: true, describe: "new hook address" })
    .argv;

  const [deployer] = await ethers.getSigners();
  console.log("Using deployer", deployer.address);

  const Hook = await ethers.getContractFactory("IdleLiquidityHookEnterprise");
  const oldHook = Hook.attach(argv.old);
  const newHook = Hook.attach(argv.new);

  // specify the pools you want to migrate
  const poolIds = [ethers.keccak256(ethers.toUtf8Bytes("UNIT_POOL"))];

  for (const pid of poolIds) {
    const lps = await oldHook.getTrackedLPs(pid);
    console.log("migrating pool", pid, "lp count", lps.length);

    const batchSize = 20;
    for (let i = 0; i < lps.length; i += batchSize) {
      const slice = lps.slice(i, i + batchSize);
      const liqu0 = [];
      const liqu1 = [];
      const lowers = [];
      const uppers = [];
      const statuses = [];
      const acc0s = [];
      const acc1s = [];

      for (const lp of slice) {
        const pos = await oldHook.positions(pid, lp);
        liqu0.push(pos.liquidity0);
        liqu1.push(pos.liquidity1);
        lowers.push(pos.lowerTick);
        uppers.push(pos.upperTick);
        // treat idle flag -> status
        statuses.push(pos.isIdle ? 1 : 0);
        acc0s.push(pos.accumulatedYield0);
        acc1s.push(pos.accumulatedYield1);
      }

      const tx = await newHook.importPositionsBatch(
        pid,
        slice,
        liqu0,
        liqu1,
        lowers,
        uppers,
        statuses,
        acc0s,
        acc1s
      );
      console.log("batch tx", tx.hash);
      await tx.wait();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});