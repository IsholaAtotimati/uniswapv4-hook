// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract PoolManagerMock {
    // Minimal function to satisfy IdleLiquidityHookEnterprise constructor
    address public lastPool;

    function getPool(uint256 pid) external returns (address) {
        lastPool = address(uint160(pid)); // dummy pool address based on pid
        return lastPool;
    }
}
