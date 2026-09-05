// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ArchitectToken is ERC20 {
    constructor() ERC20("ArchitectToken", "ARCH") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
