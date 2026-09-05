// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import "forge-std/Script.sol";
import "../src/ArchitectToken.sol";
import "../src/ArchitectNFT.sol";

contract InteractScript is Script {
    address constant ARCH_TOKEN = 0xdaD585D90Bcf235863210F03773F5B6F6371A309;
    address constant ARCH_NFT = 0x8197844AF51c2D2dC97983fe2d6907C952272272;

    function run() external {
        vm.startBroadcast();

        // Transfer 1 ARCH token to second wallet
        ArchitectToken token = ArchitectToken(ARCH_TOKEN);
        token.transfer(0x63453755695a8AB8f20ec9b799a4BB3C0d5b00Af, 1e18);

        // Mint NFT token #2
        ArchitectNFT nft = ArchitectNFT(ARCH_NFT);
        nft.mint(msg.sender);

        vm.stopBroadcast();
    }
}
