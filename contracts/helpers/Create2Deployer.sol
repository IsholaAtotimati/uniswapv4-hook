// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Create2Deployer {
    event Deployed(address addr, bytes32 salt);

    function deploy(bytes memory bytecode, bytes32 salt) public returns (address addr) {
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "CREATE2: deploy failed");
        emit Deployed(addr, salt);
    }
}
