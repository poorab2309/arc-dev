"use client";

import { useReadContract } from "wagmi";

import { jobEscrowAbi, jobEscrowAddress } from "@/lib/JobEscrowABI";

/**
 * Reads nextJobId directly from the deployed JobEscrow contract.
 * nextJobId is also the total count of jobs ever created (ids start at 0).
 */
export function JobCounter() {
  const { data, isLoading, error } = useReadContract({
    address: jobEscrowAddress,
    abi: jobEscrowAbi,
    functionName: "nextJobId",
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading job count...</p>;
  }

  if (error) {
    console.error("Failed to read nextJobId:", error);
    return <p className="text-sm text-red-500">Could not load job count</p>;
  }

  return (
    <p className="text-sm text-zinc-700 dark:text-zinc-300">
      Total jobs created: {data?.toString()}
    </p>
  );
}