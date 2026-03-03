// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC4626Mock is ERC4626 {
    constructor(address asset_)
        ERC20("Mock Vault Share", "MVS")
        ERC4626(IERC20(asset_))
    {}

    // Optionally override functions for more control in tests
}
