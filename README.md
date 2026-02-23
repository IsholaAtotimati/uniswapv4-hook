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
        uint128 liquidity;
        int24 lowerTick;
        int24 upperTick;
        uint256 vaultShares;
        uint256 accumulatedYield;
        bool isIdle;
    }

    struct PoolConfig {
        IERC4626 vault;
        // Aave integration
        ILendingPool lendingPool;
        IERC20 aToken;
        address asset;
        bool useAave;

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
function registerPosition(
        PoolId pid,
        uint128 liquidity,
        int24 lower,
        int24 upper
    ) external {
        require(positions[pid][msg.sender].liquidity == 0, "Already registered");
        require(lower < upper, "Invalid tick range");

        positions[pid][msg.sender] = PositionInfo({
            liquidity: liquidity,
            lowerTick: lower,
            upperTick: upper,
            vaultShares: 0,
            accumulatedYield: 0,
            isIdle: false
        });

        emit PositionRegistered(msg.sender, pid, liquidity);
    }
    function deregisterPosition(PoolId pid, PoolKey calldata key) external {
    PositionInfo storage pos = positions[pid][msg.sender];
    require(pos.liquidity > 0, "No position");

    // Only collect yield if LP has shares and vault is set
    if (pos.isIdle && pos.vaultShares > 0) {
        PoolConfig memory config = poolConfig[pid];
        if (address(config.vault) != address(0)) {
            _collectYield(pos, msg.sender, pid, key);
        }
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
event PositionRegistered(address indexed lp, PoolId indexed pid, uint128 liquidity);
    event PositionDeregistered(address indexed lp, PoolId indexed pid);
    event PoolConfigUpdated(PoolId indexed pid, address vault, uint256 lpBP, uint256 protocolBP);
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
    
