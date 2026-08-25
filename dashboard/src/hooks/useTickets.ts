"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, getHealth, getTickets, updateTicketStatus } from "@/services/api";
import type { ConnectionStatus, TicketRealtimeEvent } from "@/types/realtime";
import type { Ticket, TicketStatus } from "@/types/ticket";

import { useTicketRealtime } from "./useTicketRealtime";

const FALLBACK_POLL_INTERVAL_MS = 10_000;

function upsertTicket(tickets: Ticket[], ticket: Ticket): Ticket[] {
  const existingIndex = tickets.findIndex((candidate) => candidate.id === ticket.id);
  if (existingIndex === -1) return [ticket, ...tickets];
  return [ticket, ...tickets.filter((candidate) => candidate.id !== ticket.id)];
}

interface UseTicketsResult {
  tickets: Ticket[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  actionError: string | null;
  connectionStatus: ConnectionStatus;
  autoRefresh: boolean;
  pendingTicketIds: ReadonlySet<number>;
  setAutoRefresh: (enabled: boolean) => void;
  refresh: () => Promise<void>;
  changeStatus: (ticketId: number, status: TicketStatus) => Promise<void>;
  clearActionError: () => void;
}

export function useTickets(onUnauthorized: () => void): UseTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("syncing");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [pendingTicketIds, setPendingTicketIds] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const bufferedEventsRef = useRef<TicketRealtimeEvent[]>([]);
  const eventVersionsRef = useRef(new Map<number, number>());
  const isSynchronizingRef = useRef(true);
  const isRealtimeConnectedRef = useRef(false);
  const autoRefreshRef = useRef(autoRefresh);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const synchronizationRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    autoRefreshRef.current = autoRefresh;
  }, [autoRefresh]);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const synchronize = useCallback((): Promise<void> => {
    if (synchronizationRef.current) return synchronizationRef.current;

    isSynchronizingRef.current = true;
    setIsRefreshing(true);
    const operation = (async () => {
      try {
        const [response] = await Promise.all([
          getTickets(),
          getHealth().catch(() => null),
        ]);
        const synchronizedTickets = bufferedEventsRef.current
          .splice(0)
          .reduce(
            (current, event) => upsertTicket(current, event.ticket),
            response.tickets,
          );
        setTickets(synchronizedTickets);
        setError(null);
        setConnectionStatus(
          isRealtimeConnectedRef.current
            ? "live"
            : autoRefreshRef.current
              ? "polling"
              : "reconnecting",
        );
      } catch (requestError: unknown) {
        if (
          requestError instanceof ApiError &&
          [401, 403].includes(requestError.status)
        ) {
          onUnauthorizedRef.current();
        }
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to load tickets",
        );
        setConnectionStatus("offline");
      } finally {
        isSynchronizingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
        synchronizationRef.current = null;
      }
    })();
    synchronizationRef.current = operation;
    return operation;
  }, []);

  useTicketRealtime({
    onReady: () => {
      isRealtimeConnectedRef.current = true;
      setConnectionStatus("syncing");
      void synchronize();
    },
    onTicket: (event) => {
      eventVersionsRef.current.set(
        event.ticket.id,
        (eventVersionsRef.current.get(event.ticket.id) ?? 0) + 1,
      );
      if (isSynchronizingRef.current) bufferedEventsRef.current.push(event);
      else setTickets((current) => upsertTicket(current, event.ticket));
    },
    onGap: () => void synchronize(),
    onMessage: (event) => {
      setTickets((current) => upsertTicket(current, event.ticket));
    },
    onStatus: (status) => {
      if (status === "reconnecting") isRealtimeConnectedRef.current = false;
      setConnectionStatus(status);
    },
    onUnauthorized,
  });

  useEffect(() => void synchronize(), [synchronize]);

  useEffect(() => {
    if (!autoRefresh || ["live", "syncing"].includes(connectionStatus)) return;
    let isCancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (): void => {
      timer = setTimeout(() => {
        void synchronize().finally(() => {
          if (!isCancelled) schedule();
        });
      }, FALLBACK_POLL_INTERVAL_MS);
    };
    schedule();
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [autoRefresh, connectionStatus, synchronize]);

  async function changeStatus(ticketId: number, status: TicketStatus): Promise<void> {
    const previousTicket = tickets.find((ticket) => ticket.id === ticketId);
    if (!previousTicket) return;
    const eventVersion = eventVersionsRef.current.get(ticketId) ?? 0;

    setPendingTicketIds((current) => new Set(current).add(ticketId));
    setTickets((current) =>
      upsertTicket(current, {
        ...previousTicket,
        status,
        resolvedAt: status === "resolved" ? new Date().toISOString() : null,
      }),
    );

    try {
      await updateTicketStatus(ticketId, status);
      await synchronize();
    } catch (requestError: unknown) {
      if ((eventVersionsRef.current.get(ticketId) ?? 0) === eventVersion) {
        setTickets((current) => upsertTicket(current, previousTicket));
      }
      if (
        requestError instanceof ApiError &&
        [401, 403].includes(requestError.status)
      ) {
        onUnauthorizedRef.current();
      }
      setActionError(
        requestError instanceof ApiError
          ? requestError.message
          : "Ticket status could not be updated",
      );
      await synchronize();
    } finally {
      setPendingTicketIds((current) => {
        const next = new Set(current);
        next.delete(ticketId);
        return next;
      });
    }
  }

  return {
    tickets,
    isLoading,
    isRefreshing,
    error,
    actionError,
    connectionStatus,
    autoRefresh,
    pendingTicketIds,
    setAutoRefresh,
    refresh: synchronize,
    changeStatus,
    clearActionError: () => setActionError(null),
  };
}
