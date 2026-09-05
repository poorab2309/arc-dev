"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Coins,
  ExternalLink,
  FileCheck2,
  FileClock,
  Inbox,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
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

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

type FilterType = "all" | "open" | "active" | "completed";

type JobData = {
  client: `0x${string}`;
  workerAgent: `0x${string}`;
  verifierAgent: `0x${string}`;
  amount: bigint;
  deadline: bigint;
  proofURI: string;
  status: number;
};

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatDeadline(deadline: bigint): string {
  return new Date(Number(deadline) * 1000).toLocaleString();
}

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
    return "The network is temporarily rate-limited. Please try again in a moment.";
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

function getStatusTone(status: string): string {
  switch (status) {
    case "Created":
      return "border-info/20 bg-info/10 text-info";
    case "Claimed":
      return "border-warning/20 bg-warning/10 text-warning";
    case "Submitted":
      return "border-primary/20 bg-primary/10 text-primary";
    case "Verified":
      return "border-success/20 bg-success/10 text-success";
    case "Cancelled":
      return "border-border bg-muted text-muted-foreground";
    case "Expired":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusTone(
        status,
      )}`}
    >
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

function AddressChip({
  address,
  label,
  you = false,
}: {
  address: `0x${string}`;
  label: string;
  you?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard unavailable; keep the UI unchanged.
    }
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {label}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          className="truncate font-mono text-xs text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          title={address}
        >
          {truncate(address)}
        </button>

        {you ? (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            you
          </span>
        ) : null}
      </div>

      <span className="shrink-0 text-[10px] text-muted-foreground">
        {copied ? "Copied" : "Copy"}
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>

        <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function ActionFeedback({
  actionLabel,
  hash,
  isPending,
  isConfirming,
  isConfirmed,
  error,
}: {
  actionLabel: string | null;
  hash: `0x${string}` | undefined;
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: Error | null;
}) {
  if (isPending) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card px-3.5 py-3 shadow-sm ring-1 ring-primary/10">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10">
          <Loader2
            className="size-4 animate-spin text-primary"
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            {actionLabel ?? "Transaction pending"}
          </p>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Confirm the transaction in your wallet…
          </p>
        </div>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card px-3.5 py-3 shadow-sm ring-1 ring-primary/10">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10">
          <Loader2
            className="size-4 animate-spin text-primary"
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            {actionLabel ?? "Transaction submitted"}
          </p>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Waiting for on-chain confirmation…
          </p>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-card px-3.5 py-3 shadow-sm ring-1 ring-success/10">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success/10">
          <CheckCircle2
            className="size-4 text-success"
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            {actionLabel
              ? `${actionLabel.replace("…", "")} confirmed`
              : "Transaction confirmed"}
          </p>

          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            State updated on-chain
            {hash ? (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={`https://testnet.arcscan.app/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View tx
                  <ExternalLink
                    className="size-3"
                    aria-hidden="true"
                  />
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-card px-3.5 py-3 shadow-sm ring-1 ring-destructive/10">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10">
          <XCircle
            className="size-4 text-destructive"
            aria-hidden="true"
          />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">
            Transaction failed
          </p>

          <p className="mt-0.5 text-xs leading-relaxed text-destructive">
            {getFriendlyError(error)}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

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
  const [actionLabel, setActionLabel] = useState<string | null>(
    null,
  );

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
  const statusLabel = STATUS_LABELS[job.status] ?? "Unknown";

  const deadlinePassed =
    block?.timestamp !== undefined &&
    block.timestamp > job.deadline;

  function claim() {
    setActionLabel("Claiming job");

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "claimJob",
      args: [BigInt(jobId)],
    });
  }

  function submit() {
    if (!proofURI.trim()) return;

    setActionLabel("Submitting work");

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "submitWork",
      args: [BigInt(jobId), proofURI.trim()],
    });
  }

  function verify() {
    setActionLabel("Verifying work");

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "verifyAndRelease",
      args: [BigInt(jobId)],
    });
  }

  function cancel() {
    setActionLabel("Cancelling job");

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "cancelJob",
      args: [BigInt(jobId)],
    });
  }

  function refundExpired() {
    setActionLabel("Refunding expired job");

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "refundExpired",
      args: [BigInt(jobId)],
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {statusLabel === "Created" && isClient ? (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle className="size-3.5" aria-hidden="true" />
            {busy && actionLabel === "Cancelling job"
              ? "Cancelling…"
              : "Cancel Job"}
          </button>
        ) : null}

        {statusLabel === "Created" && !isClient ? (
          <button
            type="button"
            onClick={claim}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Inbox className="size-3.5" aria-hidden="true" />
            {busy && actionLabel === "Claiming job"
              ? "Claiming…"
              : "Claim Job"}
          </button>
        ) : null}

        {statusLabel === "Claimed" && isWorker ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={proofURI}
              onChange={(event) =>
                setProofURI(event.target.value)
              }
              placeholder="Proof URI or description"
              disabled={busy}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={submit}
              disabled={busy || !proofURI.trim()}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileCheck2
                className="size-3.5"
                aria-hidden="true"
              />
              {busy && actionLabel === "Submitting work"
                ? "Submitting…"
                : "Submit Work"}
            </button>
          </div>
        ) : null}

        {statusLabel === "Submitted" && !isWorker ? (
          <button
            type="button"
            onClick={verify}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success px-3 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck
              className="size-3.5"
              aria-hidden="true"
            />
            {busy && actionLabel === "Verifying work"
              ? "Verifying…"
              : "Verify & Release"}
          </button>
        ) : null}

        {(statusLabel === "Created" ||
          statusLabel === "Claimed" ||
          statusLabel === "Submitted") &&
        deadlinePassed ? (
          <button
            type="button"
            onClick={refundExpired}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/10 px-3 text-xs font-medium text-warning transition-colors hover:bg-warning/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Clock3 className="size-3.5" aria-hidden="true" />
            {busy && actionLabel === "Refunding expired job"
              ? "Refunding…"
              : "Refund Expired Job"}
          </button>
        ) : null}
      </div>

      <ActionFeedback
        actionLabel={actionLabel}
        hash={hash}
        isPending={isPending}
        isConfirming={isConfirming}
        isConfirmed={isConfirmed}
        error={error}
      />
    </div>
  );
}

function matchesFilter(
  job: JobData,
  filter: FilterType,
): boolean {
  switch (filter) {
    case "open":
      return job.status === 0;

    case "active":
      return job.status === 1 || job.status === 2;

    case "completed":
      return job.status === 3;

    case "all":
    default:
      return true;
  }
}

export function JobList() {
  const { address: myAddress } = useConnection();

  const {
    data: nextJobId,
    isLoading: isLoadingCount,
    error: countError,
    refetch: refetchCount,
  } = useReadContract({
    address: jobEscrowAddress,
    abi: jobEscrowAbi,
    functionName: "nextJobId",
  });

  const jobCount = nextJobId ? Number(nextJobId) : 0;

  const {
    data: jobs,
    isLoading: isLoadingJobs,
    isFetching: isFetchingJobs,
    refetch,
  } = useReadContracts({
    contracts: Array.from({ length: jobCount }, (_, i) => ({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "getJob" as const,
      args: [BigInt(i)] as const,
    })),
    query: {
      enabled: jobCount > 0,
    },
  });

  const { data: block } = useBlock({
    watch: true,
  });

  const [filter, setFilter] = useState<FilterType>("all");

  const handleDone = useCallback(() => {
    void refetch();
    void refetchCount();
  }, [refetch, refetchCount]);

  const jobRows = useMemo(() => {
    if (!jobs) return [];

    return jobs.flatMap((result, index) => {
      if (result.status !== "success" || !result.result) {
        return [];
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

      return [
        {
          id: index,
          job: {
            client,
            workerAgent,
            verifierAgent,
            amount,
            deadline,
            proofURI,
            status,
          } satisfies JobData,
        },
      ];
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobRows.filter((row) =>
      matchesFilter(row.job, filter),
    );
  }, [jobRows, filter]);

  const stats = useMemo(() => {
    const currentTime = block?.timestamp;

    let activeEscrow = BigInt(0);
    let open = 0;
    let inProgress = 0;
    let completed = 0;

    for (const row of jobRows) {
      const { job } = row;

      if (
        job.status === 0 ||
        job.status === 1 ||
        job.status === 2
      ) {
        activeEscrow += job.amount;
      }

      if (job.status === 0) {
        open += 1;
      }

      if (job.status === 1 || job.status === 2) {
        inProgress += 1;
      }

      if (job.status === 3) {
        completed += 1;
      }

      void currentTime;
    }

    return {
      activeEscrow,
      open,
      inProgress,
      completed,
    };
  }, [block?.timestamp, jobRows]);

  if (isLoadingCount) {
    return (
      <section className="flex flex-col gap-5">
        <div>
          <div className="h-7 w-32 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-muted" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-card/70"
            />
          ))}
        </div>

        <div className="h-40 animate-pulse rounded-2xl border border-border bg-card/70" />
      </section>
    );
  }

  if (countError) {
    return (
      <section className="rounded-2xl border border-destructive/20 bg-card p-5 shadow-sm ring-1 ring-destructive/10">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/10">
            <AlertCircle
              className="size-4 text-destructive"
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-medium text-foreground">
              Could not load jobs
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {getFriendlyError(countError)}
            </p>

            <button
              type="button"
              onClick={() => {
                void refetchCount();
              }}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <RefreshCw
                className="size-3.5"
                aria-hidden="true"
              />
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layers
              className="size-5 text-primary"
              aria-hidden="true"
            />

            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Job Board
            </h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Live jobs and escrow state read directly from Arc
            Testnet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void refetch();
            void refetchCount();
          }}
          disabled={isFetchingJobs}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            className={`size-3.5 ${
              isFetchingJobs ? "animate-spin" : ""
            }`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={WalletCards}
          label="Active escrow"
          value={`${formatEther(stats.activeEscrow)} USDC`}
          helper="Funds currently locked in active jobs"
        />

        <StatCard
          icon={Inbox}
          label="Open jobs"
          value={String(stats.open)}
          helper="Created jobs waiting for an agent"
        />

        <StatCard
          icon={Clock3}
          label="In progress"
          value={String(stats.inProgress)}
          helper="Claimed or awaiting verification"
        />

        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={String(stats.completed)}
          helper="Jobs verified and paid out"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            Showing
          </span>

          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {filteredJobs.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All", Layers],
              ["open", "Open", Inbox],
              ["active", "Active", FileClock],
              ["completed", "Completed", FileCheck2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                filter === value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {jobCount === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Inbox className="size-5" aria-hidden="true" />
          </span>

          <h3 className="mt-4 text-sm font-medium text-foreground">
            No jobs yet
          </h3>

          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Create and fund your first escrow job to start the
            workflow.
          </p>
        </div>
      ) : isLoadingJobs ? (
        <div className="flex min-h-52 items-center justify-center rounded-2xl border border-border bg-card/40">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            Loading jobs…
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Layers className="size-4" aria-hidden="true" />
          </span>

          <h3 className="mt-3 text-sm font-medium text-foreground">
            No matching jobs
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Try switching the filter above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map(({ id: jobId, job }) => {
            const statusLabel =
              STATUS_LABELS[job.status] ?? "Unknown";

            const isClient =
              myAddress?.toLowerCase() ===
              job.client.toLowerCase();

            const isWorker =
              myAddress?.toLowerCase() ===
              job.workerAgent.toLowerCase();

            const isVerifier =
              myAddress?.toLowerCase() ===
              job.verifierAgent.toLowerCase();

            const currentTime =
              block?.timestamp !== undefined
                ? Number(block.timestamp)
                : Number(job.deadline);

            const deadlineSeconds = Number(job.deadline);
            const secondsRemaining =
              deadlineSeconds - currentTime;

            const deadlinePassed = secondsRemaining <= 0;

            const deadlineText = deadlinePassed
              ? "Deadline passed"
              : secondsRemaining < 60 * 60
                ? `${Math.max(
                    1,
                    Math.ceil(secondsRemaining / 60),
                  )} min remaining`
                : secondsRemaining < 24 * 60 * 60
                  ? `${Math.ceil(
                      secondsRemaining / (60 * 60),
                    )} hr remaining`
                  : `${Math.ceil(
                      secondsRemaining /
                        (24 * 60 * 60),
                    )} days remaining`;

            return (
              <article
                key={jobId}
                className="overflow-hidden rounded-2xl border border-border bg-card/70 shadow-sm transition-colors hover:border-border/80"
              >
                <div className="flex flex-col gap-5 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                          JOB #{jobId}
                        </span>

                        <StatusBadge status={statusLabel} />
                      </div>

                      <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">
                        USDC Escrow Job #{jobId}
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Trustless agent work escrow
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
                      <Coins
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Escrow
                        </p>

                        <p className="text-sm font-semibold text-foreground">
                          {formatEther(job.amount)} USDC
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-border bg-background/40 p-3 sm:grid-cols-2">
                    <AddressChip
                      address={job.client}
                      label="Client"
                      you={isClient}
                    />

                    {job.workerAgent !== ZERO_ADDRESS ? (
                      <AddressChip
                        address={job.workerAgent}
                        label="Worker"
                        you={isWorker}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          Worker
                        </span>

                        <span className="font-mono text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      </div>
                    )}

                    {job.verifierAgent !== ZERO_ADDRESS ? (
                      <AddressChip
                        address={job.verifierAgent}
                        label="Verifier"
                        you={isVerifier}
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">
                          Verifier
                        </span>

                        <span className="font-mono text-xs text-muted-foreground">
                          Pending
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <CalendarClock
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />

                        <span className="text-xs text-muted-foreground">
                          Deadline
                        </span>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-foreground">
                          {formatDeadline(job.deadline)}
                        </p>

                        <p
                          className={`text-[10px] ${
                            deadlinePassed
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {deadlineText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {job.proofURI ? (
                    <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                      <div className="flex items-start gap-2.5">
                        <FileCheck2
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">
                            Work proof
                          </p>

                          {/^https?:\/\//i.test(
                            job.proofURI,
                          ) ? (
                            <a
                              href={job.proofURI}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                            >
                              <span className="truncate">
                                {job.proofURI}
                              </span>
                              <ExternalLink
                                className="size-3 shrink-0"
                                aria-hidden="true"
                              />
                            </a>
                          ) : (
                            <p className="mt-1 break-all text-xs leading-relaxed text-muted-foreground">
                              {job.proofURI}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t border-border pt-4">
                    <JobActions
                      jobId={jobId}
                      job={job}
                      myAddress={myAddress}
                      onDone={handleDone}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Clock3
          className="size-3.5"
          aria-hidden="true"
        />
        <span>
          Job status, escrow amounts, deadlines, and actions are
          read from the deployed JobEscrow contract.
        </span>
      </div>
    </section>
  );
}