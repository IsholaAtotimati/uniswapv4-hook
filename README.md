IdleLiquidityHookEnterprise Documentation
Overview

IdleLiquidityHookEnterprise is a smart contract for automated idle liquidity management in AMM pools. It allows LPs to:

Register positions with specific tick ranges.

Delegate idle liquidity to external vaults for yield.

Deregister positions safely while collecting accumulated yield.

Ensure gas-efficient and secure operations.
=================================================================
Architecture
Core Components

Position – Tracks LP liquidity, tick ranges, vault shares, idle state.

PoolConfig – Tracks pool-specific configurations (fee, vault, tick spacing).
=============================================================
Data Structures
---------------------------------------------------------------
 struct PositionInfo {
        // liquidity amount per side (0 -> currency0, 1 -> currency1)
        uint128 liquidity0;
        uint128 liquidity1;
        int24 lowerTick;
        int24 upperTick;
        bool isIdle;
        // vault shares per side
        uint256 vaultShares0;
        uint256 vaultShares1;
        // accumulated yield per side
        uint256 accumulatedYield0;
        uint256 accumulatedYield1;
        // Aave accounting per side
        uint256 aTokenPrincipal0;
        uint256 aTokenPrincipal1;
    }

    struct PoolConfig {
        AssetConfig[2] assets; // configuration for each pool side
        uint256 lpShareBP;
        uint256 protocolShareBP;
    }
    ===============================================
    consttructue
    ---------------------------
    constructor(address _poolManager)
    BaseHook(IPoolManager(_poolManager))
    Ownable()
    {}

    _poolManager – Reference to PoolManager contract controlling pools
Idle LPs – Addresses with delegated liquidity.
================================================================
Public Methods
--------------------------------------------
- `setPriceFeed(address asset, AggregatorV3Interface feed)` (owner-only) registers a Chainlink feed for an asset and emits `PriceFeedUpdated`.
- `getLatestPrice(address asset) public view returns (int256)` returns the last answer from the linked price feed (reverts if none).
- `getPositionValue(PoolId pid, address lp) external view returns (int256)` computes a simple value metric for an LP position using the configured feeds and liquidity per side. Typically used for analytics or dashboarding.

function registerPosition(
        PoolId pid,
        uint128 liquidity0,
        uint128 liquidity1,
        int24 lower,
        int24 upper
    ) external {
        PositionInfo storage pos = positions[pid][msg.sender];
        require(pos.liquidity0 == 0 && pos.liquidity1 == 0, "Already registered");
        require(lower < upper, "Invalid tick range");

        pos.liquidity0 = liquidity0;
        pos.liquidity1 = liquidity1;
        pos.lowerTick = lower;
        pos.upperTick = upper;
        pos.isIdle = false;
        pos.vaultShares0 = 0;
        pos.vaultShares1 = 0;
        pos.accumulatedYield0 = 0;
        pos.accumulatedYield1 = 0;
        pos.aTokenPrincipal0 = 0;
        pos.aTokenPrincipal1 = 0;

        emit PositionRegistered(msg.sender, pid, liquidity0, liquidity1);
    }
    function deregisterPosition(PoolId pid, PoolKey calldata key) external {
        PositionInfo storage pos = positions[pid][msg.sender];
        require(pos.liquidity0 > 0 || pos.liquidity1 > 0, "No position");

        // Only collect yield if LP is idle and has funds in vault/Aave
        if (
            pos.isIdle &&
            (pos.vaultShares0 > 0 || pos.vaultShares1 > 0 || pos.aTokenPrincipal0 > 0 || pos.aTokenPrincipal1 > 0)
        ) {
            _collectYield(pos, msg.sender, pid, key);
        }

        // Remove from idleLPs safely if LP is marked idle
        if (isIdleLP[pid][msg.sender]) {
            uint256 index = _findIdleIndex(pid, msg.sender);
            _removeIdleLP(pid, index);
        }

        // Delete position last to ensure yield collection works
        delete positions[pid][msg.sender];

        emit PositionDeregistered(msg.sender, pid);
    }
 


Vault – Optional external yield mechanism.
=============================================================

Event
---------------------------------------------------
event PositionRegistered(address indexed lp, PoolId indexed pid, uint128 liquidity0, uint128 liquidity1);
    event PositionDeregistered(address indexed lp, PoolId indexed pid);
    event PoolConfigUpdated(PoolId indexed pid, uint8 side, address asset, uint256 lpBP, uint256 protocolBP);
    event PriceFeedUpdated(address indexed asset, address feed);
    event LiquidityMovedToVault(address indexed lp, PoolId indexed pid, uint256 amount, uint256 shares);
    event YieldCollected(address indexed lp, PoolId indexed pid, uint256 lpYield, uint256 protocolYield);
    event LiquidityRedeployed(address indexed lp, PoolId indexed pid, uint256 amount)
============================================================
Local Development Command
------------------------------------------------
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run local node
npx hardhat node

# Deploy contracts locally
npx hardhat run scripts/deploy.js --network localhost

# Run all tests
npx hardhat test
========================================================

Security Considerations

Access Control: Only LPs can register/deregister positions.

Reentrancy: Yield collection happens before deletion of storage.

Input Validation: Tick ranges and liquidity validated.

Vault Safety: Validate external vault addresses before delegating liquidity.

Events: Always emit events to track position lifecycle.

Gas Optimization Strategies

Use uint128 for liquidity to reduce storage cost.

Minimize writes to storage; update only when necessary.

Idle LP array management via index swaps.

Defer yield collection until deregistration.
    
