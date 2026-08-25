"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { ApiError, refreshSession } from "@/services/api";
import { createDashboardSocket } from "@/services/socket";
import type {
  ConnectionStatus,
  RealtimeReadyEvent,
  TicketRealtimeEvent,
} from "@/types/realtime";

interface RealtimeOptions {
  onReady: (event: RealtimeReadyEvent) => void;
  onTicket: (event: TicketRealtimeEvent) => void;
  onGap: () => void;
  onStatus: (status: ConnectionStatus) => void;
  onUnauthorized: () => void;
}

function isUnauthorizedError(error: Error & { data?: unknown }): boolean {
  return (
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    error.data.code === "UNAUTHORIZED"
  );
}

export function useTicketRealtime(options: RealtimeOptions): void {
  const handleReady = useEffectEvent(options.onReady);
  const handleTicket = useEffectEvent(options.onTicket);
  const handleGap = useEffectEvent(options.onGap);
  const handleStatus = useEffectEvent(options.onStatus);
  const handleUnauthorized = useEffectEvent(options.onUnauthorized);
  const streamIdRef = useRef<string | undefined>(undefined);
  const sequenceRef = useRef(0);

  useEffect(() => {
    const socket = createDashboardSocket();
    let isRefreshing = false;
    let isDisposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect(delayMs = 2_000): void {
      if (isDisposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (!isDisposed) socket.connect();
      }, delayMs);
    }

    function recoverAuthentication(): void {
      if (isRefreshing) return;
      isRefreshing = true;
      void refreshSession()
        .then(() => {
          if (!isDisposed) socket.connect();
        })
        .catch((error: unknown) => {
          if (isDisposed) return;
          if (error instanceof ApiError && [401, 403].includes(error.status)) {
            socket.disconnect();
            handleUnauthorized();
            return;
          }
          scheduleReconnect();
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    function acceptTicketEvent(event: TicketRealtimeEvent): void {
      if (event.streamId !== streamIdRef.current) {
        streamIdRef.current = event.streamId;
        sequenceRef.current = event.sequence;
        handleGap();
        handleTicket(event);
        return;
      }

      if (event.sequence <= sequenceRef.current) return;
      if (event.sequence !== sequenceRef.current + 1) handleGap();
      sequenceRef.current = event.sequence;
      handleTicket(event);
    }

    socket.on("realtime:ready", (event) => {
      streamIdRef.current = event.streamId;
      sequenceRef.current = event.lastSequence;
      handleReady(event);
    });
    socket.on("ticket:created", acceptTicketEvent);
    socket.on("ticket:updated", acceptTicketEvent);
    socket.on("realtime:checkpoint", (event) => {
      if (
        event.streamId !== streamIdRef.current ||
        event.lastSequence > sequenceRef.current
      ) {
        streamIdRef.current = event.streamId;
        sequenceRef.current = event.lastSequence;
        handleGap();
      }
    });
    socket.on("realtime:shutdown", (event) => {
      handleStatus("reconnecting");
      scheduleReconnect(event.retryAfterMs);
    });
    socket.on("auth:expired", recoverAuthentication);
    socket.on("disconnect", (reason) => {
      if (reason === "io client disconnect") return;
      handleStatus("reconnecting");
      if (reason === "io server disconnect") scheduleReconnect();
    });
    socket.on("connect_error", (error) => {
      handleStatus("reconnecting");
      if (isUnauthorizedError(error)) recoverAuthentication();
    });

    socket.connect();
    return () => {
      isDisposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);
}
