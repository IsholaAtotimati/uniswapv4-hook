// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.26;

import {PoolManager as BasePoolManager} from "../lib/v4-core/src/PoolManager.sol";

/// @notice Local wrapper to expose PoolManager for Hardhat compilation.
contract PoolManager is BasePoolManager {
    constructor(address owner) BasePoolManager(owner) {}
}
