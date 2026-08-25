"use client";

import { createContext, useContext, useState } from "react";

import type { ConnectionStatus } from "@/types/realtime";

interface ConnectionStatusValue {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

const ConnectionStatusContext = createContext<ConnectionStatusValue | null>(null);

export function ConnectionStatusProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<ConnectionStatus>("syncing");
  return (
    <ConnectionStatusContext value={{ status, setStatus }}>
      {children}
    </ConnectionStatusContext>
  );
}

export function useConnectionStatus(): ConnectionStatusValue {
  const context = useContext(ConnectionStatusContext);
  if (!context) throw new Error("useConnectionStatus must be inside its provider");
  return context;
}
