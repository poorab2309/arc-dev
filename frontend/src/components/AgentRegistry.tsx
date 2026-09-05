"use client";

import {
  CheckCircle2,
  Copy,
  Cpu,
  ExternalLink,
  Loader2,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
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

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function AgentRegistry() {
  const { address } = useConnection();

  const [name, setName] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [copied, setCopied] = useState(false);

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
      enabled: !!address,
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

  async function copyAddress() {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch {
      // Clipboard may be unavailable; fail silently.
    }
  }

  function register(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();

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

  function reactivate() {
    writeContract({
      address: agentRegistryAddress,
      abi: agentRegistryAbi,
      functionName: "reactivateAgent",
    });
  }

  const busy = isPending || isConfirming;

  const hasAgentRecord =
    !!agentData && Number(agentData[2]) !== 0;

  if (!address) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-muted">
            <Wallet
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">
              Agent profile
            </h2>

            <p className="max-w-sm text-sm text-muted-foreground">
              Connect your wallet to register as an agent and start
              participating in escrow jobs.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (hasAgentRecord && agentData) {
    const [agentName, agentMetadataURI, registeredAt, active] = agentData;

    return (
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-inset ring-primary/25">
                <Cpu className="size-5" aria-hidden="true" />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-semibold text-foreground">
                  {agentName}
                </span>

                <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <span>{shortenAddress(address)}</span>

                  <button
                    type="button"
                    onClick={copyAddress}
                    aria-label={copied ? "Address copied" : "Copy address"}
                    className="grid size-5 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {copied ? (
                      <CheckCircle2 className="size-3 text-success" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-muted-foreground/25 bg-muted text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  active ? "bg-success" : "bg-muted-foreground"
                }`}
                aria-hidden="true"
              />
              {active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck
                  className="size-3.5 text-primary"
                  aria-hidden="true"
                />
                Registration
              </div>

              <div className="mt-1 text-sm font-medium text-foreground">
                On-chain verified
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">
                Registered
              </div>

              <div className="mt-1 text-sm font-medium text-foreground">
                {new Date(
                  Number(registeredAt) * 1000
                ).toLocaleDateString()}
              </div>
            </div>
          </div>

          {agentMetadataURI ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">
                Metadata URI
              </div>

              <div className="mt-1 flex items-start gap-2">
                <p className="min-w-0 break-all font-mono text-xs text-foreground">
                  {agentMetadataURI}
                </p>

                {agentMetadataURI.startsWith("http") ? (
                  <a
                    href={agentMetadataURI}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open metadata URI"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ExternalLink
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {active ? (
            <button
              type="button"
              onClick={deactivate}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ShieldCheck
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              {isPending
                ? "Confirm in wallet…"
                : isConfirming
                  ? "Waiting for confirmation…"
                  : "Deactivate Agent"}
            </button>
          ) : (
            <button
              type="button"
              onClick={reactivate}
              disabled={busy}
              className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-success/25 bg-success/10 px-3.5 text-sm font-medium text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <Loader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ShieldCheck
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              {isPending
                ? "Confirm in wallet…"
                : isConfirming
                  ? "Waiting for confirmation…"
                  : "Reactivate Agent"}
            </button>
          )}

          {isConfirmed ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2
                className="size-4"
                aria-hidden="true"
              />
              Transaction confirmed.
            </p>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2">
              <p className="text-xs font-medium text-destructive">
                Transaction failed
              </p>

              <p className="mt-1 break-all text-xs text-destructive/85">
                {error.message.split("\n")[0]}
              </p>
            </div>
          ) : null}

          {hash ? (
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              Tx: {hash}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-inset ring-primary/25">
            <UserPlus className="size-5" aria-hidden="true" />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">
              Register agent
            </h2>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Register this wallet on-chain so it can participate as an agent.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <span
            className="size-2 rounded-full bg-success shadow-[0_0_0_3px] shadow-success/20"
            aria-hidden="true"
          />

          <span className="font-mono text-xs text-foreground">
            {shortenAddress(address)}
          </span>

          <span className="ml-auto text-[11px] text-muted-foreground">
            Connected
          </span>
        </div>

        <form
          onSubmit={register}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="agent-name"
              className="text-xs font-medium text-foreground"
            >
              Agent handle
            </label>

            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. atlas.agent"
              maxLength={32}
              disabled={busy}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="agent-metadata"
              className="text-xs font-medium text-foreground"
            >
              Metadata URI
            </label>

            <input
              id="agent-metadata"
              type="text"
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              placeholder="ipfs://... or https://..."
              disabled={busy}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2">
              <p className="text-xs font-medium text-destructive">
                Transaction failed
              </p>

              <p className="mt-1 break-all text-xs text-destructive/85">
                {error.message.split("\n")[0]}
              </p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <UserPlus
                className="size-4"
                aria-hidden="true"
              />
            )}

            {isPending
              ? "Confirm in wallet…"
              : isConfirming
                ? "Registering…"
                : "Register on-chain"}
          </button>
        </form>
      </div>
    </section>
  );
}