
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IAToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

contract LendingPoolMock {
        event DebugWithdraw(address asset, uint256 amount, address to, address msgSender);
    using SafeERC20 for IERC20;

    struct Reserve {
        address aToken;
        uint256 totalDeposits;
    }

    mapping(address => Reserve) public reserves;

    /// 🔧 Initialize reserve (like Aave reserve config)
    function initReserve(address asset, address aToken) external {
        require(reserves[asset].aToken == address(0), "already set");
        reserves[asset] = Reserve({
            aToken: aToken,
            totalDeposits: 0
        });
    }

    /// Deposit → mint aToken
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16
    ) external {
        require(amount > 0, "amount 0");

        Reserve storage r = reserves[asset];
        require(r.aToken != address(0), "reserve not initialized");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        IAToken(r.aToken).mint(onBehalfOf, amount);

        r.totalDeposits += amount;
    }

    /// Withdraw → burn aToken
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        Reserve storage r = reserves[asset];
        require(r.aToken != address(0), "reserve not initialized");

        emit DebugWithdraw(asset, amount, to, msg.sender);
        // For debugging in Hardhat (only string and uint256 supported)
        console.log("LendingPoolMock.withdraw called");
        console.log("amount", amount);

        IAToken(r.aToken).burn(msg.sender, amount);

        IERC20(asset).safeTransfer(to, amount);

        r.totalDeposits -= amount;

        return amount;
    }

    /// View aToken balance (same as Aave)
    function aTokenBalance(address asset, address user) external view returns (uint256) {
        return IERC20(reserves[asset].aToken).balanceOf(user);
    }

    function getReserveData(address asset) external view returns (uint256) {
        return reserves[asset].totalDeposits;
    }
}