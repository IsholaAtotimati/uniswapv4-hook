// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {EmptyTestHooks as BaseEmptyTestHooks} from "../lib/v4-core/src/test/EmptyTestHooks.sol";

/// @notice Local wrapper to expose EmptyTestHooks for Hardhat compilation.
contract EmptyTestHooks is BaseEmptyTestHooks {}
