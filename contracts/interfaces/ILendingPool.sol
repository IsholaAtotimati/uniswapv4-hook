// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface ILendingPool {
    /// @notice Deposit ERC20 asset into the pool
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /// @notice Supply ERC20 asset (some Aave versions use `supply`)
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    /// @notice Withdraw ERC20 asset
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    /// @notice Return mock reserve data (can be 0 for tests)
    function getReserveData(address asset) external view returns (uint256);
}