# 🧠 IdleLiquidityHook

**IdleLiquidityHook** is a **Uniswap v4 Hook** that automatically deploys **idle liquidity into yield strategies**, allowing liquidity providers to earn additional yield when their capital is not actively being used for swaps.

Built for the **Uniswap v4 Hook ecosystem**, this project demonstrates how hooks can unlock **capital efficiency and automated yield generation**.

---

# 🚨 Problem

In traditional AMMs:

• Liquidity providers only earn **swap fees**
• When trading volume drops, liquidity becomes **idle capital**
• Idle liquidity earns **no yield**

This results in **inefficient capital usage across DeFi**.

---

# 💡 Solution

**IdleLiquidityHook** introduces a hook that:

1️⃣ Detects when liquidity is idle
2️⃣ Deploys idle funds into a **yield strategy**
3️⃣ Returns liquidity instantly when trading resumes

This allows LPs to earn:

• **Swap fees** when swaps happen
• **Yield** when liquidity is idle

Result → **Maximum capital efficiency**

---

# ⚙️ How It Works

### Hook Lifecycle

```
LP Adds Liquidity
        │
        ▼
Uniswap v4 Pool
        │
        ▼
IdleLiquidityHook
        │
        ├── If swaps happening → do nothing
        │
        └── If idle liquidity detected
                 │
                 ▼
        StrategyManager
                 │
                 ▼
        Yield Protocol
        (Aave / ERC20-46426)
```

The hook acts as an **automated liquidity optimizer**.

---

# 🧩 Architecture

```
User (LP)
   │
   ▼
Uniswap v4 Pool
   │
   ▼
IdleLiquidityHook
   │
   ▼
StrategyManager
   │
   ▼
External Yield Protocol
```

---

# ✨ Key Features

✔ Uniswap **v4 Hooks architecture**
✔ Automatic **idle liquidity detection**
✔ **Yield strategy integration**
✔ Modular **strategy manager**
✔ Improves **LP capital efficiency**

---

# 📁 Project Structure

```
idleLiquidity-hook/

contracts/
│
├── IdleLiquidityHook.sol
├── StrategyManager.sol

scripts/
│
└── deploy.js

test/
│
└── IdleLiquidityHook.test.js

hardhat.config.js
package.json
README.md
```

---

# ⚡ Installation

Clone the repository

```bash
git clone https://github.com/IsholaAtotimati/uniswapv4-hook.git
cd uniswapv4-hook
```

Install dependencies

```bash
npm install
```

---

# 🔨 Compile Contracts

```bash
npx hardhat compile
Output

```

---

# 🧪 Run Tests

```bash
npx hardhat test
lukman12@DESKTOP-K58EKDO:~/idleLiquidity-hook$ npx hardhat test
[dotenv@17.3.1] injecting env (7) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild


  IdleLiquidityHookEnterprise Batch Import
    - should batch import multiple positions

  IdleLiquidityHookEnterprise Fuzz Tests
    ✔ should handle random LP registrations

  IdleLiquidityHookEnterprise Gas Tests
Register Gas Used: 177295
Deregister Gas Used: 100435
    ✔ measure register + deregister gas (8684ms)

  IdleLiquidityHookEnterprise Integration Tests
    ✔ full LP lifecycle simulation (5520ms)

  IdleLiquidityHookEnterprise - Multi-Pool Multi-LP Full Integration
    1) "before all" hook for "should mark pool update after simulated swap"

  IdleLiquidityHookEnterprise Invariant: totalAssets >= totalUserBalances
    ✔ should always have totalAssets >= totalUserBalances (4103ms)

  IdleLiquidityHookEnterprise Invariants
    ✔ totalIdleLiquidity always >= 0 (378ms)

  IdleLiquidityHookEnterprise Batch Import
    - should batch import multiple positions

  IdleLiquidityHookEnterprise Unit Tests
    ✔ should register a position (3576ms)
    ✔ reverts if pool manager reports no underlying position (414ms)
    ✔ should deregister a position (5273ms)
    configuration guards
      ✔ setPoolConfigVault rejects zero vault (365ms)
      ✔ setPoolConfigAave rejects zero parameters (363ms)
    Aave strategy
debug: feed set to 0xab845286A9308ff2691355Da1230160C613315a8
debug pos after register Result(13) [
  1000n, 0n, 1n, 100n,
     0n, 0n, 0n,   0n,
     0n, 0n, 0n,   0n,
     0n
]
debug pre-rebalance feed 0xab845286A9308ff2691355Da1230160C613315a8 assetAddr 0x58895A573ACcD4df8c0C8B1DDca85585E180b0bB
debug aToken balance hook 1000n
debug pos after rebalance Result(13) [
  1000n, 0n, 1n,  100n,
     1n, 0n, 0n,    0n,
     0n, 0n, 0n, 1000n,
     0n
]
debug pos before withdrawal update Result(13) [
  1000n, 0n, -100n,  100n,
     1n, 0n,    0n,    0n,
     0n, 0n,    0n, 1000n,
     0n
]
debug post-withdraw asset balance hook 1000n
debug post-withdraw pool asset balance 0n
debug post-withdraw aToken balance hook 0n
      ✔ moves assets into lending pool when idle and withdraws when active (8681ms)
    dual-token asset selection
      ✔ claims yield using configured asset regardless of pool key currency0 (7664ms)
      ✔ allows owner to set and read price feeds (7722ms)
    migration helpers
      ✔ importPosition copies data correctly (2165ms)
    global index accounting
      ✔ lets owner bump index and LP collect correct share (11189ms)

  IdleLiquidityHookEnterprise Upgraded
    ✔ should register and track LPs efficiently (3724ms)
    ✔ should move liquidity to idle and back to active (11989ms)
    ✔ should accrue and claim yield correctly (8186ms)

  HelloWorld
    ✔ should pass


  19 passing (2m)
  2 pending
  1 failing

  1) IdleLiquidityHookEnterprise - Multi-Pool Multi-LP Full Integration
       "before all" hook for "should mark pool update after simulated swap":
     TypeError: Cannot read properties of undefined (reading 'address')
      at Context.<anonymous> (test/integration/SwapFork.integration.js:70:48)



···············································································································································································
|  Solidity and Network Configuration                                                                                                                                         │
··························································································|·················|···············|·················|································
|  Solidity: 0.8.26                                                                       ·  Optim: true    ·  Runs: 200    ·  viaIR: false   ·     Block: 60,000,000 gas     │
··························································································|·················|···············|·················|································
|  Methods                                                                                                                                                                    │
··························································································|·················|···············|·················|················|···············
|  Contracts / Methods                                                                    ·  Min            ·  Max          ·  Avg            ·  # calls       ·  usd (avg)   │
··························································································|·················|···············|·················|················|···············
|  ERC20                                                                                  ·                                                                                   │
··························································································|·················|···············|·················|················|···············
|      transfer(address,uint256)                                                          ·              -  ·            -  ·         62,248  ·             1  ·           -  │
··························································································|·················|···············|·················|················|···············
|  ERC20Mock                                                                              ·                                                                                   │
··························································································|·················|···············|·················|················|···············
|      approve(address,uint256)                                                           ·              -  ·            -  ·         46,221  ·             2  ·           -  │
··························································································|·················|···············|·················|················|···············
|      transfer(address,uint256)                                                          ·         51,383  ·       51,395  ·         51,393  ·             7  ·           -  │
··························································································|·················|···············|·················|················|···············
|  IdleLiquidityHookEnterprise                                                            ·                                                                                   │
··························································································|·················|···············|·················|················|···············
|      addGlobalYield(bytes32,uint8,uint256)                                              ·         49,278  ·       49,290  ·         49,284  ·             4  ·           -  │
··························································································|·················|···············|·················|················|···············
|      claimYield(bytes32)                                                                ·         94,024  ·      115,922  ·         98,404  ·             5  ·           -  │
··························································································|·················|···············|·················|················|···············
|      deregisterPosition(bytes32)                                                        ·        100,435  ·      153,570  ·        111,062  ·             5  ·           -  │
··························································································|·················|···············|·················|················|···············
|      importPosition(bytes32,address,uint128,uint128,int24,int24,uint8,uint256,uint256)  ·              -  ·            -  ·        126,404  ·             1  ·           -  │
··························································································|·················|···············|·················|················|···············
|      processPosition(bytes32,address)                                                   ·              -  ·            -  ·        148,830  ·             2  ·           -  │
··························································································|·················|···············|·················|················|···············
|      rebalance(bytes32,uint256,uint256)                                                 ·         38,377  ·      355,550  ·        149,687  ·             5  ·           -  │
··························································································|·················|···············|·················|················|···············
|      registerPosition(bytes32,uint128,uint128,int24,int24)                              ·         67,743  ·      177,295  ·        155,175  ·            16  ·           -  │
··························································································|·················|···············|·················|················|···············
|      setPoolConfigAave(bytes32,uint8,address,address,address,uint256,uint256)           ·              -  ·            -  ·        142,001  ·             1  ·           -  │
··························································································|·················|···············|·················|················|···············
|      setPoolConfigVault(bytes32,uint8,address,address,uint256,uint256)                  ·         92,962  ·      132,762  ·        112,866  ·            10  ·           -  │
··························································································|·················|···············|·················|················|···············
|      setPriceFeed(address,address)                                                      ·         55,930  ·       78,222  ·         74,506  ·            12  ·           -  │
··························································································|·················|···············|·················|················|···············
|      testMarkNeedUpdate(bytes32)                                                        ·              -  ·            -  ·         44,040  ·             5  ·           -  │
··························································································|·················|···············|·················|················|···············
|      testSetPositionRange(bytes32,address,int24,int24)                                  ·              -  ·            -  ·         30,569  ·             1  ·           -  │
··························································································|·················|···············|·················|················|···············
|  MockAggregator                                                                         ·                                                                                   │
··························································································|·················|···············|·················|················|···············
|      setAnswer(int256)                                                                  ·              -  ·            -  ·         26,425  ·             1  ·           -  │
··························································································|·················|···············|·················|················|···············
|      setRoundData(int256,uint256)                                                       ·         26,002  ·       28,826  ·         27,798  ·            11  ·           -  │
··························································································|·················|···············|·················|················|···············
|      setTimestamp(uint256)                                                              ·              -  ·            -  ·         26,472  ·             4  ·           -  │
··························································································|·················|···············|·················|················|···············
|  PoolManagerMock                                                                        ·                                                                                   │
··························································································|·················|···············|·················|················|···············
|      setPositionLiquidity(bytes32,address,int24,int24,uint128)                          ·         48,142  ·       68,066  ·         66,582  ·            14  ·           -  │
··························································································|·················|···············|·················|················|···············
|  Deployments                                                                                              ·                                 ·  % of limit    ·              │
··························································································|·················|···············|·················|················|···············
|  ERC20Mock                                                                              ·        696,550  ·      736,386  ·        733,312  ·         1.2 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  IdleLiquidityHookEnterprise                                                            ·              -  ·            -  ·      4,517,043  ·         7.5 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  LendingPoolMock                                                                        ·              -  ·            -  ·        328,465  ·         0.5 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  MockAggregator                                                                         ·        161,177  ·      161,201  ·        161,191  ·         0.3 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  mocks/ERC4626Mock.sol:ERC4626Mock                                                      ·      1,329,138  ·    1,329,150  ·      1,329,149  ·         2.2 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  PoolManagerMock                                                                        ·              -  ·            -  ·        308,389  ·         0.5 %  ·           -  │
··························································································|·················|···············|·················|················|···············
|  Key                                                                                                                                                                        │
···············································································································································································
|  ◯  Execution gas for this method does not include intrinsic gas overhead                                                                                                   │
···············································································································································································
|  △  Cost was non-zero but below the precision setting for the currency display (see options)                                                                                │
···············································································································································································
|  Toolchain:  hardhat                                                                                                                                                        │
···············································································································································································
lukman12@DESKTOP-K58EKDO:~/idleLiquidity-hook$ 
```

---

# 🚀 fork mainet

start node
lukman12@DESKTOP-K58EKDO:~/idleLiquidity-hook$ npx hardhat  node --fork https://eth-mainnet.g.alchemy.com/v2/my private-key
run : npx hardhat run scripts/lifecycle-demo.js --network localhost
expected output:
lukman12@DESKTOP-K58EKDO:~/idleLiquidity-hook$ npx hardhat run scripts/lifecycle-demo.js --network localhost
[dotenv@17.3.1] injecting env (7) from .env -- tip: 🔐 prevent building .env in docker: https://dotenvx.com/prebuild
[dotenv@17.3.1] injecting env (0) from .env -- tip: ⚙️  load multiple .env files with { path: ['.env.local', '.env'] }

=========== ADVANCED LIVE DEMO START ===========

Deployer / LP: 0x7b9398C448EDaF2d9948Cee1BaD3748b27e5bb34 


=================================
🚀 Fund Demo Wallet with USDC
=================================

   ➜ Deployer funded with 2000 USDC
   Balance: 4000 USDC


=================================
🚀 Deploy IdleLiquidityHookEnterprise
=================================

   ➜ Hook deployed
   Address: 0xF31D5D3f768eC505bdd164EcAd2B2085bAf69931 


=================================
🚀 Deploy MockAggregator for USDC
=================================

   ➜ MockAggregator set as USDC price feed

=================================
🚀 Configure Aave Strategy
=================================

   ➜ Aave strategy configured

=================================
🚀 LP Deposits Liquidity
=================================

   ➜ Position registered with 1000 USDC

=================================
🚀 Swap Pushes Position Out of Range
=================================

   ➜ Idle liquidity detected

=================================
🚀 Hook Moves Idle Liquidity To Aave
=================================

   ➜ Idle liquidity deposited to Aave
   Deposited: 0 USDC


=================================
🚀 Yield Accrues
=================================

   Simulated Yield: 0.0000 USDC


=================================
🚀 LP Claims Yield
=================================

   ➜ Yield claimed

=================================
🚀 LP Withdraws Liquidity
=================================

   ➜ Position closed

=========== DEMO COMPLETE ===========

lukman12@DESKTOP-K58EKDO:~/idleLiquidity-hook$ 

---

# 🔁 Example Flow

1️⃣ LP deposits liquidity
2️⃣ Trading volume drops
3️⃣ Hook detects **idle liquidity**
4️⃣ Liquidity temporarily deployed to yield strategy
5️⃣ When swaps resume → liquidity returns to pool

---

# 📊 Benefits

For Liquidity Providers:

• Earn **swap fees**
• Earn **yield during idle periods**

For DeFi:

• Better **capital efficiency**
• More **productive liquidity**

---

# 🔮 Future Improvements

• Multi-strategy routing
• Risk-adjusted yield allocation
• DAO-governed strategies
• Cross-chain liquidity optimization

---

# 🏆 Built For

**Uniswap Hookathon**

Demonstrating how hooks can transform AMMs into **intelligent liquidity engines**.

---

# 👨‍💻 Author

**Zakariyah Lukman**

---

# 📜 License

MIT
