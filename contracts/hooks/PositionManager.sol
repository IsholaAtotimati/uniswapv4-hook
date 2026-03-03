// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Position, Status} from "../libraries/IdleLiquidityTypes.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

library PositionManager {
    // Register position
    function registerPosition(
        mapping(PoolId => mapping(address => Position)) storage positions,
        mapping(PoolId => address[]) storage trackedLPs,
        mapping(PoolId => uint256[2]) storage globalYieldIndex,
        mapping(PoolId => uint256[2]) storage totalIdleLiquidity,
        PoolId pid,
        address lp,
        uint128 liquidity0,
        uint128 liquidity1,
        int24 lower,
        int24 upper
    ) internal {
        Position storage pos = positions[pid][lp];
        require(pos.status == Status.ACTIVE || (pos.liquidity0 == 0 && pos.liquidity1 == 0), "already exists");
        require(lower < upper, "invalid range");
        // Remove previous liquidity from idle if overwriting
        if (pos.liquidity0 > 0) {
            totalIdleLiquidity[pid][0] -= pos.liquidity0;
        }
        if (pos.liquidity1 > 0) {
            totalIdleLiquidity[pid][1] -= pos.liquidity1;
        }
        pos.liquidity0 = liquidity0;
        pos.liquidity1 = liquidity1;
        totalIdleLiquidity[pid][0] += liquidity0;
        totalIdleLiquidity[pid][1] += liquidity1;
        pos.lowerTick = lower;
        pos.upperTick = upper;
        pos.status = Status.ACTIVE;
        pos.lastYieldIndex0 = globalYieldIndex[pid][0];
        pos.lastYieldIndex1 = globalYieldIndex[pid][1];
        // Add LP to trackedLPs if not already present
        bool found = false;
        address[] storage lps = trackedLPs[pid];
        for (uint256 i = 0; i < lps.length; i++) {
            if (lps[i] == lp) {
                found = true;
                break;
            }
        }
        if (!found) {
            lps.push(lp);
        }
    }
    // Other position management functions (deregister, process, claim, import) can be added similarly
}
