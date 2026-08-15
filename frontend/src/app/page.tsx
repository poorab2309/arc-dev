import { ConnectWallet } from "@/components/ConnectWallet";
import { JobCounter } from "@/components/JobCounter";
import { CreateJobForm } from "@/components/CreateJobForm";
import { JobList } from "@/components/JobList";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col gap-4 w-full">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Arc Job Escrow
          </h1>
          <ConnectWallet />
          <JobCounter />
          <CreateJobForm />
          <JobList />
        </div>
      </main>
    </div>
  );
}