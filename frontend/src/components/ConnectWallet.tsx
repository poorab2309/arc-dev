"use client";

import { useConnection, useConnect, useDisconnect } from "wagmi";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectWallet() {
  const { address, isConnected } = useConnection();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find(
    (connector) => connector.id === "injected"
  );

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
          {truncateAddress(address)}
        </span>

        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending || !injectedConnector}
      onClick={() => {
        if (injectedConnector) {
          connect({ connector: injectedConnector });
        }
      }}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}