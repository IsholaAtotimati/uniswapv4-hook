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

    function deposit(
        address assetAddr,
        uint256 amount,
        address onBehalfOf,
        uint16
    ) external override {
        require(assetAddr == address(asset), "wrong asset");
        asset.transferFrom(msg.sender, address(this), amount);
        // mint aTokens to the receiver 1:1
        aToken.mint(onBehalfOf, amount);
    }

    function withdraw(
        address assetAddr,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(assetAddr == address(asset), "wrong asset");
        // burn the caller's aTokens
        aToken.burn(msg.sender, amount);
        asset.transfer(to, amount);
        return amount;
    }
}
