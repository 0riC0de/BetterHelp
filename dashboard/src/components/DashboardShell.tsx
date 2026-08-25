"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Alert, Chip, Container, Snackbar, Stack, Typography } from "@mui/material";

import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/providers/AuthProvider";
import type { TicketFiltersState } from "@/types/ticket";
import { filterTickets } from "@/utils/tickets";

import MetricsOverview from "./MetricsOverview";
import TicketFilters from "./TicketFilters";
import TicketList, { EMPTY_FILTERS } from "./TicketList";
import DashboardSkeleton from "./DashboardSkeleton";

export default function DashboardShell() {
  const auth = useAuth();
  const ticketState = useTickets(auth.invalidate);
  const [filters, setFilters] = useState<TicketFiltersState>(EMPTY_FILTERS);
  const [now, setNow] = useState(() => Date.now());
  const deferredSearch = useDeferredValue(filters.search);
  const visibleTickets = filterTickets(ticketState.tickets, filters, deferredSearch);
  const connectionLabel = {
    live: "Live",
    syncing: "Syncing",
    reconnecting: "Reconnecting",
    polling: "REST fallback",
    offline: "Offline",
  }[ticketState.connectionStatus];

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  function handleFiltersChange(nextFilters: TicketFiltersState): void {
    startTransition(() => setFilters(nextFilters));
  }

  if (ticketState.isLoading) return <DashboardSkeleton />;

  return (
    <>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Stack direction="row" sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
            <Stack spacing={0.5}>
              <Typography variant="h4">Ticket Operations</Typography>
            <Typography color="text.secondary">
              Live intake, Gemini triage, and technician resolution in one feed.
            </Typography>
            </Stack>
            <Chip size="small" label={connectionLabel} />
          </Stack>

          <MetricsOverview tickets={ticketState.tickets} />
          {ticketState.error && (
            <Alert severity="error" action={
              <Typography
                component="button"
                onClick={() => void ticketState.refresh()}
                sx={{ border: 0, bgcolor: "transparent", cursor: "pointer", fontWeight: 700 }}
              >
                Retry
              </Typography>
            }>
              {ticketState.error}
            </Alert>
          )}
          <TicketFilters
            filters={filters}
            resultCount={visibleTickets.length}
            autoRefresh={ticketState.autoRefresh}
            isRefreshing={ticketState.isRefreshing}
            onChange={handleFiltersChange}
            onAutoRefreshChange={ticketState.setAutoRefresh}
            onRefresh={ticketState.refresh}
          />
          <TicketList
            tickets={visibleTickets}
            isLoading={ticketState.isLoading}
            now={now}
            pendingTicketIds={ticketState.pendingTicketIds}
            onStatusChange={ticketState.changeStatus}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
          />
        </Stack>
      </Container>
      <Snackbar
        open={Boolean(ticketState.actionError)}
        autoHideDuration={6_000}
        onClose={ticketState.clearActionError}
        message={ticketState.actionError}
      />
    </>
  );
}
