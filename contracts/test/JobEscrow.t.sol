// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {JobEscrow} from "../src/JobEscrow.sol";

contract JobEscrowTest is Test {
    AgentRegistry internal registry;
    JobEscrow internal escrow;

    address internal worker = address(0x1);
    address internal verifier = address(0x2);
    address internal client = address(0x3);
    address internal stranger = address(0x4);
    address internal anyone = address(0x5);

    uint256 internal constant JOB_PAYMENT = 1 ether;

    function setUp() public {
        registry = new AgentRegistry();
        escrow = new JobEscrow(address(registry));

        vm.prank(worker);
        registry.registerAgent("WorkerBot", "ipfs://worker");

        vm.prank(verifier);
        registry.registerAgent("VerifierBot", "ipfs://verifier");

        vm.deal(client, 10 ether);
    }

    function _futureDeadline() internal view returns (uint256) {
        return block.timestamp + 1 days;
    }

    /// @dev Client can fund a job and read back Created status with correct fields.
    function testCreateJob() public {
        uint256 deadline = _futureDeadline();

        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(deadline);

        assertEq(jobId, 0);
        assertEq(escrow.nextJobId(), 1);

        (
            address jobClient,
            address workerAgent,
            address verifierAgent,
            uint256 amount,
            uint256 jobDeadline,
            string memory proofURI,
            JobEscrow.JobStatus status
        ) = escrow.getJob(jobId);

        assertEq(jobClient, client);
        assertEq(workerAgent, address(0));
        assertEq(verifierAgent, address(0));
        assertEq(amount, JOB_PAYMENT);
        assertEq(jobDeadline, deadline);
        assertEq(bytes(proofURI).length, 0);
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Created));
    }

    /// @dev Jobs must lock a non-zero native payment.
    function testCannotCreateJobWithZeroValue() public {
        vm.prank(client);
        vm.expectRevert("JobEscrow: zero payment");
        escrow.createJob{value: 0}(_futureDeadline());
    }

    /// @dev Deadline must be strictly after the current block time.
    function testCannotCreateJobWithPastDeadline() public {
        vm.prank(client);
        vm.expectRevert("JobEscrow: deadline not in future");
        escrow.createJob{value: JOB_PAYMENT}(block.timestamp);
    }

    /// @dev A registered worker can claim an open job.
    function testClaimJob() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        (, address workerAgent,,,,, JobEscrow.JobStatus status) = escrow.getJob(jobId);
        assertEq(workerAgent, worker);
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Claimed));
    }

    /// @dev Only addresses registered in AgentRegistry may claim.
    function testCannotClaimIfNotRegisteredAgent() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(stranger);
        vm.expectRevert("JobEscrow: not a registered agent");
        escrow.claimJob(jobId);
    }

    /// @dev Once claimed, the job is no longer open for another agent.
    function testCannotClaimTwice() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(verifier);
        vm.expectRevert("JobEscrow: not open for claim");
        escrow.claimJob(jobId);
    }

    /// @dev Assigned worker can submit proof and move status to Submitted.
    function testSubmitWork() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(worker);
        escrow.submitWork(jobId, "ipfs://proof");

        (,,,,, string memory proofURI, JobEscrow.JobStatus status) = escrow.getJob(jobId);
        assertEq(proofURI, "ipfs://proof");
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Submitted));
    }

    /// @dev Only the worker assigned at claim time may submit work.
    function testCannotSubmitIfNotWorker() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(verifier);
        vm.expectRevert("JobEscrow: not worker");
        escrow.submitWork(jobId, "ipfs://proof");
    }

    /// @dev Verifier releases escrowed funds to the worker on success.
    function testVerifyAndReleasePaysWorker() public {
        vm.deal(worker, 0);

        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(worker);
        escrow.submitWork(jobId, "ipfs://proof");

        uint256 workerBefore = worker.balance;

        vm.prank(verifier);
        escrow.verifyAndRelease(jobId);

        (,,,,,, JobEscrow.JobStatus status) = escrow.getJob(jobId);
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Verified));
        assertEq(worker.balance, workerBefore + JOB_PAYMENT);
    }

    /// @dev Worker cannot verify their own submission.
    function testCannotSelfVerify() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(worker);
        escrow.submitWork(jobId, "ipfs://proof");

        vm.prank(worker);
        vm.expectRevert("JobEscrow: worker cannot verify");
        escrow.verifyAndRelease(jobId);
    }

    /// @dev After verification, the job is no longer in Submitted state.
    function testCannotVerifyTwice() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(worker);
        escrow.submitWork(jobId, "ipfs://proof");

        vm.prank(verifier);
        escrow.verifyAndRelease(jobId);

        vm.prank(verifier);
        vm.expectRevert("JobEscrow: not submitted");
        escrow.verifyAndRelease(jobId);
    }

    /// @dev Client gets a full refund when cancelling an unclaimed job.
    function testCancelJobRefundsClient() public {
        vm.txGasPrice(0);

        uint256 clientBefore = client.balance;

        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        assertEq(client.balance, clientBefore - JOB_PAYMENT);

        vm.prank(client);
        escrow.cancelJob(jobId);

        (,,,,,, JobEscrow.JobStatus status) = escrow.getJob(jobId);
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Cancelled));
        assertEq(client.balance, clientBefore);
    }

    /// @dev Cancellation is only allowed before any agent claims the job.
    function testCannotCancelAfterClaim() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(client);
        vm.expectRevert("JobEscrow: not cancellable");
        escrow.cancelJob(jobId);
    }

    /// @dev Only the client who created the job may cancel it.
    function testCannotCancelIfNotClient() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(stranger);
        vm.expectRevert("JobEscrow: not client");
        escrow.cancelJob(jobId);
    }

    /// @dev After the deadline, anyone can trigger an expiry refund to the client.
    function testRefundExpiredAfterDeadline() public {
        vm.txGasPrice(0);

        uint256 shortDeadline = block.timestamp + 100;

        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(shortDeadline);

        uint256 clientAfterCreate = client.balance;

        vm.warp(shortDeadline + 1);

        vm.prank(anyone);
        escrow.refundExpired(jobId);

        (,,,,,, JobEscrow.JobStatus status) = escrow.getJob(jobId);
        assertEq(uint256(status), uint256(JobEscrow.JobStatus.Expired));
        assertEq(client.balance, clientAfterCreate + JOB_PAYMENT);
    }

    /// @dev Expiry refund is blocked until the deadline has passed.
    function testCannotRefundBeforeDeadline() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(anyone);
        vm.expectRevert("JobEscrow: deadline not passed");
        escrow.refundExpired(jobId);
    }

    /// @dev Completed (verified) jobs cannot be refunded as expired.
    function testCannotRefundAlreadyVerifiedJob() public {
        vm.prank(client);
        uint256 jobId = escrow.createJob{value: JOB_PAYMENT}(_futureDeadline());

        vm.prank(worker);
        escrow.claimJob(jobId);

        vm.prank(worker);
        escrow.submitWork(jobId, "ipfs://proof");

        vm.prank(verifier);
        escrow.verifyAndRelease(jobId);

        vm.warp(_futureDeadline() + 1);

        vm.prank(anyone);
        vm.expectRevert("JobEscrow: not refundable");
        escrow.refundExpired(jobId);
    }
}
