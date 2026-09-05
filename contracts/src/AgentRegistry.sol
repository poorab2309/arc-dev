// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

/**
 * @title AgentRegistry
 * @notice ERC-8004-style registry where addresses can register as AI agents with a name and metadata URI.
 * @dev Other contracts (e.g. JobEscrow) can call `isRegisteredAgent` to verify an agent is allowed to participate.
 */
contract AgentRegistry {
    /// @notice On-chain record for a registered agent (the agent's address is the mapping key).
    struct Agent {
        string name;
        string metadataURI;
        uint256 registeredAt;
        bool active;
    }

    /// @dev agent address => registration details; `registeredAt == 0` means never registered.
    mapping(address => Agent) private _agents;

    /// @notice Emitted when an address successfully registers as an agent.
    event AgentRegistered(address indexed agent, string name, string metadataURI);

    /// @notice Emitted when an agent turns off its own registration (still stored, but no longer eligible).
    event AgentDeactivated(address indexed agent);

    /// @notice Emitted when an inactive agent reactivates its registration.
    event AgentReactivated(address indexed agent);

    /**
     * @notice Register the caller (`msg.sender`) as an agent.
     * @param name Human-readable label for the agent (e.g. "DataFetcherBot").
     * @param metadataURI Off-chain or descriptive URI (IPFS, HTTPS, or plain text) describing capabilities.
     * @dev Each address may register only once; use `deactivateAgent` to temporarily disable participation.
     */
    function registerAgent(string memory name, string memory metadataURI) external {
        require(_agents[msg.sender].registeredAt == 0, "AgentRegistry: already registered");

        _agents[msg.sender] = Agent({name: name, metadataURI: metadataURI, registeredAt: block.timestamp, active: true});

        emit AgentRegistered(msg.sender, name, metadataURI);
    }

    /**
     * @notice Check whether an address is a currently eligible agent.
     * @param agent Address to query.
     * @return True if the address has registered and is currently active.
     * @dev Intended for gatekeeping in escrows or job markets — inactive agents return false.
     */
    function isRegisteredAgent(address agent) public view returns (bool) {
        Agent storage record = _agents[agent];
        return record.registeredAt != 0 && record.active;
    }

    /**
     * @notice Return full registration data for an agent.
     * @param agent Address to look up.
     * @return name Registered display name.
     * @return metadataURI Stored metadata URI string.
     * @return registeredAt Unix timestamp when `registerAgent` was called.
     * @return active Whether the agent is currently active.
     */
    function getAgent(address agent)
        public
        view
        returns (string memory name, string memory metadataURI, uint256 registeredAt, bool active)
    {
        Agent storage record = _agents[agent];
        require(record.registeredAt != 0, "AgentRegistry: agent not found");

        return (record.name, record.metadataURI, record.registeredAt, record.active);
    }

    /**
     * @notice Deactivate the caller's agent registration.
     * @dev Only the agent's own address may call this; sets `active` to false but keeps history on-chain.
     */
    function deactivateAgent() external {
        Agent storage record = _agents[msg.sender];
        require(record.registeredAt != 0, "AgentRegistry: not registered");
        require(record.active, "AgentRegistry: already inactive");

        record.active = false;

        emit AgentDeactivated(msg.sender);
    }

    /**
     * @notice Reactivate the caller's previously registered agent.
     * @dev Preserves the original name, metadata URI, and registration timestamp.
     */
    function reactivateAgent() external {
        Agent storage record = _agents[msg.sender];
        require(record.registeredAt != 0, "AgentRegistry: not registered");
        require(!record.active, "AgentRegistry: already active");

        record.active = true;

        emit AgentReactivated(msg.sender);
    }
}
