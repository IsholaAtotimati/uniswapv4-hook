require('dotenv').config();
const hre = require('hardhat');
const fs = require('fs');

async function main(){
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());

  const poolManager = process.env.POOL_MANAGER_ADDRESS;
  if(!poolManager){
    console.error('POOL_MANAGER_ADDRESS not set in .env');
    process.exit(1);
  }
  console.log('Using PoolManager:', poolManager);

  // Deploy Create2Deployer
  const Create2 = await hre.ethers.getContractFactory('Create2Deployer');
  const create2 = await Create2.deploy();
  await create2.waitForDeployment();
  const create2Addr = await create2.getAddress();
  console.log('Create2Deployer at:', create2Addr);

  // Prepare hook creation bytecode (with constructor arg)
  const art = await hre.artifacts.readArtifact('IdleLiquidityHookEnterprise');
  const iface = new hre.ethers.Interface(art.abi);
  const encodedArgs = iface.encodeDeploy([poolManager]);
  const creationBytecode = art.bytecode + (encodedArgs ? encodedArgs.slice(2) : '');
  const initCodeHash = hre.ethers.keccak256(creationBytecode);

  // target: only AFTER_SWAP_FLAG set, which is 1 << 6 = 64
  const targetLowBits = 1n << 6n;
  const mask = (1n << 14n) - 1n;

  console.log('Searching for salt to match low 14 bits ==', targetLowBits.toString());

  let foundSalt = null;
  let foundAddr = null;

  for(let i=0;i<200000;i++){
    const saltHex = '0x' + i.toString(16).padStart(64, '0');
    const data = '0xff' + create2Addr.slice(2) + saltHex.slice(2) + initCodeHash.slice(2);
    const hash = hre.ethers.keccak256(data);
    const addr = '0x' + hash.slice(-40);
    const addrBig = BigInt(addr);
    if((addrBig & mask) === targetLowBits){
      foundSalt = saltHex;
      foundAddr = addr;
      console.log('Found salt=', i, 'address=', addr);
      break;
    }
    if(i % 5000 === 0 && i>0) console.log('Tried', i, 'salts...');
  }

  if(!foundSalt){
    console.error('Failed to find salt within search limit');
    process.exit(1);
  }

  // Deploy hook via create2
  console.log('Deploying hook via CREATE2...');
  const tx = await create2.connect(deployer).deploy(creationBytecode, foundSalt);
  const receipt = await tx.wait();
  console.log('Create2 deploy tx hash:', tx.hash);

  // Confirm code at address
  const code = await hre.ethers.provider.getCode(foundAddr);
  console.log('Code at target address length:', code.length);

  const out = {
    poolManager: poolManager,
    hook: foundAddr,
    deployer: await deployer.getAddress(),
    network: hre.network.name,
    readOnlyRpc: process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || null
  };

  fs.writeFileSync('frontend/addresses.json', JSON.stringify(out, null, 2));
  console.log('Wrote frontend/addresses.json');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
