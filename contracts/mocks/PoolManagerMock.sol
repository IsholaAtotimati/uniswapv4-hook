// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

contract PoolManagerMock {
    // Minimal function to satisfy IdleLiquidityHookEnterprise constructor
    address public lastPool;

    function getPool(PoolId pid) external returns (address) {
        // convert bytes32 -> uint160 by truncation for a dummy address
        // unwrap the PoolId type to bytes32 first
        lastPool = address(uint160(uint256(PoolId.unwrap(pid))));
        return lastPool;
    }

    // simple override storage for positions used by verifyPositionOwnership helper
    mapping(bytes32 => uint128) private _liqOverride;
    mapping(bytes32 => bool) private _hasOverride;

    /// @notice allow tests to override the liquidity reported for a particular
    /// owner/ticks combination; calling with `liq==0` forces the ownership check
    /// to fail even though the default behaviour returns 1.
    function setPositionLiquidity(
        PoolId pid,
        address owner,
        int24 lower,
        int24 upper,
        uint128 liq
    ) external {
        bytes32 key = keccak256(abi.encodePacked(pid, owner, lower, upper));
        _liqOverride[key] = liq;
        _hasOverride[key] = true;
    }

    /// @notice helper invoked by IdleLiquidityHookEnterprise.verifyPositionOwnership
    function getPositionLiquidity(
        PoolId pid,
        address owner,
        int24 lower,
        int24 upper
    ) external view returns (uint128) {
        bytes32 key = keccak256(abi.encodePacked(pid, owner, lower, upper));
        if (_hasOverride[key]) {
            return _liqOverride[key];
        }
        // default dummy value is 1 to keep previous tests happy
        return 1;
    }

    // Minimal extsload implementation for StateLibrary.getSlot0
    function extsload(bytes32) external pure returns (bytes32) {
        // Return dummy slot0 data: sqrtPriceX96=1, tick=0, protocolFee=0, lpFee=0
        // Layout: [lpFee|protocolFee|tick|sqrtPriceX96]
        // sqrtPriceX96 (160 bits) = 1
        // tick (24 bits) = 0
        // protocolFee (24 bits) = 0
        // lpFee (24 bits) = 0
        return bytes32(uint256(1));
    }

    // Overload used by StateLibrary.getPositionInfo which needs multiple words
    // We ignore the length parameter and always return three words; callers currently
    // only use this for position info which expects exactly 3 words. Using an
    // unnamed parameter avoids the compiler warning about unused variables.
    function extsload(bytes32 slot, uint256 /*unused*/) external pure returns (bytes32[] memory) {
        bytes32[] memory result = new bytes32[](3);
        result[0] = bytes32(uint256(1));
        result[1] = bytes32(uint256(0));
        result[2] = bytes32(uint256(0));
        return result;
    }
}
