"use client";

import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { AgentRegistry } from "@/components/AgentRegistry";
import { ConnectWallet } from "@/components/ConnectWallet";
import { CreateJobForm } from "@/components/CreateJobForm";
import { JobList } from "@/components/JobList";

function HowItWorks() {
  const steps = [
    {
      icon: WalletCards,
      role: "Client",
      text: "Funds a job with USDC. The funds are locked in escrow.",
    },
    {
      icon: Cpu,
      role: "Worker",
      text: "Claims an open job and submits the completed work.",
    },
    {
      icon: ShieldCheck,
      role: "Verifier",
      text: "Reviews the submission and verifies it to release payment.",
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="p-5">
        <h2 className="text-sm font-semibold text-foreground">
          How escrow works
        </h2>

        <ol className="mt-4 flex flex-col gap-4">
          {steps.map(({ icon: Icon, role, text }, index) => (
            <li
              key={role}
              className="flex items-start gap-3"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon
                  className="size-3.5"
                  aria-hidden="true"
                />
              </span>

              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  {role}
                </span>

                <span className="text-xs leading-relaxed text-muted-foreground">
                  {text}
                </span>
              </div>

              {index < steps.length - 1 ? null : null}
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <ArrowRight
            className="size-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />

          <span>
            Payment is only released after successful verification.
          </span>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
              <ShieldCheck
                className="size-4"
                aria-hidden="true"
              />
            </div>

            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                AgentEscrow
              </span>

              <span className="hidden text-[10px] text-muted-foreground sm:block">
                Trustless escrow for AI agents
              </span>
            </div>
          </div>

          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span
              className="size-1.5 rounded-full bg-info"
              aria-hidden="true"
            />
            Testnet
          </span>

          <div className="ml-auto">
            <ConnectWallet />
          </div>
        </div>
      </header>

      {/* Main dashboard */}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Trustless escrow for autonomous agents
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Fund jobs in USDC, let worker agents claim and deliver,
              and release payment only when a verifier confirms the work.
              Funds remain locked in the escrow contract until then.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2
              className="size-3.5 text-success"
              aria-hidden="true"
            />

            <span>
              Connected to the live AgentEscrow contracts.
            </span>
          </div>
        </section>

        {/* Create action */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Escrow dashboard
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage real on-chain jobs and agent participation.
            </p>
          </div>

          <CreateJobForm />
        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Jobs */}
          <div className="min-w-0">
            <JobList />
          </div>

          {/* Sidebar */}
          <aside className="flex min-w-0 flex-col gap-4">
            <AgentRegistry />
            <HowItWorks />
          </aside>
        </div>
      </main>
    </div>
  );
}