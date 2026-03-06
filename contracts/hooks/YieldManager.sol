// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Position} from "../libraries/IdleLiquidityTypes.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";
library YieldManager {
    // Update global yield index
    function updateGlobalIndex(
        mapping(PoolId => uint256[2]) storage globalYieldIndex,
        mapping(PoolId => uint256[2]) storage totalIdleLiquidity,
        PoolId pid,
        uint8 side,
        uint256 yieldAmount
    ) internal {
        if (yieldAmount == 0) return;
        uint256 totalLiq = totalIdleLiquidity[pid][side];
        if (totalLiq == 0) return;
        globalYieldIndex[pid][side] += (yieldAmount * 1e18) / totalLiq;
    }

    // Accrue position yield
    function accruePositionYield(
        mapping(PoolId => uint256[2]) storage globalYieldIndex,
        Position storage pos,
        PoolId pid,
        uint8 side
    ) internal returns (uint256) {
        uint256 index = globalYieldIndex[pid][side];
        uint256 last = side == 0 ? pos.lastYieldIndex0 : pos.lastYieldIndex1;
        if (index <= last) return 0;
        uint256 delta = index - last;
        uint128 liq = side == 0 ? pos.liquidity0 : pos.liquidity1;
        if (liq == 0) {
            if (side == 0) pos.lastYieldIndex0 = index;
            else pos.lastYieldIndex1 = index;
            return 0;
        }
        uint256 share = (uint256(liq) * delta) / 1e18;
        if (side == 0) pos.lastYieldIndex0 = index;
        else pos.lastYieldIndex1 = index;
        return share;
    }
}
