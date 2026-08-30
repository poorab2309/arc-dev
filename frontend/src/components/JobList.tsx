"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useBlock,
  useConnection,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther } from "viem";

import { jobEscrowAbi, jobEscrowAddress } from "@/lib/JobEscrowABI";

const STATUS_LABELS = [
  "Created",
  "Claimed",
  "Submitted",
  "Verified",
  "Cancelled",
  "Expired",
] as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDeadline(deadline: bigint): string {
  return new Date(Number(deadline) * 1000).toLocaleString();
}

/**
 * Converts long Wagmi / RPC / contract errors into readable UI messages.
 */
function getFriendlyError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  const lower = message.toLowerCase();

  if (
    lower.includes("rate limit") ||
    lower.includes("request exceeds defined limit")
  ) {
    return "The network is temporarily rate-limited. Please try refreshing again in a moment.";
  }

  if (
    lower.includes("not client") ||
    lower.includes("jobescrow: not client")
  ) {
    return "Only the job creator can cancel this job.";
  }

  if (
    lower.includes("not registered agent") ||
    lower.includes("jobescrow: not a registered agent")
  ) {
    return "This wallet is not registered as an active agent.";
  }

  if (
    lower.includes("worker cannot verify") ||
    lower.includes("jobescrow: worker cannot verify")
  ) {
    return "The worker cannot verify their own work. Use a different registered agent wallet.";
  }

  if (
    lower.includes("past deadline") ||
    lower.includes("jobescrow: past deadline")
  ) {
    return "This job has passed its deadline.";
  }

  if (
    lower.includes("deadline not passed") ||
    lower.includes("jobescrow: deadline not passed")
  ) {
    return "This job has not reached its deadline yet.";
  }

  if (
    lower.includes("not open for claim") ||
    lower.includes("jobescrow: not open for claim")
  ) {
    return "This job is no longer available to claim.";
  }

  if (
    lower.includes("not claimed") ||
    lower.includes("jobescrow: not claimed")
  ) {
    return "This job has not been claimed.";
  }

  if (
    lower.includes("not worker") ||
    lower.includes("jobescrow: not worker")
  ) {
    return "Only the assigned worker can submit work.";
  }

  if (
    lower.includes("not submitted") ||
    lower.includes("jobescrow: not submitted")
  ) {
    return "This job is not waiting for verification.";
  }

  if (
    lower.includes("not cancellable") ||
    lower.includes("jobescrow: not cancellable")
  ) {
    return "This job can no longer be cancelled.";
  }

  if (
    lower.includes("not refundable") ||
    lower.includes("jobescrow: not refundable")
  ) {
    return "This job is not eligible for an expiry refund.";
  }

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Transaction cancelled in your wallet.";
  }

  if (
    lower.includes("insufficient funds") ||
    lower.includes("insufficient balance")
  ) {
    return "This wallet does not have enough funds for the transaction.";
  }

  return "The transaction could not be completed. Please check your wallet and try again.";
}

type JobData = {
  client: `0x${string}`;
  workerAgent: `0x${string}`;
  verifierAgent: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  proofURI: string;
  status: number;
};

/**
 * Handles actions available for an individual job.
 */
function JobActions({
  jobId,
  job,
  myAddress,
  onDone,
}: {
  jobId: number;
  job: JobData;
  myAddress: `0x${string}` | undefined;
  onDone: () => void;
}) {
  const [proofURI, setProofURI] = useState("");

  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: block } = useBlock({
    watch: true,
  });

  useEffect(() => {
    if (isConfirmed) {
      onDone();
    }
  }, [isConfirmed, onDone]);

  const isClient =
    myAddress?.toLowerCase() === job.client.toLowerCase();

  const isWorker =
    myAddress?.toLowerCase() === job.workerAgent.toLowerCase();

  const busy = isPending || isConfirming;

  function claim() {
    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "claimJob",
      args: [BigInt(jobId)],
    });
  }

  function submit() {
    if (!proofURI.trim()) return;

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "submitWork",
      args: [BigInt(jobId), proofURI.trim()],
    });
  }

  function verify() {
    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "verifyAndRelease",
      args: [BigInt(jobId)],
    });
  }

  function cancel() {
    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "cancelJob",
      args: [BigInt(jobId)],
    });
  }

  function refundExpired() {
    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "refundExpired",
      args: [BigInt(jobId)],
    });
  }

  const statusLabel = STATUS_LABELS[job.status];

  /**
   * Use the latest blockchain timestamp instead of Date.now().
   */
  const deadlinePassed =
    block?.timestamp !== undefined &&
    block.timestamp > job.deadline;

  return (
    <div className="flex flex-col gap-2">
      {/* Client can cancel an unclaimed job */}
      {statusLabel === "Created" && isClient && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="self-start rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Cancelling..." : "Cancel Job"}
        </button>
      )}

      {/* Registered agents can claim open jobs */}
      {statusLabel === "Created" && !isClient && (
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="self-start rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Claiming..." : "Claim Job"}
        </button>
      )}

      {/* Worker can submit proof */}
      {statusLabel === "Claimed" && isWorker && (
        <div className="flex gap-2">
          <input
            type="text"
            value={proofURI}
            onChange={(e) => setProofURI(e.target.value)}
            placeholder="Proof URI or description"
            disabled={busy}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <button
            type="button"
            onClick={submit}
            disabled={busy || !proofURI.trim()}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Submitting..." : "Submit Work"}
          </button>
        </div>
      )}

      {/* Registered agent other than worker can verify */}
      {statusLabel === "Submitted" && !isWorker && (
        <button
          type="button"
          onClick={verify}
          disabled={busy}
          className="self-start rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Verifying..." : "Verify & Release"}
        </button>
      )}

      {/* Anyone can trigger expiry refund */}
      {(statusLabel === "Created" ||
        statusLabel === "Claimed" ||
        statusLabel === "Submitted") &&
        deadlinePassed && (
          <button
            type="button"
            onClick={refundExpired}
            disabled={busy}
            className="self-start rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Refunding..." : "Refund Expired Job"}
          </button>
        )}

      {/* Friendly transaction error */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            Transaction failed
          </p>

          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {getFriendlyError(error)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Fetches nextJobId, then reads every job through getJob
 * using batched multicall.
 */
export function JobList() {
  const { address: myAddress } = useConnection();

  const {
    data: nextJobId,
    isLoading: isLoadingCount,
    error: countError,
  } = useReadContract({
    address: jobEscrowAddress,
    abi: jobEscrowAbi,
    functionName: "nextJobId",
  });

  const jobCount = nextJobId ? Number(nextJobId) : 0;

  const {
    data: jobs,
    isLoading: isLoadingJobs,
    refetch,
  } = useReadContracts({
    contracts: Array.from({ length: jobCount }, (_, i) => ({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "getJob",
      args: [BigInt(i)],
    })),
    query: {
      enabled: jobCount > 0,
    },
  });

  const handleDone = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoadingCount) {
    return (
      <p className="text-sm text-zinc-500">
        Loading jobs...
      </p>
    );
  }

  if (countError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Could not load jobs
        </p>

        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {getFriendlyError(countError)}
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (jobCount === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No jobs created yet.
      </p>
    );
  }

  if (isLoadingJobs) {
    return (
      <p className="text-sm text-zinc-500">
        Loading jobs...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Jobs
        </h2>

        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Refresh
        </button>
      </div>

      {jobs?.map((result, jobId) => {
        if (result.status !== "success" || !result.result) {
          return (
            <div
              key={jobId}
              className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30"
            >
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Job #{jobId} could not be loaded
              </p>

              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {getFriendlyError(
                  "error" in result ? result.error : undefined
                )}
              </p>

              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                Try Again
              </button>
            </div>
          );
        }

        const [
          client,
          workerAgent,
          verifierAgent,
          amount,
          deadline,
          proofURI,
          status,
        ] = result.result as unknown as [
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          bigint,
          bigint,
          string,
          number,
        ];

        const job: JobData = {
          client,
          workerAgent,
          verifierAgent,
          amount,
          deadline,
          proofURI,
          status,
        };

        const isClient =
          myAddress?.toLowerCase() === client.toLowerCase();

        const isWorker =
          myAddress?.toLowerCase() === workerAgent.toLowerCase();

        return (
          <div
            key={jobId}
            className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
  Job #{jobId}
</span>

<span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
  {STATUS_LABELS[status] ?? "Unknown"}
</span>
</div>

<p className="text-zinc-500">
  Client: {truncate(client)} {isClient && "(you)"}
</p>

{workerAgent !== ZERO_ADDRESS && (
  <p className="text-zinc-500">
    Worker: {truncate(workerAgent)}{" "}
    {isWorker && "(you)"}
  </p>
)}

<p className="text-zinc-500">
  Amount: {formatEther(amount)} USDC
</p>

<p className="text-zinc-500">
  Deadline: {formatDeadline(deadline)}
</p>

{proofURI && (
  <p className="text-zinc-500">
    Proof: {proofURI}
  </p>
)}

<div className="mt-1">
  <JobActions
    jobId={jobId}
    job={job}
    myAddress={myAddress}
    onDone={handleDone}
  />
</div>
</div>
);
})}
</div>
);
}