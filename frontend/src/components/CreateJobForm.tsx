"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

import { jobEscrowAbi, jobEscrowAddress } from "@/lib/JobEscrowABI";

/**
 * Form to create a new job on JobEscrow. Locks native USDC (Arc's gas token)
 * for the amount entered, with a deadline set N hours from now.
 */
export function CreateJobForm() {
  const [amount, setAmount] = useState("");
  const [hoursUntilDeadline, setHoursUntilDeadline] = useState("24");

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) return;

    const deadline = BigInt(
      Math.floor(Date.now() / 1000) + Number(hoursUntilDeadline) * 3600
    );

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "createJob",
      args: [deadline],
      value: parseEther(amount),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Create a job
      </h2>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Amount (USDC)
        <input
          type="number"
          step="0.0001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1.0"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Deadline (hours from now)
        <input
          type="number"
          min="1"
          value={hoursUntilDeadline}
          onChange={(e) => setHoursUntilDeadline(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <button
        type="submit"
        disabled={isPending || isConfirming}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending
          ? "Confirm in wallet..."
          : isConfirming
            ? "Waiting for confirmation..."
            : "Create Job"}
      </button>

      {isConfirmed && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Job created! Tx: {hash?.slice(0, 10)}...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">
          {error.message.split("\n")[0]}
        </p>
      )}
    </form>
  );
}
