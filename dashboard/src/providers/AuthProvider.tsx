"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

import * as api from "@/services/api";
import type {
  AuthenticationStatus,
  Technician,
} from "@/types/auth";

interface AuthContextValue {
  status: AuthenticationStatus;
  technician: Technician | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  invalidate: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_CHANNEL_NAME = "helpdesk-auth";

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthenticationStatus>("loading");
  const [technician, setTechnician] = useState<Technician | null>(null);
  const operationGenerationRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    const operationGeneration = ++operationGenerationRef.current;
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(AUTH_CHANNEL_NAME);
    channelRef.current = channel;

    channel?.addEventListener("message", (event: MessageEvent<"login" | "logout">) => {
      const generation = ++operationGenerationRef.current;
      if (event.data === "logout") {
        setTechnician(null);
        setStatus("unauthenticated");
        void api.logout().catch(() => undefined);
        return;
      }

      void api
        .getCurrentTechnician()
        .then((currentTechnician) => {
          if (generation !== operationGenerationRef.current) return;
          setTechnician(currentTechnician);
          setStatus("authenticated");
        })
        .catch(() => undefined);
    });

    void api
      .getCurrentTechnician()
      .then((currentTechnician) => {
        if (operationGeneration !== operationGenerationRef.current) return;
        setTechnician(currentTechnician);
        setStatus("authenticated");
      })
      .catch(() => {
        if (operationGeneration !== operationGenerationRef.current) return;
        setTechnician(null);
        setStatus("unauthenticated");
      });

    return () => {
      operationGenerationRef.current += 1;
      channel?.close();
      channelRef.current = null;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const generation = ++operationGenerationRef.current;
    const currentTechnician = await api.login(email, password);
    if (generation !== operationGenerationRef.current) return;
    setTechnician(currentTechnician);
    setStatus("authenticated");
    channelRef.current?.postMessage("login");
  }

  async function logout(): Promise<void> {
    operationGenerationRef.current += 1;
    setTechnician(null);
    setStatus("unauthenticated");
    channelRef.current?.postMessage("logout");
    await api.logout();
  }

  function invalidate(): void {
    operationGenerationRef.current += 1;
    setTechnician(null);
    setStatus("unauthenticated");
    channelRef.current?.postMessage("logout");
  }

  return (
    <AuthContext value={{ status, technician, login, logout, invalidate }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
