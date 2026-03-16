// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "../interfaces/ILendingPool.sol";
import "./ERC20Mock.sol";

contract LendingPoolMock is ILendingPool {
    ERC20Mock public asset;
    ERC20Mock public aToken;

    constructor(address _asset, address _aToken) {
        asset = ERC20Mock(_asset);
        aToken = ERC20Mock(_aToken);
    }

    // Pull directly from msg.sender balance (hook)
    function deposit(
        address assetAddr,
        uint256 amount,
        address onBehalfOf,
        uint16
    ) external override {
        require(assetAddr == address(asset), "wrong asset");
        require(asset.balanceOf(msg.sender) >= amount, "insufficient balance");
        asset.transfer(address(this), amount);
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(
        address assetAddr,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(assetAddr == address(asset), "wrong asset");
        aToken.burn(msg.sender, amount);
        asset.transfer(to, amount);
        return amount;
    }
}