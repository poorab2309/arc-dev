"use client";

import { useCallback } from "react";

import { ConnectWallet } from "@/components/ConnectWallet";
import { AgentRegistry } from "@/components/AgentRegistry";
import { JobCounter } from "@/components/JobCounter";
import { CreateJobForm } from "@/components/CreateJobForm";
import { JobList } from "@/components/JobList";

export default function Home() {
  const handleJobCreated = useCallback(() => {
    window.dispatchEvent(new CustomEvent("job-created"));
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between bg-white px-16 py-32 dark:bg-black sm:items-start">
        <div className="flex w-full flex-col gap-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            AgentEscrow
          </h1>

          <ConnectWallet />

          <AgentRegistry />

          <JobCounter />

          <CreateJobForm />

          <JobList />
        </div>
      </main>
    </div>
  );
}