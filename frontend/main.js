const connectBtn = document.getElementById('connectBtn');
const accountEl = document.getElementById('account');
const loadAbiBtn = document.getElementById('loadAbiBtn');
const fetchFromArtifactsBtn = document.getElementById('fetchFromArtifactsBtn');
const abiTextarea = document.getElementById('contractAbi');
const addressInput = document.getElementById('contractAddress');
const methodsArea = document.getElementById('methodsArea');
const logs = document.getElementById('logs');
// New user-friendly UI elements
// HookCanton educational frontend script (clean replacement)
const themeToggle = document.getElementById('themeToggle');
const pair_select = document.getElementById('pair_select');
const deposit_amount = document.getElementById('deposit_amount');
const maxBtn = document.getElementById('maxBtn');
const startOptimization = document.getElementById('startOptimization');
const previewSwap = document.getElementById('previewSwap');
const estApy = document.getElementById('estApy');
const yourBalance = document.getElementById('yourBalance');
const totalLiquidity = document.getElementById('totalLiquidity');
const totalYield = document.getElementById('totalYield');
const userLogs = document.getElementById('userLogs');
const statusBadge = document.getElementById('statusBadge');
const shareTwitter = document.getElementById('shareTwitter');
const shareLink = document.getElementById('shareLink');
const analyticsBtn = document.getElementById('analyticsBtn');
const useLiveContract = document.getElementById('useLiveContract');
const live_contract_address = document.getElementById('live_contract_address');
const live_poolId = document.getElementById('live_poolId');

const edu_computePool = document.getElementById('edu_computePool');
const edu_registerPosition = document.getElementById('edu_registerPosition');
const edu_simulateSwap = document.getElementById('edu_simulateSwap');
const edu_poolIdDisplay = document.getElementById('edu_poolIdDisplay');
const edu_actionsDisplay = document.getElementById('edu_actionsDisplay');
const edu_yieldDisplay = document.getElementById('edu_yieldDisplay');
const edu_stepsList = document.getElementById('edu_stepsList');

let provider = null;
let signer = null;

function appendLog(text, ok=false) {
  if (!userLogs) return console.log(text);
  const el = document.createElement('div');
  el.className = 'user-log';
  el.textContent = (ok ? '✅ ' : '') + text;
  userLogs.prepend(el);
}

function setStatus(text) {
  if (statusBadge) statusBadge.textContent = text;
}

async function connect() {
  if (!window.ethereum) return alert('Install MetaMask or another injected wallet');
  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  signer = await provider.getSigner();
  const addr = await signer.getAddress();
  connectBtn.textContent = 'Connected';
  setStatus('Connected: ' + addr.slice(0,6) + '…' + addr.slice(-4));
  appendLog('Wallet connected: ' + addr, true);
  try {
    const bal = await provider.getBalance(addr);
    if (yourBalance) yourBalance.textContent = Number(ethers.formatEther(bal)).toFixed(4) + ' ETH';
  } catch (e) { /* ignore */ }
}

connectBtn?.addEventListener('click', connect);

themeToggle?.addEventListener('click', () => {
  const body = document.body;
  if (body.classList.contains('theme-light')) { body.classList.remove('theme-light'); body.classList.add('theme-dark'); themeToggle.textContent = '☀️'; }
  else { body.classList.remove('theme-dark'); body.classList.add('theme-light'); themeToggle.textContent = '🌙'; }
});

maxBtn?.addEventListener('click', async () => {
  if (!signer || !provider) return alert('Connect wallet');
  const addr = await signer.getAddress();
  const bal = await provider.getBalance(addr);
  deposit_amount.value = Number(ethers.formatEther(bal)).toString();
});

// Simple human-readable "pool id" for education (keccak of pair+demo)
function humanPoolId(pair) {
  try { return ethers.keccak256(ethers.toUtf8Bytes(pair + '|hookcanton-demo')); } catch(e) { return '—'; }
}

edu_computePool?.addEventListener('click', () => {
  const pair = (pair_select && pair_select.value) || '';
  if (!pair) return alert('Choose a token pair');
  const pid = humanPoolId(pair);
  if (edu_poolIdDisplay) edu_poolIdDisplay.textContent = pair + ' — ' + pid.slice(0,10) + '…' + pid.slice(-6);
  if (edu_actionsDisplay) edu_actionsDisplay.textContent = 'Register position, move idle liquidity to vault, and redeploy when market moves.';
  if (edu_yieldDisplay) edu_yieldDisplay.textContent = '≈ 3–6% (illustrative)';
  if (edu_stepsList) edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position — pending</li><li>Step 3: Swap — pending</li>';
  appendLog('Step 1: Compute PoolId ✅', true);
});

edu_registerPosition?.addEventListener('click', async () => {
  appendLog('Step 2: Registering position — sending simulated transaction...');
  await new Promise(r => setTimeout(r, 900));
  appendLog('Step 2: Register Position ✅ — liquidity marked for optimization', true);
  if (edu_stepsList) edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position ✅</li><li>Step 3: Swap — pending</li>';
});

edu_simulateSwap?.addEventListener('click', async () => {
  const amount = Number(deposit_amount && deposit_amount.value || 0);
  if (!amount || amount <= 0) return alert('Enter deposit amount to simulate swap');
  appendLog('Step 3: Simulating swap for ' + amount + ' — computing preview...');
  const slippage = 0.5; // illustrative
  const minOut = amount * (1 - slippage/100);
  await new Promise(r => setTimeout(r, 700));
  appendLog('Step 3: Swap executed ✅ — min out ' + minOut.toFixed(6), true);
  if (edu_stepsList) edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position ✅</li><li>Step 3: Swap executed ✅</li>';
  if (edu_yieldDisplay) edu_yieldDisplay.textContent = 'Estimated APY: 4.2%';
});

previewSwap?.addEventListener('click', () => {
  const amount = Number(deposit_amount && deposit_amount.value || 0);
  if (!amount || amount <= 0) return alert('Enter amount to preview');
  const price = 1; // illustrative price
  const slippage = 0.5;
  const minOut = amount * (1 - slippage/100);
  appendLog('Preview: price approx. ' + price + ', slippage ' + slippage + '%, min out ' + minOut.toFixed(6));
});

analyticsBtn?.addEventListener('click', () => {
  if (totalLiquidity) totalLiquidity.textContent = '≈ 12.4M';
  if (totalYield) totalYield.textContent = '≈ 523k';
  appendLog('Loaded analytics (illustrative)');
});

shareTwitter?.addEventListener('click', () => {
  const text = encodeURIComponent('Exploring the Idle Hook demo on HookCanton — learning how idle liquidity is optimized!');
  const url = encodeURIComponent(location.href);
  window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
});

shareLink?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); appendLog('Demo link copied to clipboard', true); } catch (e) { appendLog('Copy failed'); }
});

// Initialize simple placeholders
if (estApy) estApy.textContent = '—';
if (totalLiquidity) totalLiquidity.textContent = '—';
if (totalYield) totalYield.textContent = '—';
appendLog('Welcome to the HookCanton Idle Hook demo — follow the steps to learn how the hook works');

// Guard older dev listeners if present (no-op)
try { document.getElementById('loadAbiBtn')?.remove(); } catch(e){}


function parseInputValue(val) {
  val = val.trim();
  if (val === '') return '';
  // Try parse JSON for arrays/objects
  if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}'))) {
    try { return JSON.parse(val); } catch (e) { }
  }
  // numbers -> BigInt or number
  if (/^\d+$/.test(val)) return val; // keep as decimal string for ethers
  return val;
}

loadAbiBtn?.addEventListener('click', () => {
  try {
    const abi = JSON.parse(abiTextarea.value);
    renderMethods(abi);
    log('ABI loaded, methods listed');
    const ss = document.getElementById('stepStatus');
    if (ss) ss.textContent = 'ABI loaded → Choose method or use Idle Hook actions';
  } catch (e) {
    alert('Invalid JSON ABI');
  }
});

fetchFromArtifactsBtn?.addEventListener('click', async () => {
  // attempt to fetch compiled artifact from project artifacts folder
  const artifactPath = prompt('Relative artifact path from site root (e.g. artifacts/contracts/hooks/IdleLiquidityHookEnterprise.sol/IdleLiquidityHookEnterprise.json)');
  if (!artifactPath) return;
  // Try absolute path from server root first, then try relative path from frontend folder
  const tries = ['/' + artifactPath, '../' + artifactPath, artifactPath];
  let lastErr = null;
  for (const p of tries) {
    try {
      const res = await fetch(p);
      if (!res.ok) {
        lastErr = new Error('Failed to fetch artifact at ' + p + ': ' + res.status + ' ' + res.statusText);
        continue;
      }
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        lastErr = new Error('Empty response at ' + p);
        continue;
      }
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        lastErr = new Error('Failed to parse JSON from ' + p + ': ' + parseErr.message);
        continue;
      }
      if (!json.abi) {
        lastErr = new Error('No ABI field in artifact at ' + p);
        continue;
      }
      abiTextarea.value = JSON.stringify(json.abi, null, 2);
      renderMethods(json.abi);
      log('Loaded ABI from', p);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  alert('Error fetching artifact. Tried paths: ' + tries.join(', ') + '\nLast error: ' + (lastErr && lastErr.message));
});

connectBtn.addEventListener('click', connect);

log('Frontend loaded');

// helper: compute poolId as keccak256(abi.encode(poolKey))
computePoolIdBtn?.addEventListener('click', () => {
  try {
    const c0 = pk_currency0.value.trim();
    const c1 = pk_currency1.value.trim();
    const fee = Number(pk_fee.value || 0);
    const tickSpacing = Number(pk_tickSpacing.value || 0);
    const hooksAddr = pk_hooks.value.trim() || ethers.ZeroAddress;
    if (!ethers.isAddress(c0) || !ethers.isAddress(c1)) return alert('Enter valid currency addresses');
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(['address','address','uint24','int24','address'], [c0, c1, fee, tickSpacing, hooksAddr]);
    const hash = ethers.keccak256(encoded);
    computedPoolId.value = hash;
    log('Computed PoolId', hash);
  } catch (e) { log('Error computing PoolId', e.message || e); }
});

async function requireContract() {
  const addr = addressInput.value.trim();
  if (!addr || !ethers.isAddress(addr)) throw new Error('Set a valid contract address in the Contract section');
  if (!contractInterface) throw new Error('Load contract ABI first');
  return new ethers.Contract(addr, contractInterface, signer || provider);
}

regBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const c = await requireContract();
    const pid = reg_poolId.value.trim();
    if (!pid) return alert('Enter PoolId');
    const liquidity = reg_liquidity.value.trim();
    const lower = reg_lower.value.trim() || '0';
    const upper = reg_upper.value.trim() || '0';
    const tx = await c.registerPosition(pid, liquidity.toString(), Number(lower), Number(upper));
    log('Sent registerPosition tx', tx.hash);
    const r = await tx.wait();
    log('Registered', r.transactionHash);
  } catch (e) { log('registerPosition error', e.message || e); }
});

function parsePoolKeyJson(text) {
  if (!text || text.trim() === '') return null;
  try {
    const obj = JSON.parse(text);
    // ensure fields exist with addresses or zeros
    return {
      currency0: obj.currency0 || ethers.ZeroAddress,
      currency1: obj.currency1 || ethers.ZeroAddress,
      fee: Number(obj.fee || 0),
      tickSpacing: Number(obj.tickSpacing || 0),
      hooks: obj.hooks || ethers.ZeroAddress
    };
  } catch (e) { throw new Error('Invalid PoolKey JSON'); }
}

deregBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const c = await requireContract();
    const pid = dereg_poolId.value.trim();
    if (!pid) return alert('Enter PoolId');
    const pk = parsePoolKeyJson(dereg_poolKeyJson.value) || {currency0: ethers.ZeroAddress, currency1: ethers.ZeroAddress, fee:0, tickSpacing:0, hooks: ethers.ZeroAddress};
    const tx = await c.deregisterPosition(pid, pk);
    log('Sent deregisterPosition tx', tx.hash);
    const r = await tx.wait();
    log('Deregistered', r.transactionHash);
  } catch (e) { log('deregisterPosition error', e.message || e); }
});

claimBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const c = await requireContract();
    const pid = claim_poolId.value.trim();
    if (!pid) return alert('Enter PoolId');
    const pk = parsePoolKeyJson(claim_poolKeyJson.value);
    if (!pk) return alert('Provide PoolKey JSON for claimYield');
    const tx = await c.claimYield(pid, pk);
    log('Sent claimYield tx', tx.hash);
    const r = await tx.wait();
    log('Claimed yield', r.transactionHash);
  } catch (e) { log('claimYield error', e.message || e); }
});

cfgSetVaultBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const c = await requireContract();
    const pid = cfg_poolId.value.trim();
    if (!pid) return alert('Enter PoolId');
    const vaultAddr = cfg_vault.value.trim();
    if (!ethers.isAddress(vaultAddr)) return alert('Enter valid vault address');
    const lpBP = Number(cfg_vault_lpBP.value || 0);
    const protocolBP = Number(cfg_vault_protocolBP.value || 0);
    if (!Number.isInteger(lpBP) || !Number.isInteger(protocolBP) || lpBP < 0 || protocolBP < 0 || lpBP > 10000 || protocolBP > 10000) {
      return alert('BP values must be integers between 0 and 10000');
    }
    if (lpBP + protocolBP !== 10000) {
      return alert('lpShareBP + protocolShareBP must equal 10000 (TOTAL_BP)');
    }
    const tx = await c.setPoolConfigVault(pid, vaultAddr, lpBP, protocolBP);
    log('Sent setPoolConfigVault tx', tx.hash);
    const r = await tx.wait();
    log('PoolConfig Vault set', r.transactionHash);
  } catch (e) { log('setPoolConfigVault error', e.message || e); }
});

cfgSetAaveBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const c = await requireContract();
    const pid = cfg_poolId.value.trim();
    if (!pid) return alert('Enter PoolId');
    const lending = cfg_lendingPool.value.trim();
    const aTok = cfg_aToken.value.trim();
    const asset = cfg_asset.value.trim();
    if (!ethers.isAddress(lending) || !ethers.isAddress(aTok) || !ethers.isAddress(asset)) return alert('Enter valid addresses');
    const lpBP = Number(cfg_aave_lpBP.value || 0);
    const protocolBP = Number(cfg_aave_protocolBP.value || 0);
    if (!Number.isInteger(lpBP) || !Number.isInteger(protocolBP) || lpBP < 0 || protocolBP < 0 || lpBP > 10000 || protocolBP > 10000) {
      return alert('BP values must be integers between 0 and 10000');
    }
    if (lpBP + protocolBP !== 10000) {
      return alert('lpShareBP + protocolShareBP must equal 10000 (TOTAL_BP)');
    }
    const tx = await c.setPoolConfigAave(pid, lending, aTok, asset, lpBP, protocolBP);
    log('Sent setPoolConfigAave tx', tx.hash);
    const r = await tx.wait();
    log('PoolConfig Aave set', r.transactionHash);
  } catch (e) { log('setPoolConfigAave error', e.message || e); }
});

// Uniswap pool.swap caller: performs a swap on a given pool contract so hooks are invoked via Uniswap swap flow
swapBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const poolAddr = (swap_poolAddress && swap_poolAddress.value || '').trim();
    if (!poolAddr || !ethers.isAddress(poolAddr)) return alert('Enter a valid pool address');
    let recipient = (swap_recipient && swap_recipient.value || '').trim();
    if (!recipient) recipient = await signer.getAddress();
    const zeroForOne = !!(swap_zeroForOne && swap_zeroForOne.checked);
    const amountSpecified = (swap_amountSpecified && swap_amountSpecified.value || '').trim();
    if (!amountSpecified) return alert('Enter amountSpecified');
    const sqrtPriceLimit = (swap_sqrtPriceLimit && swap_sqrtPriceLimit.value || '').trim() || '0';
    let dataHex = (swap_data && swap_data.value || '').trim() || '0x';
    if (dataHex && !dataHex.startsWith('0x')) dataHex = '0x' + dataHex;

    const poolAbi = ['function swap(address recipient,bool zeroForOne,int256 amountSpecified,uint160 sqrtPriceLimitX96,bytes data)'];
    const pool = new ethers.Contract(poolAddr, poolAbi, signer);
    log('Sending swap to pool', poolAddr, { recipient, zeroForOne, amountSpecified, sqrtPriceLimit, dataHex });
    const tx = await pool.swap(recipient, zeroForOne, amountSpecified.toString(), sqrtPriceLimit.toString(), dataHex);
    log('Sent swap tx', tx.hash);
    const receipt = await tx.wait();
    log('Swap confirmed', receipt.transactionHash);
  } catch (e) {
    log('swap error', e && (e.message || e));
  }
});

// Build ABI-encoded PoolKey and place into swap_data input (hex)
buildSwapDataBtn?.addEventListener('click', () => {
  try {
    const c0 = pk_currency0.value.trim();
    const c1 = pk_currency1.value.trim();
    const fee = Number(pk_fee.value || 0);
    const tickSpacing = Number(pk_tickSpacing.value || 0);
    const hooksAddr = (pk_hooks.value && pk_hooks.value.trim()) || ethers.ZeroAddress;
    if (!ethers.isAddress(c0) || !ethers.isAddress(c1)) return alert('Enter valid currency addresses in PoolKey fields');
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(['address','address','uint24','int24','address'], [c0, c1, fee, tickSpacing, hooksAddr]);
    // optionally prefix with a 4-byte selector
    const prefix = (swap_prefixSelector && swap_prefixSelector.value || '').trim();
    if (prefix) {
      let p = prefix;
      if (p.startsWith('0x')) p = p.slice(2);
      if (p.length !== 8) return alert('Selector must be 4 bytes (8 hex chars)');
      swap_data.value = '0x' + p + (encoded.startsWith('0x') ? encoded.slice(2) : encoded);
    } else {
      swap_data.value = encoded;
    }
    log('Built PoolKey data for swap', encoded);
  } catch (e) { log('buildSwapData error', e && (e.message || e)); }
});

// Build exactInputSingle calldata helper
buildExactInputSingleBtn?.addEventListener('click', () => {
  try {
    const tokenIn = (eis_tokenIn && eis_tokenIn.value || '').trim();
    const tokenOut = (eis_tokenOut && eis_tokenOut.value || '').trim();
    const fee = Number(eis_fee && eis_fee.value || 0);
    const recipient = (eis_recipient && eis_recipient.value || '').trim();
    const amountIn = (eis_amountIn && eis_amountIn.value || '').trim();
    const amountOutMin = (eis_amountOutMin && eis_amountOutMin.value || '').trim();
    let sqrtPriceLimit = (eis_sqrtPriceLimit && eis_sqrtPriceLimit.value || '').trim() || '0';
    const slippage = Number((eis_slippage && eis_slippage.value) || 0);
    if (!ethers.isAddress(tokenIn) || !ethers.isAddress(tokenOut)) return alert('Enter valid token addresses');
    if (!amountIn) return alert('Enter amountIn');
    if (sqrtPriceLimit && !sqrtPriceLimit.startsWith('0x')) {
      // assume decimal
      sqrtPriceLimit = '0x' + BigInt(sqrtPriceLimit).toString(16);
    }
    // exactInputSingle(ExactInputSingleParams): (address,address,uint24,address,uint256,uint256,uint160)
    const abi = [
      'function exactInputSingle(tuple(address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96))'
    ];
    const iface = new ethers.Interface(abi);
    // friendly defaults: recipient -> connected signer address, amountOutMin -> apply slippage if provided
    const finalRecipient = recipient || (signer ? (async () => await signer.getAddress())() : ethers.ZeroAddress);
    const amountInBI = BigInt(amountIn.toString());
    let amountOutMinimumBI = BigInt(0);
    if (amountOutMin && Number(amountOutMin) > 0) amountOutMinimumBI = BigInt(amountOutMin.toString());
    else if (slippage > 0) {
      // best-effort: set amountOutMin = 0 and show warning. We cannot compute exact output without on-chain quote.
      // Keep amountOutMinimumBI = 0 but include slippage in the UI as guidance.
    }
    const params = { tokenIn, tokenOut, fee, recipient: finalRecipient, amountIn: amountInBI.toString(), amountOutMinimum: amountOutMinimumBI.toString(), sqrtPriceLimitX96: sqrtPriceLimit === '0' ? 0 : BigInt(sqrtPriceLimit) };
    const data = iface.encodeFunctionData('exactInputSingle', [params]);
    router_calldata.value = data;
    log('Built exactInputSingle calldata', data);
    // show raw calldata only if advanced enabled
    if (router_advanced && router_advanced.checked) router_calldata.style.display = 'block';
  } catch (e) { log('buildExactInputSingle error', e && (e.message || e)); }
});

// Send router tx with provided calldata
sendRouterTxBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const addr = (router_address && router_address.value || '').trim();
    if (!addr || !ethers.isAddress(addr)) return alert('Enter router address');
    let data = (router_calldata && router_calldata.value || '').trim();
    if (!data) return alert('Provide calldata');
    if (!data.startsWith('0x')) data = '0x' + data;
    const val = (router_value && router_value.value || '').trim();
    const txReq = { to: addr, data };
    if (val && Number(val) > 0) txReq.value = ethers.parseEther(val);
    const tx = await signer.sendTransaction(txReq);
    log('Sent router tx', tx.hash);
    const r = await tx.wait();
    log('Router tx confirmed', r.transactionHash);
  } catch (e) { log('sendRouterTx error', e && (e.message || e)); }
});

// Approve tokenIn to router for amountIn (friendly UX)
approveTokenBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const tokenIn = (eis_tokenIn && eis_tokenIn.value || '').trim();
    const routerAddr = (router_address && router_address.value || '').trim();
    const amountIn = (eis_amountIn && eis_amountIn.value || '').trim();
    if (!ethers.isAddress(tokenIn)) return alert('Enter tokenIn address');
    if (!ethers.isAddress(routerAddr)) return alert('Enter router address');
    if (!amountIn && !(approve_max && approve_max.checked)) return alert('Enter amountIn to approve or enable Approve max');
    const erc20 = new ethers.Contract(tokenIn, ['function approve(address,uint256) public returns (bool)'], signer);
    const approveAmount = (approve_max && approve_max.checked) ? ethers.MaxUint256 : BigInt(amountIn.toString());
    const tx = await erc20.approve(routerAddr, approveAmount);
    log('Sent approve tx', tx.hash);
    const r = await tx.wait();
    log('Approve confirmed', r.transactionHash);
  } catch (e) { log('approve error', e && (e.message || e)); }
});

// Quoter: get a quote for exactInputSingle → quoteExactInputSingle
quoteBtn?.addEventListener('click', async () => {
  try {
    if (!provider && !signer) return alert('Connect wallet');
    const quoterAddr = (quoter_address && quoter_address.value || '').trim();
    if (!quoterAddr || !ethers.isAddress(quoterAddr)) return alert('Enter a valid quoter address');
    const tokenIn = (eis_tokenIn && eis_tokenIn.value || '').trim();
    const tokenOut = (eis_tokenOut && eis_tokenOut.value || '').trim();
    const fee = Number(eis_fee && eis_fee.value || 0);
    const amountIn = (eis_amountIn && eis_amountIn.value || '').trim();
    let sqrtPriceLimit = (eis_sqrtPriceLimit && eis_sqrtPriceLimit.value || '').trim() || '0';
    if (!ethers.isAddress(tokenIn) || !ethers.isAddress(tokenOut)) return alert('Enter valid token addresses');
    if (!amountIn) return alert('Enter amountIn to quote');
    if (sqrtPriceLimit && !sqrtPriceLimit.startsWith('0x')) sqrtPriceLimit = '0x' + BigInt(sqrtPriceLimit).toString(16);
    const abi = ['function quoteExactInputSingle(address,address,uint24,uint256,uint160) view returns (uint256)'];
    const q = new ethers.Contract(quoterAddr, abi, provider || signer);
    const out = await q.quoteExactInputSingle(tokenIn, tokenOut, fee, BigInt(amountIn.toString()), sqrtPriceLimit === '0' ? 0 : BigInt(sqrtPriceLimit));
    quoted_amountOut.value = out.toString();
    log('Quoted amountOut', out.toString());
  } catch (e) { log('quote error', e && (e.message || e)); }
});

// Apply quoted amount to amountOutMin with slippage
applyQuoteBtn?.addEventListener('click', () => {
  try {
    const quoted = (quoted_amountOut && quoted_amountOut.value || '').trim();
    if (!quoted) return alert('No quoted amount available');
    const slippage = Number((eis_slippage && eis_slippage.value) || 0);
    if (isNaN(slippage) || slippage < 0) return alert('Enter valid slippage percent');
    // compute amountOutMin = quoted * (1 - slippage/100) using integer math
    const quotedBI = BigInt(quoted.toString());
    const numerator = Math.round((100 - slippage) * 100); // scaled by 100
    const amountOutMin = (quotedBI * BigInt(numerator)) / BigInt(100 * 100);
    if (eis_amountOutMin) eis_amountOutMin.value = amountOutMin.toString();
    log('Applied quoted amount with slippage, amountOutMin', amountOutMin.toString());
  } catch (e) { log('applyQuote error', e && (e.message || e)); }
});

// Compute tick from provided sqrtPriceX96 (hex or decimal) using binary search
computeTickFromSqrtBtn?.addEventListener('click', () => {
  try {
    const v = (tick_sqrtInput && tick_sqrtInput.value || '').trim();
    if (!v) return alert('Enter sqrtPriceX96');
    let big;
    if (v.startsWith('0x') || v.startsWith('0X')) big = BigInt(v);
    else big = BigInt(v);
    const tick = getTickAtSqrtRatio(big);
    if (computedTick) computedTick.value = tick.toString();
    log('Computed tick from sqrtPriceX96', tick);
  } catch (e) { log('computeTickFromSqrt error', e && (e.message || e)); }
});

// auto-fetch token decimals when tokenIn changes to help users
eis_tokenIn?.addEventListener('blur', async () => {
  try {
    const token = (eis_tokenIn && eis_tokenIn.value || '').trim();
    if (!ethers.isAddress(token)) return;
    const erc = new ethers.Contract(token, ['function decimals() view returns (uint8)'], provider || signer);
    const d = await erc.decimals();
    // if user hasn't set decimals in amount input, prefill placeholder
    if (swap_amountDecimals && (!swap_amountDecimals.value || swap_amountDecimals.value.trim()==='')) swap_amountDecimals.value = d.toString();
    if (eis_amountIn && (!eis_amountIn.value || eis_amountIn.value.trim()==='')) eis_amountIn.placeholder = 'amount in (decimals ' + d + ')';
    log('Fetched token decimals', token, d.toString());
  } catch (e) { /* ignore */ }
});

// Compute amountSpecified from human amount + decimals using ethers.parseUnits
computeAmountBtn?.addEventListener('click', () => {
  try {
    const human = (swap_amountHuman && swap_amountHuman.value || '').trim();
    const dec = (swap_amountDecimals && swap_amountDecimals.value || '').trim();
    if (!human) return alert('Enter human amount');
    const decimals = dec === '' ? 18 : Number(dec);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return alert('Enter valid decimals (0-36)');
    // ethers.parseUnits handles decimals and returns a BigInt-like string
    const v = ethers.parseUnits(human, decimals).toString();
    swap_amountSpecified.value = v;
    log('Computed amountSpecified', v);
  } catch (e) { log('computeAmount error', e && (e.message || e)); }
});

// Compute sqrtPriceX96 from a price (token1/token0) using double -> warns about precision for extreme values
computeSqrtFromPriceBtn?.addEventListener('click', () => {
  try {
    const p = (swap_price && swap_price.value || '').trim();
    if (!p) return alert('Enter a price (token1/token0)');
    const priceNum = Number(p);
    if (!isFinite(priceNum) || priceNum <= 0) return alert('Enter a positive numeric price');
    const sqrtPrice = Math.sqrt(priceNum);
    const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * Math.pow(2,96)));
    swap_sqrtPriceLimit.value = '0x' + sqrtPriceX96.toString(16);
    log('Computed sqrtPriceX96 from price', swap_sqrtPriceLimit.value);
  } catch (e) { log('computeSqrtFromPrice error', e && (e.message || e)); }
});

// Compute sqrtPriceX96 from tick: sqrtPrice = sqrt(1.0001 ** tick) ; sqrtPriceX96 = sqrtPrice * 2^96
computeSqrtFromTickBtn?.addEventListener('click', () => {
  try {
    const t = (swap_tick && swap_tick.value || '').trim();
    if (t === '') return alert('Enter tick');
    const tick = Number(t);
    if (!Number.isFinite(tick)) return alert('Invalid tick');
    // use high-precision TickMath implementation
    const sqrtX96 = getSqrtRatioAtTick(tick);
    swap_sqrtPriceLimit.value = '0x' + sqrtX96.toString(16);
    log('Computed sqrtPriceX96 from tick (high-precision)', swap_sqrtPriceLimit.value);
  } catch (e) { log('computeSqrtFromTick error', e && (e.message || e)); }
});

// High-precision TickMath getSqrtRatioAtTick (BigInt) ported from Uniswap V3 TickMath
function getSqrtRatioAtTick(tick) {
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  if (tick < MIN_TICK || tick > MAX_TICK) throw new Error('T');
  let absTick = tick < 0 ? -tick : tick;

  const mul = (a, b) => (a * b) >> BigInt(128);

  let ratio = BigInt('0x100000000000000000000000000000000');
  if (absTick & 0x1) ratio = mul(ratio, BigInt('0xfffcb933bd6fad37aa2d162d1a594001'));
  if (absTick & 0x2) ratio = mul(ratio, BigInt('0xfff97272373d413259a46990580e213a'));
  if (absTick & 0x4) ratio = mul(ratio, BigInt('0xfff2e50f5f656932ef12357cf3c7fdcc'));
  if (absTick & 0x8) ratio = mul(ratio, BigInt('0xffe5caca7e10e4e61c3624eaa0941cd0'));
  if (absTick & 0x10) ratio = mul(ratio, BigInt('0xffcb9843d60f6159c9db58835c926644'));
  if (absTick & 0x20) ratio = mul(ratio, BigInt('0xff973b41fa98c081472e6896dfb254c0'));
  if (absTick & 0x40) ratio = mul(ratio, BigInt('0xff2ea16466c96a3843ec78b326b52861'));
  if (absTick & 0x80) ratio = mul(ratio, BigInt('0xfe5dee046a99a2a811c461f1969c3053'));
  if (absTick & 0x100) ratio = mul(ratio, BigInt('0xfcbe86c7900a88aedcffc83b479aa3a4'));
  if (absTick & 0x200) ratio = mul(ratio, BigInt('0xf987a7253ac413176f2b074cf7815e54'));
  if (absTick & 0x400) ratio = mul(ratio, BigInt('0xf3392b0822b70005940c7a398e4b70f3'));
  if (absTick & 0x800) ratio = mul(ratio, BigInt('0xe7159475a2c29b7443b29c7fa6e889d9'));
  if (absTick & 0x1000) ratio = mul(ratio, BigInt('0xd097f3bdfd2022b8845ad8f792aa5825'));
  if (absTick & 0x2000) ratio = mul(ratio, BigInt('0xa9f746462d870fdf8a65dc1f90e061e5'));
  if (absTick & 0x4000) ratio = mul(ratio, BigInt('0x70d869a156d2a1b890bb3df62baf32f7'));
  if (absTick & 0x8000) ratio = mul(ratio, BigInt('0x31be135f97d08fd981231505542fcfa6'));
  if (absTick & 0x10000) ratio = mul(ratio, BigInt('0x9aa508b5b7a84e1c677de54f3e99bc9'));
  if (absTick & 0x20000) ratio = mul(ratio, BigInt('0x5d6af8dedb81196699c329225ee604'));
  if (absTick & 0x40000) ratio = mul(ratio, BigInt('0x2216e584f5fa1ea926041bedfe98'));
  if (absTick & 0x80000) ratio = mul(ratio, BigInt('0x48a170391f7dc42444e8fa2'));

  if (tick > 0) ratio = (BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff') / ratio);

  // shift right by 32, rounding up if remainder is non-zero
  const shift = BigInt(32);
  const result = ratio >> shift;
  const rem = ratio & ((BigInt(1) << shift) - BigInt(1));
  return rem === BigInt(0) ? result : (result + BigInt(1));
}

// Derive tick from sqrtPriceX96 via binary search using getSqrtRatioAtTick
function getTickAtSqrtRatio(sqrtX96) {
  const MIN_TICK = -887272;
  const MAX_TICK = 887272;
  let low = MIN_TICK;
  let high = MAX_TICK;
  // ensure sqrtX96 is BigInt
  let target;
  if (typeof sqrtX96 === 'string') {
    if (sqrtX96.startsWith('0x') || sqrtX96.startsWith('0X')) target = BigInt(sqrtX96);
    else target = BigInt(sqrtX96);
  } else if (typeof sqrtX96 === 'bigint') target = sqrtX96;
  else target = BigInt(sqrtX96);

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midSqrt = getSqrtRatioAtTick(mid);
    if (midSqrt === target) return mid;
    if (midSqrt < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  // high will be the largest tick with sqrt <= target
  return high;
}

// Demo loader: tries to load frontend/addresses.json from a few common paths
const loadDemoBtn = document.getElementById('loadDemoBtn');
const demoAddressesEl = document.getElementById('demoAddresses');
async function tryFetchJson(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await fetch(p);
      if (!res.ok) { lastErr = new Error('Fetch failed ' + p + ' ' + res.status); continue; }
      const txt = await res.text();
      if (!txt || txt.trim().length === 0) { lastErr = new Error('Empty response ' + p); continue; }
      try { return JSON.parse(txt); } catch (e) { lastErr = e; continue; }
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Not found');
}

loadDemoBtn?.addEventListener('click', async () => {
  // prefer root-mounted addresses.json when the server's cwd is the frontend folder
  const tries = ['/addresses.json', 'addresses.json', '/frontend/addresses.json', 'frontend/addresses.json'];
  try {
    const data = await tryFetchJson(tries);
    demoAddressesEl.textContent = JSON.stringify(data, null, 2);
    const ss = document.getElementById('stepStatus'); if (ss) ss.textContent = 'Demo loaded → Contract address set';
    if (data.hook) addressInput.value = data.hook;
    if (data.poolManager) log('Demo PoolManager', data.poolManager);
    log('Loaded demo addresses', data);
  } catch (e) {
    alert('Could not load demo addresses.json from known locations. Run the local deploy script to write frontend/addresses.json');
    log('demo load error', e.message || e);
  }
});

// Decode revert reason heuristically from common error shapes
function decodeRevert(err) {
  if (!err) return null;
  // ethers v6 provider errors may include data, body, or error.message containing 'revert'
  try {
    if (err.error && err.error.data) {
      const d = err.error.data;
      const m = String(d).match(/revert(?:\(|: )?\s*(.*)/i);
      if (m && m[1]) return m[1];
    }
    if (err.data) {
      const m = String(err.data).match(/revert(?:\(|: )?\s*(.*)/i);
      if (m && m[1]) return m[1];
    }
    if (err.body) {
      const m = String(err.body).match(/revert(?:\(|: )?\s*(.*)/i);
      if (m && m[1]) return m[1];
    }
    if (err.message) {
      const m = String(err.message).match(/revert(?:\(|: )?\s*(.*)/i);
      if (m && m[1]) return m[1];
    }
  } catch (e) { /* ignore */ }
  return null;
}

// small UX helper to update step status from other flows
function setStep(text) { const s = document.getElementById('stepStatus'); if (s) s.textContent = text; }

// Update step status on successful txs globally (monkeypatch log to watch receipts)
const _origLog = log;
window.log = function(...args) { _origLog(...args); try { if (String(args[0]||'').toLowerCase().includes('sent tx')) setStep('Transaction sent, awaiting confirmation'); if (String(args[0]||'').toLowerCase().includes('receipt') || String(args[0]||'').toLowerCase().includes('registered') || String(args[0]||'').toLowerCase().includes('deregistered') || String(args[0]||'').toLowerCase().includes('claimed')) setStep('Transaction confirmed'); } catch(e){} };

// --- User-friendly UI behaviors ---
function appendUserLog(message, ok) {
  if (!userLogs) return;
  const el = document.createElement('div');
  el.className = 'user-log';
  el.textContent = message + (ok ? ' ✅' : '');
  userLogs.prepend(el);
}

themeToggle?.addEventListener('click', () => {
  try {
    const body = document.body;
    if (body.classList.contains('theme-light')) {
      body.classList.remove('theme-light'); body.classList.add('theme-dark'); themeToggle.textContent = '☀️';
    } else { body.classList.remove('theme-dark'); body.classList.add('theme-light'); themeToggle.textContent = '🌙'; }
  } catch (e) { console.warn(e); }
});

maxBtn?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet first');
    const addr = await signer.getAddress();
    const bal = await provider.getBalance(addr);
    deposit_amount.value = Number(ethers.formatEther(bal)).toString();
  } catch (e) { console.warn(e); }
});

startOptimization?.addEventListener('click', async () => {
  try {
    if (!signer) return alert('Connect wallet');
    const pair = pair_select && pair_select.value;
    const amount = deposit_amount && deposit_amount.value;
    if (!pair) return alert('Select a token pair');
    if (!amount || Number(amount) <= 0) return alert('Enter deposit amount');

    // If user enabled live contract, send registerPosition tx (advanced)
    if (useLiveContract && useLiveContract.checked) {
      const addr = (live_contract_address && live_contract_address.value || '').trim();
      if (!addr || !ethers.isAddress(addr)) return alert('Enter a valid contract address in advanced settings');
      const poolId = (live_poolId && live_poolId.value || '').trim();
      if (!poolId) return alert('Enter PoolId (bytes32) in advanced settings');
      appendUserLog('Sending registerPosition to contract ' + addr + ' — pending...');
      try {
        const abi = ['function registerPosition(bytes32,uint128,int24,int24)'];
        const c = new ethers.Contract(addr, abi, signer);
        // assume 18 decimals for demo tokens; convert amount to wei
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const tx = await c.registerPosition(poolId, BigInt(amountWei.toString()), 0, 0);
        appendUserLog('Sent registerPosition tx ' + tx.hash);
        const receipt = await tx.wait();
        appendUserLog('Register confirmed — tx ' + receipt.transactionHash, true);
      } catch (e) {
        appendUserLog('On-chain register error: ' + (e && (e.message || e.toString())));
      }
      return;
    }

    // Local demo flow (no on-chain calls)
    appendUserLog('Submitting deposit of ' + amount + ' for ' + pair + ' — pending...');
    estApy && (estApy.textContent = '4.2%');
    await new Promise(r => setTimeout(r, 1200));
    appendUserLog('Deposit confirmed — funds optimizing', true);
    appendUserLog('Expected yield ~4.2% APY', true);
  } catch (e) { appendUserLog('Error starting optimization: ' + (e && e.message)); }
});

previewSwap?.addEventListener('click', () => {
  try {
    const amount = Number(deposit_amount && deposit_amount.value || 0);
    if (!amount || amount <= 0) return alert('Enter amount to preview');
    // naive preview: assume 0.5% slippage
    const slippagePct = 0.5;
    const amountOut = amount * (1 - slippagePct / 100);
    appendUserLog('Preview: price approx. — slippage ' + slippagePct + '%, min out ' + amountOut.toFixed(6));
  } catch (e) { appendUserLog('Preview error: ' + (e && e.message)); }
});

shareTwitter?.addEventListener('click', () => {
  const text = encodeURIComponent('I\'m using Idle Liquidity Optimizer to earn yield on idle funds!');
  const url = encodeURIComponent(location.href);
  window.open('https://twitter.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
});

shareLink?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); appendUserLog('Link copied to clipboard', true); } catch (e) { appendUserLog('Copy failed'); }
});

analyticsBtn?.addEventListener('click', () => {
  // simple analytics placeholders
  if (totalLiquidity) totalLiquidity.textContent = '≈ 12.4M';
  appendUserLog('Analytics loaded');
});

// --- Educational demo handlers ---
function shortHex(hex) {
  if (!hex) return '—';
  const s = String(hex);
  return s.slice(0,10) + '…' + s.slice(-6);
}

edu_computePool?.addEventListener('click', () => {
  try {
    const pair = (pair_select && pair_select.value) || 'UNKNOWN';
    // simple human-readable pool id (keccak of pair)
    const bytes = ethers.toUtf8Bytes(pair + '|demo');
    const hash = ethers.keccak256(bytes);
    if (edu_poolIdDisplay) edu_poolIdDisplay.textContent = pair + ' — ' + shortHex(hash);
    if (edu_actionsDisplay) edu_actionsDisplay.textContent = 'Will register position and optimize idle liquidity via swaps.';
    if (edu_yieldDisplay) edu_yieldDisplay.textContent = '≈ 3–6% (illustrative)';
    appendUserLog('Step 1: Compute PoolId ✅');
    // update step list
    if (edu_stepsList) {
      edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position — pending</li><li>Step 3: Swap — pending</li>';
    }
  } catch (e) { appendUserLog('Compute pool error: ' + (e && e.message)); }
});

edu_registerPosition?.addEventListener('click', async () => {
  try {
    appendUserLog('Step 2: Registering position — pending...');
    // simulate user confirmation / tx
    await new Promise(r => setTimeout(r, 900));
    appendUserLog('Step 2: Register Position ✅');
    if (edu_actionsDisplay) edu_actionsDisplay.textContent = 'Position registered: liquidity locked for optimization.';
    if (edu_stepsList) {
      edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position ✅</li><li>Step 3: Swap — pending</li>';
    }
  } catch (e) { appendUserLog('Register error: ' + (e && e.message)); }
});

edu_simulateSwap?.addEventListener('click', async () => {
  try {
    const amount = Number(deposit_amount && deposit_amount.value || 0);
    if (!amount || amount <= 0) return alert('Enter deposit amount to simulate swap');
    appendUserLog('Step 3: Simulating swap for ' + amount + ' — computing preview...');
    // naive preview: slippage 0.5%
    const slippage = 0.5;
    const minOut = amount * (1 - slippage/100);
    await new Promise(r => setTimeout(r, 700));
    appendUserLog('Step 3: Swap executed ✅ — min out ' + minOut.toFixed(6));
    if (edu_stepsList) {
      edu_stepsList.innerHTML = '<li>Step 1: Compute PoolId ✅</li><li>Step 2: Register Position ✅</li><li>Step 3: Swap executed ✅</li>';
    }
    if (edu_yieldDisplay) edu_yieldDisplay.textContent = 'Estimated APY: 4.2%';
  } catch (e) { appendUserLog('Simulate swap error: ' + (e && e.message)); }
});
