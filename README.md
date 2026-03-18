
YieldPilot (formerly IdleLiquidityHook)

Maximizing LP capital efficiency in Uniswap v4 by automatically deploying idle liquidity into yield strategies.

🚨 Problem

In traditional AMMs:

Liquidity providers (LPs) only earn swap fees

Idle liquidity earns no yield during low trading volume

Result: Inefficient capital usage and lost yield opportunities.

💡 Solution

YieldPilot introduces a Uniswap v4 Hook that:

Detects idle liquidity

Deploys idle funds into a yield strategy (e.g., Aave, ERC4626 Vaults)

Returns liquidity instantly when trading resumes

LP Benefits:

Earn swap fees when active

Earn yield when idle

DeFi Benefits:

Improved capital efficiency

More productive liquidity

⚙️ How It Works

Hook Lifecycle

LP Adds Liquidity
        │
        ▼
Uniswap v4 Pool
        │
        ▼
YieldPilot Hook
        ├── If swaps happening → do nothing
        └── If idle liquidity detected → StrategyManager → Yield Protocol

Example Flow:

LP deposits liquidity

Trading volume drops

Hook detects idle liquidity

Funds temporarily deployed to yield strategy

Swaps resume → liquidity returns to pool

🧩 Architecture
User (LP)
   │
   ▼
Uniswap v4 Pool
   │
   ▼
YieldPilot Hook
   │
   ▼
StrategyManager
   │
   ▼
External Yield Protocol (Aave / ERC4626)
✨ Key Features

Automatic idle liquidity detection

Yield strategy integration

Modular strategy manager for multiple protocols

Improves LP capital efficiency

Built on Uniswap v4 Hooks architecture

📁 Project Structure
idleLiquidity-hook/
├── contracts/
│   ├── IdleLiquidityHook.sol
│   └── StrategyManager.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── IdleLiquidityHook.test.js
├── hardhat.config.js
├── package.json
└── README.md
⚡ Installation
git clone https://github.com/IsholaAtotimati/uniswapv4-hook.git
cd uniswapv4-hook
npm install
npx hardhat compile
npx hardhat test
🔗 Partner Integrations

Aave: Idle liquidity earns yield while positions are out of range

ERC4626 Vaults: Supports generic vault-based yield strategies

Chainlink Price Feeds: Verifies asset pricing to prevent oracle manipulation

🔮 Future Improvements

Multi-strategy routing

Risk-adjusted yield allocation

DAO-governed strategies

Cross-chain liquidity optimization

👨‍💻 Author

Zakariyah Lukman

📜 License

MIT
