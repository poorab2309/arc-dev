"use client";

import { useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
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
 * A single job's action button(s), shown conditionally based on status
 * and whether the connected wallet is the client or worker.
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
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Refetch the job list once a tx confirms.
  if (isConfirmed) {
    onDone();
  }

  const isClient = myAddress?.toLowerCase() === job.client.toLowerCase();
  const isWorker = myAddress?.toLowerCase() === job.workerAgent.toLowerCase();
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

  const statusLabel = STATUS_LABELS[job.status];

  return (
    <div className="flex flex-col gap-2">
      {statusLabel === "Created" && !isClient && (
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="self-start rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Working..." : "Claim Job"}
        </button>
      )}

      {statusLabel === "Claimed" && isWorker && (
        <div className="flex gap-2">
          <input
            type="text"
            value={proofURI}
            onChange={(e) => setProofURI(e.target.value)}
            placeholder="Proof URI or description"
            className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Working..." : "Submit Work"}
          </button>
        </div>
      )}

      {statusLabel === "Submitted" && !isWorker && (
        <button
          type="button"
          onClick={verify}
          disabled={busy}
          className="self-start rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-60"
        >
          {busy ? "Working..." : "Verify & Release"}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-500">{error.message.split("\n")[0]}</p>
      )}
    </div>
  );
}

/**
 * Fetches nextJobId, then reads every job (0 .. nextJobId - 1) via getJob
 * in a single batched multicall, and renders each as a card with actions.
 */
export function JobList() {
  const { address: myAddress } = useAccount();

  const { data: nextJobId, isLoading: isLoadingCount } = useReadContract({
    address: jobEscrowAddress,
    abi: jobEscrowAbi,
    functionName: "nextJobId",
  });

  const jobCount = nextJobId ? Number(nextJobId) : 0;

  const { data: jobs, isLoading: isLoadingJobs, refetch } = useReadContracts({
    contracts: Array.from({ length: jobCount }, (_, i) => ({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "getJob",
      args: [BigInt(i)],
    })),
    query: { enabled: jobCount > 0 },
  });

  if (isLoadingCount || (jobCount > 0 && isLoadingJobs)) {
    return <p className="text-sm text-zinc-500">Loading jobs...</p>;
  }

  if (jobCount === 0) {
    return <p className="text-sm text-zinc-500">No jobs created yet.</p>;
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
              className="rounded-lg border border-red-300 p-3 text-sm text-red-500"
            >
              Job #{jobId}: failed to load
            </div>
          );
        }

        const [client, workerAgent, verifierAgent, amount, deadline, proofURI, status] =
          result.result as [
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

        const isClient = myAddress?.toLowerCase() === client.toLowerCase();
        const isWorker = myAddress?.toLowerCase() === workerAgent.toLowerCase();

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
                Worker: {truncate(workerAgent)} {isWorker && "(you)"}
              </p>
            )}
            <p className="text-zinc-500">Amount: {formatEther(amount)} USDC</p>
            <p className="text-zinc-500">Deadline: {formatDeadline(deadline)}</p>
            {proofURI && <p className="text-zinc-500">Proof: {proofURI}</p>}

            <div className="mt-1">
              <JobActions
                jobId={jobId}
                job={job}
                myAddress={myAddress}
                onDone={() => refetch()}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
