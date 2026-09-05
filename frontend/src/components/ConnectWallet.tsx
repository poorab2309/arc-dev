"use client";

import { LogOut, Loader2, Wallet } from "lucide-react";
import { useConnection, useConnect, useDisconnect } from "wagmi";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 py-1 pr-1 pl-2.5">
        <span
          className="size-2 rounded-full bg-success shadow-[0_0_0_3px] shadow-success/20"
          aria-hidden="true"
        />

        <span className="px-1.5 font-mono text-xs text-foreground">
          {shortenAddress(address)}
        </span>

        <button
          type="button"
          onClick={() => disconnect()}
          aria-label="Disconnect wallet"
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
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
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Wallet className="size-4" aria-hidden="true" />
      )}

      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}