
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

enum Status { ACTIVE, IDLE, PROCESSING, FAILED }
enum Strategy { NONE, ERC4626, AAVE }

struct Position {
    uint128 liquidity0;
    uint128 liquidity1;
    int24 lowerTick;
    int24 upperTick;
    Status status;
    uint256 lastYieldIndex0;
    uint256 lastYieldIndex1;
    uint256 accumulatedYield0;
    uint256 accumulatedYield1;
    uint256 vaultShares0;
    uint256 vaultShares1;
    uint256 aTokenPrincipal0;
    uint256 aTokenPrincipal1;
}

struct AssetConfig {
    IERC4626 vault;
    ILendingPool lendingPool;
    IERC20 aToken;
    address asset;
    Strategy strategy;
}

struct PoolConfig {
    AssetConfig[2] assets;
    uint256 lpShareBP;
    uint256 protocolShareBP;
}
