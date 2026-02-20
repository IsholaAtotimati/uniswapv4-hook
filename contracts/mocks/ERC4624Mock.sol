// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC4626Mock is ERC20, IERC4626 {
    IERC20 public immutable assetToken;

    constructor(address _asset) ERC20("VaultToken", "vTKN") {
        assetToken = IERC20(_asset);
    }

    function asset() external view override returns (address) {
        return address(assetToken);
    }

    function totalAssets() external view override returns (uint256) {
        return assetToken.balanceOf(address(this));
    }

    function convertToAssets(uint256 shares) external view override returns (uint256) {
        return shares;
    }

    function convertToShares(uint256 assets) external view override returns (uint256) {
        return assets;
    }

    function maxDeposit(address) external pure override returns (uint256) {
        return type(uint256).max;
    }

    function maxMint(address) external pure override returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address) external view override returns (uint256) {
        return assetToken.balanceOf(address(this));
    }

    function maxRedeem(address) external view override returns (uint256) {
        return totalSupply();
    }

    function deposit(uint256 assets, address receiver) external override returns (uint256) {
        assetToken.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, assets);
        return assets;
    }

    function mint(uint256 shares, address receiver) external override returns (uint256) {
        assetToken.transferFrom(msg.sender, address(this), shares);
        _mint(receiver, shares);
        return shares;
    }

    function withdraw(uint256 assets, address receiver, address owner_) external override returns (uint256) {
        _burn(owner_, assets);
        assetToken.transfer(receiver, assets);
        return assets;
    }

    function redeem(uint256 shares, address receiver, address owner_) external override returns (uint256) {
        _burn(owner_, shares);
        assetToken.transfer(receiver, shares);
        return shares;
    }

    function previewDeposit(uint256 assets) external pure override returns (uint256) {
        return assets;
    }

    function previewMint(uint256 shares) external pure override returns (uint256) {
        return shares;
    }

    function previewWithdraw(uint256 assets) external view override returns (uint256) {
        return assets;
    }

    function previewRedeem(uint256 shares) external view override returns (uint256) {
        return shares;
    }
}
