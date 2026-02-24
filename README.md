IdleLiquidityHookEnterprise

A Uniswap v4 Hook for automatically managing idle liquidity and optimizing yield.

Table of Contents

Overview

Problem

Solution

Architecture

How It Works

Security Considerations

Deployment

Testing & Deployment Commands

Usage

Future Improvements

License

Overview

Uniswap v4 allows custom hooks to extend pool behavior.
IdleLiquidityHookEnterprise automatically:

Detects idle LP positions.

Moves idle liquidity into yield-bearing ERC4626 vaults or Aave lending pools.

Collects and distributes yield between LPs and the protocol.

Redeploys liquidity automatically when positions become active again.

Problem

Liquidity providers often have idle positions due to price ranges, losing potential yield.
Manual management is error-prone and inefficient.

Solution

IdleLiquidityHookEnterprise offers:

Automated idle detection for LP positions.

Dynamic yield allocation via ERC4626 vaults or Aave.

Protocol fee split between LPs and the protocol owner.

Automatic redeployment of liquidity when positions return in-range.

Architecture

Core Components:

PositionInfo – Tracks per-LP data: liquidity, tick range, idle status, accumulated yield, vault shares, and Aave principal.

PoolConfig – Configures vault or Aave integration per pool; sets LP and protocol fee splits.

Idle LP Management – Tracks and updates idle LPs safely per pool.

Hooks Integration – Implements the afterSwap hook to trigger idle detection, vault deposit, yield collection, and liquidity redeployment.

How It Works

Register a Position

LPs register their positions:

idleHook.registerPosition(pid, liquidity, lowerTick, upperTick);

Monitor Pool Swaps

The afterSwap hook handles idle detection and redeployment:

_afterSwap(...) internal override {
    _updateIdlePositions(pid, key, currentTick);
}

Yield Collection

ERC4626 Vaults: yield = assets - principal

Aave: yield = aToken balance - total principal

LPs receive their share; protocol receives the remainder

Redeploy Liquidity

_redeployLiquidity(pos, lp, key);

Withdraws from vault/Aave and re-adds liquidity to the pool.

Security Considerations

ReentrancyGuard protects sensitive functions.

SafeERC20 ensures secure token transfers.

OnlyOwner restricts pool configuration updates.

Backward iteration for safe idle LP removal.

Yield is collected before deregistering positions.

Deployment

Designed for Arbitrum Sepolia or compatible testnets.

Constructor requires the Uniswap v4 IPoolManager address:

IdleLiquidityHookEnterprise idleHook = new IdleLiquidityHookEnterprise(poolManagerAddress);

Configure pools:

// ERC4626 vault
idleHook.setPoolConfigVault(pid, vaultAddress, lpBP, protocolBP);

// Aave
idleHook.setPoolConfigAave(pid, lendingPool, aToken, asset, lpBP, protocolBP);
Testing & Deployment Commands

Hardhat Testing

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run a specific test file
npx hardhat test test/IdleLiquidityHookEnterprise.test.js

Deployment to Arbitrum Sepolia

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network arbitrumSepolia

(Ensure your hardhat.config.js has Arbitrum Sepolia RPC and private key configured.)

Usage

Register a position – LP registers liquidity and tick range.

Claim yield – LP claims accumulated yield from idle periods:

idleHook.claimYield(pid, key);

Deregister a position – LP removes the position and collects pending yield:

idleHook.deregisterPosition(pid, key);
Future Improvements

Multi-token vault support.

Dynamic fee splitting based on LP activity.

Analytics for LP yield reporting.

Gas optimizations for large-scale LP management.

License

This project is licensed under the MIT License.
