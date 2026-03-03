require('dotenv').config();
const hre = require('hardhat');

async function main(){
  const provider = hre.ethers.provider;
  const [deployer] = await hre.ethers.getSigners();
  const addr = await deployer.getAddress();
  console.log('Deployer address:', addr);
  try{
    const bal = await provider.getBalance(addr);
    console.log('Balance (wei):', bal.toString());
    console.log('Balance (eth):', hre.ethers.formatEther(bal));
  }catch(e){
    console.error('Failed to get balance:', e.message || e);
  }

  const poolManager = process.env.POOL_MANAGER_ADDRESS;
  console.log('POOL_MANAGER_ADDRESS from .env:', poolManager);
  try{
    const code = await provider.getCode(poolManager);
    console.log('Code at poolManager:', code === '0x' ? '<no code>' : code.slice(0, 10) + '...');
  }catch(e){
    console.error('Failed to get code:', e.message || e);
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
