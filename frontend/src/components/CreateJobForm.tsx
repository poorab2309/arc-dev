"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Coins,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther } from "viem";
import {
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import {
  jobEscrowAbi,
  jobEscrowAddress,
} from "@/lib/JobEscrowABI";

function defaultDeadline(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);

  date.setMinutes(
    date.getMinutes() - date.getTimezoneOffset(),
  );

  return date.toISOString().slice(0, 16);
}

export function CreateJobForm() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [validationError, setValidationError] =
    useState<string | null>(null);

  const queryClient = useQueryClient();

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

  function handleOpen() {
    setValidationError(null);
    setOpen(true);
  }

  function handleClose() {
    if (isPending || isConfirming) return;

    setValidationError(null);
    setOpen(false);
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!amount || Number(amount) <= 0) {
      setValidationError(
        "Enter a USDC amount greater than 0.",
      );
      return;
    }

    const deadlineTime = new Date(deadline).getTime();

    if (
      !Number.isFinite(deadlineTime) ||
      deadlineTime <= Date.now()
    ) {
      setValidationError(
        "Choose a deadline in the future.",
      );
      return;
    }

    setValidationError(null);

    const deadlineSeconds = BigInt(
      Math.floor(deadlineTime / 1000),
    );

    writeContract({
      address: jobEscrowAddress,
      abi: jobEscrowAbi,
      functionName: "createJob",
      args: [deadlineSeconds],
      value: parseEther(amount),
    });
  }

  const busy = isPending || isConfirming;

  return (
    <>
      {/* Create job trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus
          className="size-4"
          aria-hidden="true"
        />
        New Job
      </button>

      {/* Success state */}
      {isConfirmed && !open ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5 text-xs text-success">
          <CheckCircle2
            className="size-4 shrink-0"
            aria-hidden="true"
          />

          <span>
            Job created successfully.
            {hash
              ? ` Tx: ${hash.slice(0, 10)}…`
              : ""}
          </span>
        </div>
      ) : null}

      {/* Modal */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-job-title"
            className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Coins
                    className="size-5"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    id="create-job-title"
                    className="text-base font-semibold text-foreground"
                  >
                    Create escrow job
                  </h2>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Fund the job with USDC. Funds remain
                    locked until the work is verified.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                aria-label="Close create job dialog"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Modal body */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 p-5"
            >
              {/* On-chain notice */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3">
                <p className="text-xs font-medium text-primary">
                  On-chain escrow
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This transaction creates a real JobEscrow
                  record and transfers the specified USDC into
                  the contract.
                </p>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="job-amount"
                  className="text-xs font-medium text-foreground"
                >
                  Escrow amount
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                    $
                  </span>

                  <input
                    id="job-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.0001"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="10.00"
                    disabled={busy}
                    autoFocus
                    className="h-11 w-full rounded-lg border border-input bg-background pl-7 pr-16 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    USDC
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  The amount is sent directly to the JobEscrow
                  contract.
                </p>
              </div>

              {/* Deadline */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="job-deadline"
                  className="text-xs font-medium text-foreground"
                >
                  Deadline
                </label>

                <div className="relative">
                  <CalendarClock
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <input
                    id="job-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(event.target.value)
                    }
                    disabled={busy}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 pl-10 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  The deadline must be in the future.
                </p>
              </div>

              {/* Validation error */}
              {validationError ? (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                  <p className="text-xs font-medium text-destructive">
                    {validationError}
                  </p>
                </div>
              ) : null}

              {/* Transaction error */}
              {error ? (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                  <p className="text-xs font-medium text-destructive">
                    Transaction failed
                  </p>

                  <p className="mt-1 break-all text-xs leading-relaxed text-destructive/85">
                    {error.message.split("\n")[0]}
                  </p>
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Coins
                      className="size-4"
                      aria-hidden="true"
                    />
                  )}

                  {isPending
                    ? "Confirm in wallet…"
                    : isConfirming
                      ? "Creating escrow…"
                      : "Fund & Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}