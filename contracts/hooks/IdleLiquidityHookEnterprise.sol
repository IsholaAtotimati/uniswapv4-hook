// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta, SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {BaseHook} from "../periphery/base/hooks/BaseHook.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {AggregatorV3Interface} from "../interfaces/AggregatorV3Interface.sol";
import {Position, AssetConfig, PoolConfig, Status, Strategy} from "../libraries/IdleLiquidityTypes.sol";
import {IdleLiquidityHelpers} from "../helpers/IdleLiquidityHelpers.sol";
import {YieldManager} from "./YieldManager.sol";
import {OracleManager} from "./OracleManager.sol";
import {PositionManager} from "./PositionManager.sol";
import {VaultAdapter} from "./VaultAdapter.sol";
import {AaveAdapter} from "./AaveAdapter.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// optional extra helper available on testing config or extended pool managers
interface IPoolManagerExtra {
    function getPositionLiquidity(
        PoolId pid,
        address owner,
        int24 lower,
        int24 upper
    ) external view returns (uint128);
}

contract IdleLiquidityHookEnterprise is BaseHook, ReentrancyGuard, Ownable {
    // Store PoolKey for each PoolId for future integration
    mapping(PoolId => PoolKey) public poolKeys;

    // Oracle safety config (now in OracleManager)
    // TEST-ONLY: helper to set needUpdate for rebalance tests
    bool public emergencyPaused;

    event EmergencyPaused(bool paused);

    modifier notPaused() {
        require(!emergencyPaused, "paused");
        _;
    }

     function setEmergencyPaused(bool paused) external onlyOwner {
        emergencyPaused = paused;
        emit EmergencyPaused(paused);
    }

    /// @notice Emergency withdraw any ERC20 token to owner
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function testMarkNeedUpdate(PoolId pid) external {
        needUpdate[pid] = true;
    }

    /// @notice TEST-ONLY: adjust tick range of an existing position without
    /// deregistering.  Useful for unit tests to simulate a position moving
    /// back into range so that funds can be withdrawn from a strategy.
    function testSetPositionRange(
        PoolId pid,
        address lp,
        int24 lower,
        int24 upper
    ) external {
        Position storage pos = positions[pid][lp];
        require(pos.liquidity0 != 0 || pos.liquidity1 != 0, "no position");
        pos.lowerTick = lower;
        pos.upperTick = upper;
    }

    event DebugAssetSet(PoolId indexed pid, uint8 side, address asset);
    event DebugClaimYieldAssets(PoolId indexed pid, address asset0, address asset1);
    event DebugPoolId(bytes32 pidBytes);

    function _pidToBytes32(PoolId pid) internal pure returns (bytes32) {
        return PoolId.unwrap(pid);
    }

    mapping(PoolId => address[]) public trackedLPs;
    mapping(PoolId => uint256) public lastRebalanceBlock;
    uint256 public constant TOTAL_BP = 10000;
    uint256 public constant REBALANCE_BLOCK_DELAY = 10;

        /// @notice Returns the list of tracked LPs for a given poolId (for testing/invariant purposes)
        function getTrackedLPs(bytes32 poolId) external view returns (address[] memory) {
            return trackedLPs[PoolId.wrap(poolId)];
        }
    // Helper: range detection
    function isOutOfRange(int24 currentTick, int24 lower, int24 upper) public pure returns (bool) {
        return IdleLiquidityHelpers.isOutOfRange(currentTick, lower, upper);
    }
    // Helper: get current tick from PoolManager
    function getCurrentTick(PoolId pid) public view returns (int24) {
        (, int24 currentTick, , ) = StateLibrary.getSlot0(poolManager, pid);
        return currentTick;
    }

    using SafeERC20 for IERC20;

    // enum Strategy { NONE, ERC4626, AAVE } // Move to types if needed

    mapping(address => AggregatorV3Interface) public priceFeed;
    mapping(address => int256) public lastGoodPrice;
        // --- ORACLE SAFETY HELPERS ---
        // Use OracleManager for price safety
        function _getSafePrice(address asset) internal view returns (int256 price, uint256 updatedAt) {
            return OracleManager.getSafePrice(priceFeed, asset);
        }

        function _checkPriceDeviation(address asset, int256 refPrice) internal view {
            OracleManager.checkPriceDeviation(priceFeed, asset, refPrice);
        }
    mapping(PoolId => PoolConfig) public poolConfig;

    // per-pool state for index-based accounting
    mapping(PoolId => uint256[2]) public globalYieldIndex;
    mapping(PoolId => uint256[2]) public totalIdleLiquidity;
    mapping(PoolId => uint256) public lastYieldUpdate;

    // track principals for Aave/ERC4626
    mapping(PoolId => uint256[2]) public totalATokenPrincipal;
    mapping(PoolId => uint256[2]) public totalVaultShares;

    // positions by pool/user
    mapping(PoolId => mapping(address => Position)) public positions;

    event PositionRegistered(address indexed lp, PoolId indexed pid, uint128 liquidity0, uint128 liquidity1);
    event PositionDeregistered(address indexed lp, PoolId indexed pid);
    event PoolConfigUpdated(PoolId indexed pid, uint8 side, address asset, uint256 lpBP, uint256 protocolBP);
    event PriceFeedUpdated(address indexed asset, address feed);
    event LiquidityMovedToVault(address indexed lp, PoolId indexed pid, uint256 amount, uint256 shares);
    event YieldCollected(address indexed lp, PoolId indexed pid, uint8 side, uint256 lpYield, uint256 protocolYield);
    event LiquidityRedeployed(address indexed lp, PoolId indexed pid, uint256 amount);
    event PositionProcessed(address indexed lp, PoolId indexed pid, Status newStatus);

    constructor(address _poolManager) BaseHook(IPoolManager(_poolManager)) Ownable() {}

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

    // --- SWAP HOOK -----------------------------------------------------------
    // --- HOOK EXECUTION REMOVED ---
    // Instead of updating yield directly, mark pool for update
    mapping(PoolId => bool) public needUpdate;

    function _afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) internal override nonReentrant returns (bytes4, int128) {
        PoolId pid = key.toId();
        markNeedUpdate(pid);
        return (this.afterSwap.selector, int128(0));
    }

    function markNeedUpdate(PoolId pid) internal {
        needUpdate[pid] = true;
    }

    /// @notice Only this function interacts with Aave/vaults
    // Redesign: rebalance a batch of LPs for a pool, bounded by maxBatch
    /// @notice Rebalance a batch of LPs for a pool. Use getTrackedLPCount() to determine total LPs and call in batches.
    uint256 public rebalanceRewardETH;
    event RebalanceRewardPaid(address indexed caller, uint256 amount);

    function setRebalanceRewardETH(uint256 amount) external onlyOwner {
        rebalanceRewardETH = amount;
    }

    function rebalance(PoolId pid, uint256 start, uint256 maxBatch) external nonReentrant {
        require(needUpdate[pid], "no update needed");
        require(maxBatch > 0 && maxBatch <= 50, "maxBatch out of bounds");
        needUpdate[pid] = false;
        address[] storage lps = trackedLPs[pid];
        uint256 n = lps.length;
        require(start < n, "start out of bounds");
        uint256 end = start + maxBatch;
        if (end > n) end = n;
        int24 tick = getCurrentTick(pid);
        for (uint256 i = start; i < end; i++) {
            _rebalanceSingleLP(pid, lps[i], tick);
        }
        // Pay reward to caller if set and contract has enough ETH
        uint256 reward = rebalanceRewardETH;
        if (reward > 0 && address(this).balance >= reward) {
            (bool sent, ) = msg.sender.call{value: reward}("");
            if (sent) emit RebalanceRewardPaid(msg.sender, reward);
        }
    }

    // Internal: rebalance a single LP for a pool
    function _rebalanceSingleLP(PoolId pid, address lp, int24 tick) internal {
        PoolConfig storage config = poolConfig[pid];
        Position storage pos = positions[pid][lp];
        bool outOfRange = isOutOfRange(tick, pos.lowerTick, pos.upperTick);
        if (outOfRange && pos.status == Status.ACTIVE) {
            for (uint8 side = 0; side < 2; side++) {
                _rebalanceSideDeposit(pid, lp, side, config, pos);
            }
            pos.status = Status.IDLE;
        } else if (!outOfRange && pos.status == Status.IDLE) {
            for (uint8 side = 0; side < 2; side++) {
                _rebalanceSideWithdraw(pid, lp, side, config, pos);
            }
            pos.status = Status.ACTIVE;
        }
    }

    function _rebalanceSideDeposit(
        PoolId pid,
        address lp,
        uint8 side,
        PoolConfig storage config,
        Position storage pos
    ) private {
        AssetConfig storage aconf = config.assets[side];
        uint128 liq = side == 0 ? pos.liquidity0 : pos.liquidity1;
        if (liq == 0) return;
        address asset = aconf.asset;
        // oracle check; ignore returned price
        _getSafePrice(asset);
        int256 refPrice = lastGoodPrice[asset];
        if (refPrice > 0) _checkPriceDeviation(asset, refPrice);
        if (aconf.strategy == Strategy.ERC4626) {
            IERC20(asset).safeApprove(address(aconf.vault), liq);
            uint256 shares = aconf.vault.deposit(liq, address(this));
            totalVaultShares[pid][side] += shares;
            if (side == 0) pos.vaultShares0 += shares;
            else pos.vaultShares1 += shares;
            emit LiquidityMovedToVault(lp, pid, liq, shares);
        } else if (aconf.strategy == Strategy.AAVE) {
            IERC20(asset).safeApprove(address(aconf.lendingPool), liq);
            aconf.lendingPool.deposit(asset, liq, address(this), 0);
            totalATokenPrincipal[pid][side] += liq;
            if (side == 0) pos.aTokenPrincipal0 += liq;
            else pos.aTokenPrincipal1 += liq;
            emit LiquidityMovedToVault(lp, pid, liq, liq);
        }
    }

    function _rebalanceSideWithdraw(
        PoolId pid,
        address lp,
        uint8 side,
        PoolConfig storage config,
        Position storage pos
    ) private {
        AssetConfig storage aconf = config.assets[side];
        uint128 liq = side == 0 ? pos.liquidity0 : pos.liquidity1;
        if (liq == 0) return;
        address asset = aconf.asset;
        // no need for the price variable, only ensure call succeeds
        _getSafePrice(asset);
        int256 refPrice = lastGoodPrice[asset];
        if (refPrice > 0) _checkPriceDeviation(asset, refPrice);
        if (aconf.strategy == Strategy.ERC4626) {
            uint256 shares = side == 0 ? pos.vaultShares0 : pos.vaultShares1;
            if (shares > 0) {
                uint256 assets = aconf.vault.redeem(shares, address(this), address(this));
                totalVaultShares[pid][side] -= shares;
                if (side == 0) pos.vaultShares0 = 0;
                else pos.vaultShares1 = 0;
                emit LiquidityRedeployed(lp, pid, assets);
            }
        } else if (aconf.strategy == Strategy.AAVE) {
            uint256 principal = side == 0 ? pos.aTokenPrincipal0 : pos.aTokenPrincipal1;
            if (principal > 0) {
                uint256 withdrawn = aconf.lendingPool.withdraw(aconf.asset, principal, address(this));
                totalATokenPrincipal[pid][side] -= principal;
                if (side == 0) pos.aTokenPrincipal0 = 0;
                else pos.aTokenPrincipal1 = 0;
                emit LiquidityRedeployed(lp, pid, withdrawn);
            }
        }
    }

    // --- INDEX HELPERS ------------------------------------------------------
    function _updateGlobalIndex(PoolId pid, uint8 side, uint256 yieldAmount) internal {
        YieldManager.updateGlobalIndex(globalYieldIndex, totalIdleLiquidity, pid, side, yieldAmount);
    }

    function _updateGlobalYield(PoolId pid) internal {
        if (lastYieldUpdate[pid] == block.number) return;
        lastYieldUpdate[pid] = block.number;
        PoolConfig memory config = poolConfig[pid];
        for (uint8 side = 0; side < 2; side++) {
            AssetConfig memory aconf = config.assets[side];
            if (aconf.strategy == Strategy.NONE) continue;
            uint256 totalLiq = totalIdleLiquidity[pid][side];
            if (totalLiq == 0) continue;
            // Safety: Validate oracle price, staleness, deviation
            address asset = aconf.asset;
            if (asset != address(0)) {
                // fetch price to enforce oracle constraints; value not required here
                _getSafePrice(asset);
                int256 refPrice = lastGoodPrice[asset];
                if (refPrice > 0) _checkPriceDeviation(asset, refPrice);
            }
            if (aconf.strategy == Strategy.AAVE) {
                uint256 totalAssets;
                try aconf.aToken.balanceOf(address(this)) returns (uint256 bal) {
                    totalAssets = bal;
                } catch {
                    continue;
                }
                uint256 totalPrincipal = totalATokenPrincipal[pid][side];
                if (totalAssets > totalPrincipal) {
                    uint256 totalYield = totalAssets - totalPrincipal;
                    uint256 lpYield = (totalYield * poolConfig[pid].lpShareBP) / TOTAL_BP;
                    uint256 protocolYield = totalYield - lpYield;
                    _updateGlobalIndex(pid, side, lpYield);
                    if (protocolYield > 0) {
                        try aconf.lendingPool.withdraw(aconf.asset, protocolYield, owner()) {} catch {}
                    }
                }
            } else if (aconf.strategy == Strategy.ERC4626) {
                uint256 shares = totalVaultShares[pid][side];
                if (shares == 0) continue;
                uint256 totalAssets;
                try aconf.vault.previewWithdraw(shares) returns (uint256 assets) {
                    totalAssets = assets;
                } catch {
                    continue;
                }
                uint256 totalPrincipal = totalLiq;
                if (totalAssets > totalPrincipal) {
                    uint256 totalYield = totalAssets - totalPrincipal;
                    uint256 lpYield = (totalYield * poolConfig[pid].lpShareBP) / TOTAL_BP;
                    uint256 protocolYield = totalYield - lpYield;
                    _updateGlobalIndex(pid, side, lpYield);
                    if (protocolYield > 0) {
                        IERC20(aconf.asset).safeTransfer(owner(), protocolYield);
                    }
                }
            }
        }
    }

    function _accruePositionYield(Position storage pos, PoolId pid, uint8 side) internal returns (uint256) {
        return YieldManager.accruePositionYield(globalYieldIndex, pos, pid, side);
    }

    /// @notice owner-only helper to bump the global index (testing)
    function addGlobalYield(PoolId pid, uint8 side, uint256 yieldAmount) external onlyOwner {
        _updateGlobalIndex(pid, side, yieldAmount);
    }

    // --- POSITION ACTIONS ---------------------------------------------------

    function registerPosition(
        PoolId pid,
        uint128 liquidity0,
        uint128 liquidity1,
        int24 lower,
        int24 upper
    ) external {
        require(verifyPositionOwnership(pid, msg.sender, lower, upper), "not position owner");
        PositionManager.registerPosition(positions, trackedLPs, globalYieldIndex, totalIdleLiquidity, pid, msg.sender, liquidity0, liquidity1, lower, upper);
        // Initialize yield indices to avoid overflow on first accrual
        Position storage pos = positions[pid][msg.sender];
        pos.lastYieldIndex0 = globalYieldIndex[pid][0];
        pos.lastYieldIndex1 = globalYieldIndex[pid][1];
        emit PositionRegistered(msg.sender, pid, liquidity0, liquidity1);
    }

    function deregisterPosition(PoolId pid) external {
        Position storage pos = positions[pid][msg.sender];
        require(pos.liquidity0 != 0 || pos.liquidity1 != 0, "no pos");
        require(verifyPositionOwnership(pid, msg.sender, pos.lowerTick, pos.upperTick), "not position owner");
        _updateGlobalYield(pid);
        uint256 y0 = _accruePositionYield(pos, pid, 0);
        uint256 y1 = _accruePositionYield(pos, pid, 1);
        pos.accumulatedYield0 += y0;
        pos.accumulatedYield1 += y1;
        delete positions[pid][msg.sender];
        emit PositionDeregistered(msg.sender, pid);
    }

    function processPosition(PoolId pid, address lp) external nonReentrant {
        Position storage pos = positions[pid][lp];
        require(pos.status != Status.FAILED, "position failed");
        _updateGlobalYield(pid);
        uint256 y0 = _accruePositionYield(pos, pid, 0);
        uint256 y1 = _accruePositionYield(pos, pid, 1);
        if (y0 > 0) pos.accumulatedYield0 += y0;
        if (y1 > 0) pos.accumulatedYield1 += y1;
        emit PositionProcessed(lp, pid, pos.status);
    }

    function claimYield(PoolId pid) external nonReentrant {
        Position storage pos = positions[pid][msg.sender];
        require(pos.status != Status.FAILED, "position failed");
        _updateGlobalYield(pid);
        uint256 y0 = pos.accumulatedYield0;
        uint256 y1 = pos.accumulatedYield1;
        pos.accumulatedYield0 = 0;
        pos.accumulatedYield1 = 0;
        address asset0 = poolConfig[pid].assets[0].asset;
        address asset1 = poolConfig[pid].assets[1].asset;
        emit DebugClaimYieldAssets(pid, asset0, asset1);
        require(asset0 != address(0), "asset0 not set");
        require(asset1 != address(0) || y1 == 0, "asset1 not set");
        if (y0 > 0) IERC20(asset0).safeTransfer(msg.sender, y0);
        if (y1 > 0) IERC20(asset1).safeTransfer(msg.sender, y1);
        if (y0 > 0) emit YieldCollected(msg.sender, pid, 0, y0, 0);
        if (y1 > 0) emit YieldCollected(msg.sender, pid, 1, y1, 0);
    }


    // --- CONFIGURATION HELPERS ---------------------------------------------------

    /// @notice Set ERC4626 vault for a pool side
    function setPoolConfigVault(
        PoolId pid,
        uint8 side,
        address asset,
        address vault,
        uint256 lpShareBP,
        uint256 protocolShareBP
    ) external onlyOwner {
        emit DebugPoolId(_pidToBytes32(pid));
        emit DebugAssetSet(pid, side, asset);
        emit DebugClaimYieldAssets(pid, poolConfig[pid].assets[0].asset, poolConfig[pid].assets[1].asset);
            emit DebugPoolId(_pidToBytes32(pid));
        require(asset != address(0), "zero asset");
        require(vault != address(0), "zero vault");
        require(side < 2, "side");
        AssetConfig storage ac = poolConfig[pid].assets[side];
        ac.vault = IERC4626(vault);
        ac.lendingPool = ILendingPool(address(0));
        ac.aToken = IERC20(address(0));
        ac.asset = asset;
        ac.strategy = Strategy.ERC4626;
        poolConfig[pid].lpShareBP = lpShareBP;
        poolConfig[pid].protocolShareBP = protocolShareBP;
        emit PoolConfigUpdated(pid, side, asset, lpShareBP, protocolShareBP);
        emit DebugAssetSet(pid, side, asset);
        emit DebugClaimYieldAssets(pid, poolConfig[pid].assets[0].asset, poolConfig[pid].assets[1].asset);
    }

    /// @notice Set Aave config for a pool side
    function setPoolConfigAave(
        PoolId pid,
        uint8 side,
        address asset,
        address lendingPool,
        address aToken,
        uint256 lpShareBP,
        uint256 protocolShareBP
    ) external onlyOwner {
        require(asset != address(0), "zero asset");
        require(lendingPool != address(0), "zero lendingPool");
        require(aToken != address(0), "zero aToken");
        require(side < 2, "side");
        poolConfig[pid].assets[side] = AssetConfig({
            vault: IERC4626(address(0)),
            lendingPool: ILendingPool(lendingPool),
            aToken: IERC20(aToken),
            asset: asset,
            strategy: Strategy.AAVE
        });
        poolConfig[pid].lpShareBP = lpShareBP;
        poolConfig[pid].protocolShareBP = protocolShareBP;
        emit PoolConfigUpdated(pid, side, asset, lpShareBP, protocolShareBP);
    }

    /// @notice Set price feed for an asset
    function setPriceFeed(address asset, address feed) external onlyOwner {
        require(asset != address(0), "zero asset");
        require(feed != address(0), "zero feed");
        priceFeed[asset] = AggregatorV3Interface(feed);
        // Save last good price for deviation checks
        (, int256 price,, uint256 updated,) = AggregatorV3Interface(feed).latestRoundData();
        // ensure `updated` is not in the future before subtracting to avoid underflow
        if (price > 0 && updated <= block.timestamp && block.timestamp - updated <= OracleManager.ORACLE_MAX_DELAY) {
            lastGoodPrice[asset] = price;
        }
        emit PriceFeedUpdated(asset, feed);
    }


    /// @notice Get latest price from Chainlink feed for an asset
    function getLatestPrice(address asset) public view returns (int256) {
        (int256 price, ) = _getSafePrice(asset);
        return price;
    }

    /// @notice Returns the value of a user's position in the pool using price feeds
    function getPositionValue(PoolId pid, address lp) public view returns (uint256) {
        Position memory pos = positions[pid][lp];
        PoolConfig storage config = poolConfig[pid];
        uint256 value = 0;
        for (uint8 side = 0; side < 2; side++) {
            address asset = config.assets[side].asset;
            if (asset == address(0)) continue;
            (int256 price, ) = _getSafePrice(asset);
            uint128 liq = side == 0 ? pos.liquidity0 : pos.liquidity1;
            if (price > 0) {
                value += uint256(liq) * uint256(uint256(price));
            }
        }
        return value;
    }

    /// @notice import a single position from an old hook during migration
    /// @dev owner only, expects caller to have read off-chain state
    function importPosition(
        PoolId pid,
        address lp,
        uint128 liquidity0,
        uint128 liquidity1,
        int24 lower,
        int24 upper,
        Status status,
        uint256 acc0,
        uint256 acc1
    ) external onlyOwner {
        Position storage pos = positions[pid][lp];
        require(pos.liquidity0 == 0 && pos.liquidity1 == 0, "already imported");
        pos.liquidity0 = liquidity0;
        pos.liquidity1 = liquidity1;
        pos.lowerTick = lower;
        pos.upperTick = upper;
        pos.status = status;
        pos.accumulatedYield0 = acc0;
        pos.accumulatedYield1 = acc1;
        // ensure indexes start current so user doesn't accidentally earn old yield
        pos.lastYieldIndex0 = globalYieldIndex[pid][0];
        pos.lastYieldIndex1 = globalYieldIndex[pid][1];

        if (status == Status.IDLE) {
            totalIdleLiquidity[pid][0] += liquidity0;
            totalIdleLiquidity[pid][1] += liquidity1;
        }

        emit PositionRegistered(lp, pid, liquidity0, liquidity1);
    }


    struct ImportPositionParams {
        address lp;
        uint128 liquidity0;
        uint128 liquidity1;
        int24 lower;
        int24 upper;
        Status status;
        uint256 acc0;
        uint256 acc1;
    }

    /// @notice batch-import multiple positions (gas efficient, avoids stack too deep)
    function importPositionsBatch(
        PoolId pid,
        ImportPositionParams[] calldata params
    ) external onlyOwner {
        uint256 n = params.length;
        for (uint256 i = 0; i < n; i++) {
            _importPositionBatchHelper(
                pid,
                params[i].lp,
                params[i].liquidity0,
                params[i].liquidity1,
                params[i].lower,
                params[i].upper,
                params[i].status,
                params[i].acc0,
                params[i].acc1
            );
        }
    }

    function _importPositionBatchHelper(
        PoolId pid,
        address lp,
        uint128 liquidity0,
        uint128 liquidity1,
        int24 lower,
        int24 upper,
        Status status,
        uint256 acc0,
        uint256 acc1
    ) private {
        Position storage pos = positions[pid][lp];
        require(pos.liquidity0 == 0 && pos.liquidity1 == 0, "already imported");
        pos.liquidity0 = liquidity0;
        pos.liquidity1 = liquidity1;
        pos.lowerTick = lower;
        pos.upperTick = upper;
        pos.status = status;
        pos.accumulatedYield0 = acc0;
        pos.accumulatedYield1 = acc1;
        // ensure indexes start current so user doesn't accidentally earn old yield
        pos.lastYieldIndex0 = globalYieldIndex[pid][0];
        pos.lastYieldIndex1 = globalYieldIndex[pid][1];

        if (status == Status.IDLE) {
            totalIdleLiquidity[pid][0] += liquidity0;
            totalIdleLiquidity[pid][1] += liquidity1;
        }

        emit PositionRegistered(lp, pid, liquidity0, liquidity1);
    }

    /// @notice Placeholder for future PoolManager position ownership verification
    /// @dev First attempts to call an optional helper on the pool manager.  If the
    /// call fails (real manager does not implement it) we fall back to the
    /// extsload-based lookup used by StateLibrary with a zero salt.  This keeps
    /// the behaviour compatible with the existing mock while allowing a proper
    /// check on mainnet.
    function verifyPositionOwnership(PoolId pid, address lp, int24 lower, int24 upper) public view returns (bool) {
        // try the helper interface first
        try IPoolManagerExtra(address(poolManager)).getPositionLiquidity(pid, lp, lower, upper) returns (uint128 liq) {
            return liq > 0;
        } catch {
            // fallback: read the position liquidity directly from storage via extsload
            (uint128 liq,,) = StateLibrary.getPositionInfo(poolManager, pid, lp, lower, upper, bytes32(0));
            return liq > 0;
        }
    }
}

