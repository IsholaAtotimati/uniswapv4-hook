// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LendingPoolMock {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => uint256)) public aTokenBalances;
    mapping(address => uint256) public totalDeposits;

    /// Deposit ERC20 asset and mint aToken
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external {
        require(amount > 0, "Deposit amount must be > 0");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        aTokenBalances[asset][onBehalfOf] += amount;
        totalDeposits[asset] += amount;
    }

    /// Withdraw ERC20 asset by burning aToken
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        uint256 balance = aTokenBalances[asset][msg.sender];
        require(balance >= amount, "Not enough aToken balance");

        aTokenBalances[asset][msg.sender] -= amount;
        totalDeposits[asset] -= amount;
        IERC20(asset).safeTransfer(to, amount);

        return amount;
    }

    /// Accrue interest proportionally to LPs
    function accrueInterest(address asset, address[] calldata users, uint256 interestAmount) external {
        uint256 total = totalDeposits[asset];
        if (total == 0 || users.length == 0) return;

        for (uint i = 0; i < users.length; i++) {
            uint256 userShare = (aTokenBalances[asset][users[i]] * interestAmount) / total;
            aTokenBalances[asset][users[i]] += userShare;
        }

        totalDeposits[asset] += interestAmount;
    }

    function aTokenBalance(address asset, address user) external view returns (uint256) {
        return aTokenBalances[asset][user];
    }

    function getReserveData(address asset) external view returns (uint256) {
        return totalDeposits[asset];
    }
}