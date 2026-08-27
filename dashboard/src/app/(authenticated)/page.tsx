"use client";

import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import TicketConversationView from "@/features/tickets/components/TicketConversationView";
import TicketInbox from "@/features/tickets/components/TicketInbox";
import { filterTicketsByMode, type TicketListMode } from "@/features/tickets/helpers/filterTicketsByMode";
import { useTickets } from "@/features/tickets/hooks/useTickets";
import { useQueues } from "@/features/queues/hooks/useQueues";
import { useAuth } from "@/providers/AuthProvider";
import { useConnectionStatus } from "@/providers/ConnectionStatusProvider";

export default function TicketsPage() {
  const auth = useAuth();
  const connection = useConnectionStatus();
  const tickets = useTickets(auth.invalidate);
  const queues = useQueues();
  const [mode, setMode] = useState<TicketListMode>("inbox");
  const [search, setSearch] = useState("");
  const [queueFilter, setQueueFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { connection.setStatus(tickets.connectionStatus); }, [connection, tickets.connectionStatus]);

  if (tickets.isLoading) return <LoadingSkeleton variant="conversation" />;
  const visibleTickets = filterTicketsByMode(tickets.tickets, mode, search, queueFilter);
  const selectedTicket = visibleTickets.find((ticket) => ticket.id === selectedId) ?? visibleTickets[0] ?? null;

  return (
    <Box component="main" sx={{ height: "calc(100dvh - 72px)", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.paper" }}>
      {tickets.error && <Alert severity="error">{tickets.error}</Alert>}
      <Box sx={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "380px minmax(0, 1fr)" }, overflow: "hidden" }}>
        <Box sx={{ display: { xs: selectedId ? "none" : "block", md: "block" }, height: "100%", minHeight: 0, overflow: "hidden" }}>
          <TicketInbox
            tickets={visibleTickets}
            queues={queues.queues}
            selectedId={selectedTicket?.id ?? null}
            mode={mode}
            search={search}
            queueFilter={queueFilter}
            now={now}
            onModeChange={(nextMode) => { setMode(nextMode); setSelectedId(null); }}
            onSearchChange={setSearch}
            onQueueFilterChange={(nextQueueFilter) => { setQueueFilter(nextQueueFilter); setSelectedId(null); }}
            onSelect={setSelectedId}
            onArchive={(id) => void tickets.setArchived(id, true)}
            onUnarchive={(id) => void tickets.setArchived(id, false)}
          />
        </Box>
        <Box sx={{ display: { xs: selectedId ? "block" : "none", md: "block" }, minWidth: 0, minHeight: 0 }}>
          {selectedTicket ? (
            <TicketConversationView key={selectedTicket.id} ticketId={selectedTicket.id} embedded onBack={() => setSelectedId(null)} />
          ) : (
            <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", color: "text.secondary" }}><Typography variant="h6">Select a conversation</Typography></Stack>
          )}
        </Box>
      </Box>
      <Snackbar open={Boolean(tickets.actionError)} autoHideDuration={6_000} onClose={tickets.clearActionError} message={tickets.actionError} />
    </Box>
  );
}
