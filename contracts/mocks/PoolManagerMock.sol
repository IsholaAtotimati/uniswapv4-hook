// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract PoolManagerMock {
    // Minimal function to satisfy IdleLiquidityHookEnterprise constructor
    address public lastPool;

    function getPool(uint256 pid) external returns (address) {
        lastPool = address(uint160(pid)); // dummy pool address based on pid
        return lastPool;
    }

    // Minimal extsload implementation for StateLibrary.getSlot0
    function extsload(bytes32) external view returns (bytes32) {
        // Return dummy slot0 data: sqrtPriceX96=1, tick=0, protocolFee=0, lpFee=0
        // Layout: [lpFee|protocolFee|tick|sqrtPriceX96]
        // sqrtPriceX96 (160 bits) = 1
        // tick (24 bits) = 0
        // protocolFee (24 bits) = 0
        // lpFee (24 bits) = 0
        return bytes32(uint256(1));
    }
}
