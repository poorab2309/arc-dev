// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal registry;

    address internal agentOne = address(0x1);
    address internal agentTwo = address(0x2);

    function setUp() public {
        registry = new AgentRegistry();
    }

    /// @dev Happy path: registration makes the agent eligible and stores name + metadata.
    function testRegisterAgent() public {
        vm.prank(agentOne);
        registry.registerAgent("TestBot", "ipfs://QmTest");

        assertTrue(registry.isRegisteredAgent(agentOne));

        (string memory name, string memory metadataURI,, bool active) = registry.getAgent(agentOne);
        assertEq(name, "TestBot");
        assertEq(metadataURI, "ipfs://QmTest");
        assertTrue(active);
    }

    /// @dev Each address may register only once; a second call must revert.
    function testCannotRegisterTwice() public {
        vm.startPrank(agentOne);
        registry.registerAgent("TestBot", "ipfs://QmTest");

        vm.expectRevert("AgentRegistry: already registered");
        registry.registerAgent("OtherName", "ipfs://Other");

        vm.stopPrank();
    }

    /// @dev Unregistered addresses are not treated as active agents.
    function testIsRegisteredAgentFalseForUnregistered() public {
        assertFalse(registry.isRegisteredAgent(agentTwo));
    }

    /// @dev Deactivation removes eligibility but keeps stored name and metadata for lookup.
    function testDeactivateAgent() public {
        vm.startPrank(agentOne);
        registry.registerAgent("TestBot", "ipfs://QmTest");
        registry.deactivateAgent();
        vm.stopPrank();

        assertFalse(registry.isRegisteredAgent(agentOne));

        (string memory name, string memory metadataURI,, bool active) = registry.getAgent(agentOne);
        assertEq(name, "TestBot");
        assertEq(metadataURI, "ipfs://QmTest");
        assertFalse(active);
    }

    /// @dev deactivateAgent requires a prior registration.
    function testCannotDeactivateIfNotRegistered() public {
        vm.prank(agentOne);
        vm.expectRevert("AgentRegistry: not registered");
        registry.deactivateAgent();
    }

    /// @dev A second deactivation after the first must fail.
    function testCannotDeactivateTwice() public {
        vm.startPrank(agentOne);
        registry.registerAgent("TestBot", "ipfs://QmTest");
        registry.deactivateAgent();

        vm.expectRevert("AgentRegistry: already inactive");
        registry.deactivateAgent();

        vm.stopPrank();
    }

    /// @dev An inactive agent can reactivate and become eligible again.
    function testDeactivateThenReactivate() public {
        vm.startPrank(agentOne);

        registry.registerAgent("TestBot", "ipfs://QmTest");
        registry.deactivateAgent();

        assertFalse(registry.isRegisteredAgent(agentOne));

        registry.reactivateAgent();

        vm.stopPrank();

        assertTrue(registry.isRegisteredAgent(agentOne));

        (string memory name, string memory metadataURI,, bool active) = registry.getAgent(agentOne);
        assertEq(name, "TestBot");
        assertEq(metadataURI, "ipfs://QmTest");
        assertTrue(active);
    }

    /// @dev An already active agent cannot reactivate.
    function testCannotReactivateActiveAgent() public {
        vm.prank(agentOne);
        registry.registerAgent("TestBot", "ipfs://QmTest");

        vm.prank(agentOne);
        vm.expectRevert("AgentRegistry: already active");
        registry.reactivateAgent();
    }

    /// @dev An address that has never registered cannot reactivate.
    function testCannotReactivateIfNotRegistered() public {
        vm.prank(agentOne);
        vm.expectRevert("AgentRegistry: not registered");
        registry.reactivateAgent();
    }

    /// @dev getAgent must revert when no record exists for the address.
    function testGetAgentRevertsForUnknownAddress() public {
        vm.expectRevert("AgentRegistry: agent not found");
        registry.getAgent(agentTwo);
    }
}
