import fs from "fs";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const ABI_PATH = "artifacts/contracts/hooks/IdleLiquidityHookEnterprise.sol/IdleLiquidityHookEnterprise.json";

async function main(){
  const rpc = process.env.RPC_URL || "http://localhost:8545";
  console.log("Using RPC:", rpc);
  const provider = new ethers.JsonRpcProvider(rpc);

  try{
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log("Code at address:", code === "0x" ? "<no code> (0x)" : (code.slice(0,10) + "..."));
  }catch(e){
    console.error("getCode error:", e.message || e);
  }

  // load ABI
  let abi;
  try{
    const art = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
    abi = art.abi;
  }catch(e){
    console.error("Failed to load artifact ABI:", e.message || e);
    process.exit(1);
  }

  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

  // Prepare a dummy poolId (ethers.id of pool name used in frontend)
  const pools = ["ETH/USDC","DAI/USDC","WBTC/ETH"];
  const poolId = ethers.id(pools[0]);
  const someAddress = CONTRACT_ADDRESS; // use same address for positions call to reproduce earlier error

  // Try poolConfig
  try{
    const cfg = await contract.poolConfig(poolId);
    console.log("poolConfig call succeeded:", cfg);
  }catch(e){
    console.error("poolConfig call failed:", e.code || e.name, e.message);
  }

  // Try positions
  try{
    const pos = await contract.positions(poolId, someAddress);
    console.log("positions call succeeded:", pos);
  }catch(e){
    console.error("positions call failed:", e.code || e.name, e.message);
  }

  // Try getIdleLPCount / getIdleLPs
  try{
    if (contract.getIdleLPCount) {
      const cnt = await contract.getIdleLPCount(poolId);
      console.log("getIdleLPCount:", cnt.toString());
    } else {
      console.log("getIdleLPCount not in ABI");
    }
  }catch(e){
    console.error("getIdleLPCount failed:", e.code || e.name, e.message);
  }

  try{
    if (contract.getIdleLPs) {
      const lps = await contract.getIdleLPs(poolId);
      console.log("getIdleLPs length:", lps.length);
    } else {
      console.log("getIdleLPs not in ABI");
    }
  }catch(e){
    console.error("getIdleLPs failed:", e.code || e.name, e.message);
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
