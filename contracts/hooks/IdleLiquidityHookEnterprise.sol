
// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {BaseHook} from "../periphery/base/hooks/BaseHook.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Minimal Aave LendingPool interface used by this hook.
interface ILendingPool {
    function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

contract IdleLiquidityHookEnterprise is BaseHook, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;


    uint256 public constant TOTAL_BP = 10000;

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

    mapping(PoolId => mapping(address => PositionInfo)) public positions;
    mapping(PoolId => PoolConfig) public poolConfig;

    mapping(PoolId => address[]) private idleLPs;
    mapping(PoolId => mapping(address => bool)) private isIdleLP;

    event PositionRegistered(address indexed lp, PoolId indexed pid, uint128 liquidity);
    event PositionDeregistered(address indexed lp, PoolId indexed pid);
    event PoolConfigUpdated(PoolId indexed pid, address vault, uint256 lpBP, uint256 protocolBP);
    event LiquidityMovedToVault(address indexed lp, PoolId indexed pid, uint256 amount, uint256 shares);
    event YieldCollected(address indexed lp, PoolId indexed pid, uint256 lpYield, uint256 protocolYield);
    event LiquidityRedeployed(address indexed lp, PoolId indexed pid, uint256 amount);

    // constructor(IPoolManager _manager) BaseHook(_manager) {}
    constructor(address _poolManager)
    BaseHook(IPoolManager(_poolManager))
    Ownable()
    {}
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override nonReentrant returns (bytes4, int128) {
        PoolId pid = key.toId();
        (, int24 currentTick,,) = StateLibrary.getSlot0(poolManager, pid);
        _updateIdlePositions(pid, key, currentTick);
        return (this.afterSwap.selector, int128(0));
    }

    /// @notice iterate backward for safe removal
    function _updateIdlePositions(PoolId pid, PoolKey calldata key, int24 currentTick) internal {
        address[] storage lps = idleLPs[pid];
        for (int256 i = int256(lps.length) - 1; i >= 0; i--) {
            address lp = lps[uint256(i)];
            PositionInfo storage pos = positions[pid][lp];
            bool outOfRange = currentTick < pos.lowerTick || currentTick > pos.upperTick;

            if (outOfRange && !pos.isIdle) {
                _moveToVault(pos, lp, pid, key);
                pos.isIdle = true;
                _addIdleLP(pid, lp);
            } else if (!outOfRange && pos.isIdle) {
                _collectYield(pos, lp, pid, key);
                _redeployLiquidity(pos, lp, key);
                pos.isIdle = false;
                pos.accumulatedYield = 0;
                _removeIdleLP(pid, uint256(i));
            }
        }
    }

    function _moveToVault(PositionInfo storage pos, address lp, PoolId pid, PoolKey calldata key) internal {
        if (pos.liquidity == 0) return;
        PoolConfig memory config = poolConfig[pid];
        IERC20 token = IERC20(Currency.unwrap(key.currency0));

        if (config.useAave) {
            // deposit into Aave lending pool
            require(address(config.lendingPool) != address(0), "Aave lending pool not set");
            // approve lending pool to pull the token
            if (token.allowance(address(this), address(config.lendingPool)) < pos.liquidity) {
                token.safeApprove(address(config.lendingPool), 0);
                token.safeApprove(address(config.lendingPool), type(uint256).max);
            }

            config.lendingPool.deposit(config.asset, pos.liquidity, address(this), 0);
            // store the deposited amount (repurposing vaultShares)
            pos.vaultShares = pos.liquidity;
            emit LiquidityMovedToVault(lp, pid, pos.liquidity, pos.vaultShares);
        } else {
            // approve only if needed for ERC4626 vault
            if (token.allowance(address(this), address(config.vault)) < pos.liquidity) {
                token.safeApprove(address(config.vault), 0);
                token.safeApprove(address(config.vault), type(uint256).max);
            }

            uint256 shares = config.vault.deposit(pos.liquidity, address(this));
            pos.vaultShares = shares;
            emit LiquidityMovedToVault(lp, pid, pos.liquidity, shares);
        }
    }

    function _collectYield(
    PositionInfo storage pos,
    address lp,
    PoolId pid,
    PoolKey calldata key
) internal {
    if (pos.liquidity == 0) return; // ✅ ADD THI
        if (pos.vaultShares == 0) return;

        PoolConfig memory config = poolConfig[pid];

        IERC20 token = IERC20(Currency.unwrap(key.currency0));

        if (config.useAave) {
            // Aave flow: compute total assets using aToken balance
            if (address(config.aToken) == address(0)) return;
            uint256 totalAssets = config.aToken.balanceOf(address(this));
            if (totalAssets == 0) return;

            uint256 lpYield = (totalAssets * config.lpShareBP) / TOTAL_BP;
            uint256 protocolYield = totalAssets - lpYield;

            pos.accumulatedYield += lpYield;

            if (protocolYield > 0) {
                // withdraw protocol share directly to owner
                config.lendingPool.withdraw(config.asset, protocolYield, owner());
            }

            emit YieldCollected(lp, pid, lpYield, protocolYield);
        } else {
            // ERC4626 vault flow (existing behaviour)
            if (address(config.vault) == address(0)) return;
            uint256 totalAssets = config.vault.previewWithdraw(pos.vaultShares);
            if (totalAssets == 0) return;

            uint256 lpYield = (totalAssets * config.lpShareBP) / TOTAL_BP;
            uint256 protocolYield = totalAssets - lpYield;

            pos.accumulatedYield += lpYield;

            if (protocolYield > 0) {
                token.safeTransfer(owner(), protocolYield);
            }

            emit YieldCollected(lp, pid, lpYield, protocolYield);
        }
}

    function _redeployLiquidity(PositionInfo storage pos, address lp, PoolKey calldata key) internal {
        PoolId pid = key.toId();
        PoolConfig memory config = poolConfig[pid];

        if (pos.vaultShares == 0) return;

        if (config.useAave) {
            // withdraw the deposited principal back to this contract
            config.lendingPool.withdraw(config.asset, pos.vaultShares, address(this));
            pos.vaultShares = 0;
        } else {
            config.vault.withdraw(pos.vaultShares, address(this), address(this));
            pos.vaultShares = 0;
        }

        ModifyLiquidityParams memory params = ModifyLiquidityParams({
            tickLower: pos.lowerTick,
            tickUpper: pos.upperTick,
            liquidityDelta: int256(uint256(pos.liquidity)),
            salt: bytes32(0)
        });

        poolManager.modifyLiquidity(key, params, "");
        emit LiquidityRedeployed(lp, pid, pos.liquidity);
    }

    function claimYield(PoolId pid, PoolKey calldata key) external nonReentrant {
        PositionInfo storage pos = positions[pid][msg.sender];
        if (pos.liquidity == 0) return;
        uint256 yield = pos.accumulatedYield;
        pos.accumulatedYield = 0;

        IERC20 token = IERC20(Currency.unwrap(key.currency0));
        token.safeTransfer(msg.sender, yield);
    }

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
 
    function setPoolConfigVault(PoolId pid, IERC4626 _vault, uint256 lpBP, uint256 protocolBP) external onlyOwner {
        require(lpBP + protocolBP == TOTAL_BP, "Invalid fee split");
        poolConfig[pid].vault = _vault;
        poolConfig[pid].lpShareBP = lpBP;
        poolConfig[pid].protocolShareBP = protocolBP;
        poolConfig[pid].useAave = false;
        emit PoolConfigUpdated(pid, address(_vault), lpBP, protocolBP);
    }

    function setPoolConfigAave(
        PoolId pid,
        ILendingPool _lendingPool,
        IERC20 _aToken,
        address _asset,
        uint256 lpBP,
        uint256 protocolBP
    ) external onlyOwner {
        require(lpBP + protocolBP == TOTAL_BP, "Invalid fee split");
        poolConfig[pid].lendingPool = _lendingPool;
        poolConfig[pid].aToken = _aToken;
        poolConfig[pid].asset = _asset;
        poolConfig[pid].lpShareBP = lpBP;
        poolConfig[pid].protocolShareBP = protocolBP;
        poolConfig[pid].useAave = true;
        emit PoolConfigUpdated(pid, _asset, lpBP, protocolBP);
    }

    function _addIdleLP(PoolId pid, address lp) internal {
        if (!isIdleLP[pid][lp]) {
            idleLPs[pid].push(lp);
            isIdleLP[pid][lp] = true;
        }
    }

    function _removeIdleLP(PoolId pid, uint256 index) internal {
        address[] storage list = idleLPs[pid];
        if (index >= list.length) return;

        address removed = list[index];
        address last = list[list.length - 1];

        list[index] = last;
        list.pop();

        isIdleLP[pid][removed] = false;
        if (index != list.length) {
            isIdleLP[pid][last] = true;
        }
    }

    function _findIdleIndex(PoolId pid, address lp) internal view returns (uint256) {
        address[] storage list = idleLPs[pid];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == lp) return i;
        }
        revert("LP not found");
    }
}