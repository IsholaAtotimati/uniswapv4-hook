let provider;
let signer;
let contract;
let user;
let readOnlyProvider = null;
let contractRead = null;

let totalYield = 0;
let selectedPool = "";

const pools = [
{ id:"ETH/USDC", name:"ETH/USDC"},
{ id:"DAI/USDC", name:"DAI/USDC"},
{ id:"WBTC/ETH", name:"WBTC/ETH"}
];

function getPoolId(name){
return ethers.id(name);
}

const contractABI = abi;

const ctx = document.getElementById("chart");

const yieldChart = new Chart(ctx,{
type:"line",
data:{
labels:[],
datasets:[{
label:"Yield Growth",
data:[],
fill:true
}]
}
});

const poolCtx = document.getElementById("poolChart");

const poolChart = new Chart(poolCtx,{
type:"bar",
data:{
labels:pools.map(p=>p.name),
datasets:[
{label:"Aave TVL",data:[0,0,0]},
{label:"Vault TVL",data:[0,0,0]},
{label:"Protocol Share",data:[0,0,0]}
]
}
});

const poolSelect = document.getElementById("poolSelect");

pools.forEach(pool=>{
const opt=document.createElement("option");
opt.value=pool.id;
opt.innerText=pool.name;
poolSelect.appendChild(opt);
});

poolSelect.onchange=()=>{
selectedPool=poolSelect.value;
loadPosition();
loadIdleLPs();
loadPoolAnalytics();
};

// Try to load a read-only RPC from addresses.json on startup
(async function loadReadOnlyRpc(){
	try{
		const res = await fetch('./addresses.json');
		if(!res.ok) return;
		const data = await res.json();
		if(data.readOnlyRpc){
			readOnlyProvider = new ethers.JsonRpcProvider(data.readOnlyRpc);
		}
	}catch(e){
		console.warn('Could not load readOnlyRpc:', e);
	}
})();

async function connectWallet(){

if(!window.ethereum){
alert("Install MetaMask");
return;
}

provider=new ethers.BrowserProvider(window.ethereum);

await provider.send("eth_requestAccounts",[]);

signer=await provider.getSigner();

user=await signer.getAddress();
  
	// Ensure MetaMask is connected to the expected local chain (Hardhat default: 31337 -> 0x7a69)
	try{
		const chainIdHex = await provider.send('eth_chainId', []);
		// allow-list: localhost Hardhat (31337), Sepolia (11155111), Arbitrum Sepolia (421614)
		const allowed = new Set(['0x7a69', '0xaa36a7', '0x66eee']);
		if(!allowed.has(chainIdHex)){
			alert('Please switch MetaMask to a supported network: localhost:8545 (Hardhat) or Sepolia/Arbitrum Sepolia. Current chainId: ' + chainIdHex);
			document.getElementById("status").innerText = "Wrong network";
			contract = null;
			return;
		}
	}catch(e){
		console.error('Failed to read chainId from provider:', e);
		document.getElementById("status").innerText = "Error";
		contract = null;
		return;
	}

	// Verify that there's bytecode at the configured address before instantiating
	let code = null;
	try{
		code = await provider.send('eth_getCode', [contractAddress, 'latest']);
	}catch(e){
		// If the RPC returned Unauthorized or another provider-level error, try the readOnlyRpc fallback
		const msg = (e && (e.message || e.toString())) || '';
		if (msg.includes('Unauthorized') || msg.includes('httpStatus') || e.code === -32006) {
			console.warn('eth_getCode via MetaMask returned Unauthorized; attempting read-only RPC fallback');
			try{
				const r = await fetch('./addresses.json');
				if(r.ok){
					const data = await r.json();
					if(data.readOnlyRpc){
						const fallbackProv = new ethers.JsonRpcProvider(data.readOnlyRpc);
						code = await fallbackProv.getCode(contractAddress);
					}
				}
			}catch(err2){
				console.error('Fallback getCode failed:', err2);
			}
		} else {
			console.error('Error checking contract code:', e);
			contract = null;
			document.getElementById("status").innerText = "Error";
			return;
		}
	}

	if(!code || code === '0x'){
		// try readOnlyRpc as a final attempt if not already tried
		try{
			const r = await fetch('./addresses.json');
			if(r.ok){
				const data = await r.json();
				if(data.readOnlyRpc){
					const fallbackProv = new ethers.JsonRpcProvider(data.readOnlyRpc);
					code = await fallbackProv.getCode(contractAddress);
				}
			}
		}catch(_){/* ignore */}
		if(!code || code === '0x'){
			alert('No contract deployed at ' + contractAddress + '. Update frontend/addresses.json or redeploy.');
			document.getElementById("status").innerText = "No contract";
			contract = null;
			return;
		}
	}

		contract = new ethers.Contract(contractAddress, contractABI, signer);
		// create a read-only contract instance if readOnlyProvider is available
		if(readOnlyProvider){
			contractRead = new ethers.Contract(contractAddress, contractABI, readOnlyProvider);
		} else {
			contractRead = contract;
		}

document.getElementById("connect").innerText =
user.slice(0,6)+"..."+user.slice(-4);

document.getElementById("status").innerText="Connected";

}

async function registerPosition(){

    if(!selectedPool){
        alert("Select pool");
        return;
    }

    const liquidity0 = ethers.parseUnits(
        document.getElementById("liquidity0").value || "0",
        18
    );
    // liquidity1 is optional; default to zero if empty
    const liquidity1 = ethers.parseUnits(
        document.getElementById("liquidity1").value || "0",
        18
    );

    const lower = Number(
        document.getElementById("lower").value || 0
    );

    const upper = Number(
        document.getElementById("upper").value || 0
    );

    const poolId = getPoolId(selectedPool);

    const tx = await contract.registerPosition(
        poolId,
        liquidity0,
        liquidity1,
        lower,
        upper
    );

    await tx.wait();

    addActivity("Position Registered");

    loadPosition();

}

async function loadPosition(){

if(!selectedPool || !user) return;

const poolId = getPoolId(selectedPool);
 
if(!contract){
	document.getElementById("positionTable").innerHTML = `<tr><td colspan="4">No contract connected</td></tr>`;
	return;
}

try{
	const reader = contractRead || contract;
	const pos = await reader.positions(poolId,user);
	document.getElementById("positionTable").innerHTML = `
	<tr>
	<td>${pos.liquidity0}</td><td>${pos.liquidity1}</td>
	<td>${pos.lowerTick} - ${pos.upperTick}</td>
	<td>${pos.isIdle ? "Idle":"Active"}</td>
	<td>${pos.accumulatedYield0 + pos.accumulatedYield1}</td>
	</tr>
	`;
}catch(e){
	console.error('loadPosition error:', e);
	document.getElementById("positionTable").innerHTML = `<tr><td colspan="4">Error reading positions</td></tr>`;
}

}

async function loadIdleLPs(){

if(!selectedPool) return;

const poolId=getPoolId(selectedPool);

try {
	const reader = contractRead || contract;
	if (reader && typeof reader.idleLPs === "function") {
		const lps = await reader.idleLPs(poolId);
		document.getElementById("idleCount").innerText = (lps && lps.length) || 0;
		return;
	}

	// fallback: if contract exposes a different getter like `getIdleLPs` or `idleLPCount`
	if (reader && typeof reader.getIdleLPs === "function") {
		const lps = await reader.getIdleLPs(poolId);
		document.getElementById("idleCount").innerText = (lps && lps.length) || 0;
		return;
	}

	if (reader && typeof reader.idleLPCount === "function") {
		const cnt = await reader.idleLPCount(poolId);
		document.getElementById("idleCount").innerText = Number(cnt) || 0;
		return;
	}

	// unavailable on this ABI/contract — show N/A instead of throwing
	document.getElementById("idleCount").innerText = "N/A";

} catch (e) {
	console.error("loadIdleLPs error:", e);
	document.getElementById("idleCount").innerText = "Err";
}

}

async function claimYield(){

if(!selectedPool) return;

const poolId=getPoolId(selectedPool);

const tx = await contract.claimYield(poolId);

await tx.wait();

addActivity("Yield Claimed");

loadPosition();

}

function addActivity(text){

const li=document.createElement("li");

li.innerText=text;

document.getElementById("activityFeed").prepend(li);

totalYield += 1;

document.getElementById("totalYield").innerText = totalYield;

yieldChart.data.labels.push(yieldChart.data.labels.length+1);

yieldChart.data.datasets[0].data.push(totalYield);

yieldChart.update();

}

async function loadPoolAnalytics(){

for(let i=0;i<pools.length;i++){

const pool=pools[i];

const poolId=getPoolId(pool.id);

		const reader = contractRead || contract;
		if(!reader){
	poolChart.data.datasets[0].data[i]=0;
	poolChart.data.datasets[2].data[i]=0;
	continue;
}
		try{
			const config = await reader.poolConfig(poolId);
			let aaveTVL = 0;
			// strategy is returned as uint8: 0=NONE,1=ERC4626,2=AAVE
			const useAave = Number(config.strategy) === 2;
			if (useAave) {
				const aPrincs = await reader.totalATokenPrincipal(poolId);
				aaveTVL = Number(aPrincs[0]) + Number(aPrincs[1]);
			}
			poolChart.data.datasets[0].data[i] = aaveTVL;
			poolChart.data.datasets[2].data[i] = Number(config.protocolShareBP);
		}catch(e){
			console.error('loadPoolAnalytics error:', e);
			poolChart.data.datasets[0].data[i]=0;
			poolChart.data.datasets[2].data[i]=0;
		}

}

poolChart.update();

}

document.getElementById("connect").onclick = connectWallet;
document.getElementById("registerBtn").onclick = registerPosition;
document.getElementById("claimBtn").onclick = claimYield;

setInterval(async ()=>{

if(user){

loadPosition();
loadIdleLPs();
loadPoolAnalytics();

}

},15000);