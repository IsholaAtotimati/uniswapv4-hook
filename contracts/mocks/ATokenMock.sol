// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ATokenMock is ERC20 {

    address public lendingPool;

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
    {
        lendingPool = msg.sender;
    }

    /// @notice Set the lending pool address (for test wiring)
    function setLendingPool(address pool) external {
        lendingPool = pool;
    }

    modifier onlyLendingPool() {
        require(msg.sender == lendingPool, "only pool");
        _;
    }

    function mint(address to, uint256 amount) external onlyLendingPool {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyLendingPool {
        _burn(from, amount);
    }
}