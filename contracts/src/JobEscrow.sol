// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {AgentRegistry} from "./AgentRegistry.sol";

/**
 * @title JobEscrow
 * @notice ERC-8183-style escrow: clients lock native USDC; registered agents claim work, submit proof, and get paid after another agent verifies.
 * @dev Uses checks-effects-interactions: status and balances are updated before any native-token transfer.
 */
contract JobEscrow {
    /// @notice Lifecycle of a job from funding through payout, cancel, or expiry refund.
    enum JobStatus {
        Created,
        Claimed,
        Submitted,
        Verified,
        Cancelled,
        Expired
    }

    /// @notice On-chain job record; `workerAgent` and `verifierAgent` are zero until assigned.
    struct Job {
        address client;
        address workerAgent;
        address verifierAgent;
        uint256 amount;
        uint256 deadline;
        string proofURI;
        JobStatus status;
    }

    /// @notice Registry used to ensure only active registered agents can claim or verify work.
    AgentRegistry public immutable agentRegistry;

    /// @dev Monotonic id counter; valid job ids are `0` through `nextJobId - 1`.
    uint256 public nextJobId;

    /// @notice All jobs keyed by id (also exposes a Solidity-generated getter per field).
    mapping(uint256 => Job) public jobs;

    event JobCreated(uint256 indexed jobId, address indexed client, uint256 amount, uint256 deadline);
    event JobClaimed(uint256 indexed jobId, address indexed agent);
    event WorkSubmitted(uint256 indexed jobId, string proofURI);
    event JobVerified(uint256 indexed jobId, address indexed verifier, address indexed worker, uint256 amount);
    event JobCancelled(uint256 indexed jobId);
    event JobExpired(uint256 indexed jobId);

    /**
     * @param agentRegistryAddress Deployed `AgentRegistry` used for agent eligibility checks.
     */
    constructor(address agentRegistryAddress) {
        agentRegistry = AgentRegistry(agentRegistryAddress);
    }

    /// @dev Reverts when `jobId` was never created.
    modifier jobExists(uint256 jobId) {
        require(jobId < nextJobId, "JobEscrow: job not found");
        _;
    }

    /**
     * @notice Fund a new job by sending native USDC with the transaction.
     * @param deadline Unix timestamp after which the job can be refunded if not completed.
     * @return jobId Id of the newly created job.
     * @dev `msg.value` is locked in this contract until verify, cancel, or expiry refund.
     */
    function createJob(uint256 deadline) external payable returns (uint256 jobId) {
        require(msg.value > 0, "JobEscrow: zero payment");
        require(deadline > block.timestamp, "JobEscrow: deadline not in future");

        jobId = nextJobId;
        nextJobId++;

        jobs[jobId] = Job({
            client: msg.sender,
            workerAgent: address(0),
            verifierAgent: address(0),
            amount: msg.value,
            deadline: deadline,
            proofURI: "",
            status: JobStatus.Created
        });

        emit JobCreated(jobId, msg.sender, msg.value, deadline);
    }

    /**
     * @notice A registered agent reserves an open job before the deadline.
     * @param jobId Job to claim.
     * @dev Only `Created` jobs can be claimed; caller must be an active agent in the registry.
     */
    function claimJob(uint256 jobId) external jobExists(jobId) {
        Job storage job = jobs[jobId];

        require(job.status == JobStatus.Created, "JobEscrow: not open for claim");
        require(block.timestamp <= job.deadline, "JobEscrow: past deadline");
        require(agentRegistry.isRegisteredAgent(msg.sender), "JobEscrow: not a registered agent");

        job.workerAgent = msg.sender;
        job.status = JobStatus.Claimed;

        emit JobClaimed(jobId, msg.sender);
    }

    /**
     * @notice Worker attaches proof of completed work (URI or description string).
     * @param jobId Job being completed.
     * @param proofURI Location or text describing the deliverable.
     * @dev Only the assigned worker may submit, and only while the job is still before its deadline.
     */
    function submitWork(uint256 jobId, string calldata proofURI) external jobExists(jobId) {
        Job storage job = jobs[jobId];

        require(job.status == JobStatus.Claimed, "JobEscrow: not claimed");
        require(msg.sender == job.workerAgent, "JobEscrow: not worker");
        require(block.timestamp <= job.deadline, "JobEscrow: past deadline");

        job.proofURI = proofURI;
        job.status = JobStatus.Submitted;

        emit WorkSubmitted(jobId, proofURI);
    }

    /**
     * @notice A different registered agent confirms the work and releases payment to the worker.
     * @param jobId Job awaiting verification.
     * @dev Verifier cannot be the worker (no self-verification). State is finalized before payout.
     */
    function verifyAndRelease(uint256 jobId) external jobExists(jobId) {
        Job storage job = jobs[jobId];

        require(job.status == JobStatus.Submitted, "JobEscrow: not submitted");
        require(agentRegistry.isRegisteredAgent(msg.sender), "JobEscrow: not a registered agent");
        require(msg.sender != job.workerAgent, "JobEscrow: worker cannot verify");
        require(block.timestamp <= job.deadline, "JobEscrow: past deadline");

        address worker = job.workerAgent;
        uint256 amount = job.amount;

        job.verifierAgent = msg.sender;
        job.status = JobStatus.Verified;

        _sendNative(worker, amount);

        emit JobVerified(jobId, msg.sender, worker, amount);
    }

    /**
     * @notice Client cancels an unclaimed job and receives a full refund.
     * @param jobId Job to cancel.
     * @dev Only allowed while status is `Created` (no agent has claimed yet).
     */
    function cancelJob(uint256 jobId) external jobExists(jobId) {
        Job storage job = jobs[jobId];

        require(job.status == JobStatus.Created, "JobEscrow: not cancellable");
        require(msg.sender == job.client, "JobEscrow: not client");

        address client = job.client;
        uint256 amount = job.amount;

        job.status = JobStatus.Cancelled;

        _sendNative(client, amount);

        emit JobCancelled(jobId);
    }

    /**
     * @notice Anyone may trigger a client refund after the deadline if the job was never finished or paid out.
     * @param jobId Job that missed its deadline.
     * @dev Applies to `Created`, `Claimed`, or `Submitted` jobs — not `Verified`, `Cancelled`, or already `Expired`.
     */
    function refundExpired(uint256 jobId) external jobExists(jobId) {
        Job storage job = jobs[jobId];

        require(block.timestamp > job.deadline, "JobEscrow: deadline not passed");
        require(
            job.status == JobStatus.Created || job.status == JobStatus.Claimed || job.status == JobStatus.Submitted,
            "JobEscrow: not refundable"
        );

        address client = job.client;
        uint256 amount = job.amount;

        job.status = JobStatus.Expired;

        _sendNative(client, amount);

        emit JobExpired(jobId);
    }

    /**
     * @notice Read full job details in one call (useful for frontends).
     * @param jobId Job to query.
     */
    function getJob(uint256 jobId)
        external
        view
        jobExists(jobId)
        returns (
            address client,
            address workerAgent,
            address verifierAgent,
            uint256 amount,
            uint256 deadline,
            string memory proofURI,
            JobStatus status
        )
    {
        Job storage job = jobs[jobId];
        return (job.client, job.workerAgent, job.verifierAgent, job.amount, job.deadline, job.proofURI, job.status);
    }

    /// @dev Sends native USDC via low-level call (avoids `.transfer` gas stipend limits).
    function _sendNative(address to, uint256 amount) internal {
        (bool success,) = to.call{value: amount}("");
        require(success, "JobEscrow: transfer failed");
    }
}
