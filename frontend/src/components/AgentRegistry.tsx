"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useConnection,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  agentRegistryAbi,
  agentRegistryAddress,
} from "@/lib/AgentRegistryABI";

export function AgentRegistry() {
  const { address } = useConnection();

  const [name, setName] = useState("");
  const [metadataURI, setMetadataURI] = useState("");

  const queryClient = useQueryClient();

  const { data: isRegistered } = useReadContract({
    address: agentRegistryAddress,
    abi: agentRegistryAbi,
    functionName: "isRegisteredAgent",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const { data: agentData } = useReadContract({
    address: agentRegistryAddress,
    abi: agentRegistryAbi,
    functionName: "getAgent",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!isRegistered,
    },
  });

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

  useEffect(() => {
  if (!isConfirmed) return;

  queryClient.invalidateQueries();
}, [isConfirmed, queryClient]);

  function register() {
    if (!name.trim()) return;

    writeContract({
      address: agentRegistryAddress,
      abi: agentRegistryAbi,
      functionName: "registerAgent",
      args: [name.trim(), metadataURI.trim()],
    });
  }

  function deactivate() {
    writeContract({
      address: agentRegistryAddress,
      abi: agentRegistryAbi,
      functionName: "deactivateAgent",
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    register();
  }

  const busy = isPending || isConfirming;

  if (!address) {
    return (
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Agent Registry
        </h2>

        <p className="mt-2 text-sm text-zinc-500">
          Connect your wallet to register as an agent.
        </p>
      </div>
    );
  }

  if (isRegistered && agentData) {
    const [agentName, agentMetadataURI, registeredAt, active] = agentData;

    return (
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Agent Registry
        </h2>

        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            <span className="font-medium">Name:</span> {agentName}
          </p>

          {agentMetadataURI && (
            <p className="mt-1 break-all">
              <span className="font-medium">Metadata:</span>{" "}
              {agentMetadataURI}
            </p>
          )}

          <p className="mt-1">
            <span className="font-medium">Status:</span>{" "}
            {active ? "Active" : "Inactive"}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Registered:{" "}
            {new Date(Number(registeredAt) * 1000).toLocaleString()}
          </p>
        </div>

        {active && (
          <button
            type="button"
            onClick={deactivate}
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isPending
              ? "Confirm in wallet..."
              : isConfirming
                ? "Waiting for confirmation..."
                : "Deactivate Agent"}
          </button>
        )}

        {isConfirmed && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Transaction confirmed.
          </p>
        )}

        {error && (
          <p className="break-all text-sm text-red-500">
            {error.message.split("\n")[0]}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Register as an Agent
      </h2>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Agent Name

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="WorkerBot"
          disabled={busy}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Metadata URI

        <input
          type="text"
          value={metadataURI}
          onChange={(e) => setMetadataURI(e.target.value)}
          placeholder="ipfs://... or https://..."
          disabled={busy}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending
          ? "Confirm in wallet..."
          : isConfirming
            ? "Waiting for confirmation..."
            : "Register Agent"}
      </button>

      {isConfirmed && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Agent registered successfully!
        </p>
      )}

      {error && (
        <p className="break-all text-sm text-red-500">
          {error.message.split("\n")[0]}
        </p>
      )}
    </form>
  );
}