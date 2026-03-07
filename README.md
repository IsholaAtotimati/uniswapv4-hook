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
        (Aave / Compound / etc)
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
```

---

# 🧪 Run Tests

```bash
npx hardhat test
```

---

# 🚀 Deploy Hook

Local deployment

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Deploy to testnet

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

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
