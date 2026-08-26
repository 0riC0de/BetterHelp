"use client";

import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/providers/AuthProvider";
import { useConnectionStatus } from "@/providers/ConnectionStatusProvider";

import DashboardSkeleton from "./DashboardSkeleton";
import TicketConversationView from "./TicketConversationView";
import TicketInbox from "./TicketInbox";

export default function DashboardShell() {
  const auth = useAuth();
  const connection = useConnectionStatus();
  const ticketState = useTickets(auth.invalidate);
  const [mode, setMode] = useState<"inbox" | "archived">("inbox");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { connection.setStatus(ticketState.connectionStatus); }, [connection, ticketState.connectionStatus]);

  if (ticketState.isLoading) return <DashboardSkeleton />;

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const modeTickets = ticketState.tickets.filter((ticket) =>
    mode === "archived" ? Boolean(ticket.archivedAt) : !ticket.archivedAt,
  );
  const visibleTickets = modeTickets.filter((ticket) => {
    if (!normalizedSearch) return true;
    return [ticket.userName, ticket.userPhone, ticket.summary, ticket.rawMessage]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });
  const selectedTicket =
    visibleTickets.find((ticket) => ticket.id === selectedId) ?? visibleTickets[0] ?? null;

  return (
    <Box
      component="main"
      sx={{ height: "calc(100dvh - 72px)", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.paper" }}
    >
      {ticketState.error && <Alert severity="error">{ticketState.error}</Alert>}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "380px minmax(0, 1fr)" },
          overflow: "hidden",
        }}
      >
          <Box sx={{ display: { xs: selectedId ? "none" : "block", md: "block" }, height: "100%", minHeight: 0, overflow: "hidden" }}>
            <TicketInbox
              tickets={visibleTickets}
              selectedId={selectedTicket?.id ?? null}
              mode={mode}
              search={search}
              now={now}
              onModeChange={(nextMode) => { setMode(nextMode); setSelectedId(null); }}
              onSearchChange={setSearch}
              onSelect={setSelectedId}
              onArchive={(id) => void ticketState.setArchived(id, true)}
              onUnarchive={(id) => void ticketState.setArchived(id, false)}
            />
          </Box>
          <Box sx={{ display: { xs: selectedId ? "block" : "none", md: "block" }, minWidth: 0, minHeight: 0 }}>
            {selectedTicket ? (
              <TicketConversationView
                key={selectedTicket.id}
                ticketId={selectedTicket.id}
                embedded
                onBack={() => setSelectedId(null)}
              />
            ) : (
              <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", color: "text.secondary" }}>
                <Typography variant="h6">Select a conversation</Typography>
              </Stack>
            )}
          </Box>
      </Box>
      <Snackbar open={Boolean(ticketState.actionError)} autoHideDuration={6_000} onClose={ticketState.clearActionError} message={ticketState.actionError} />
    </Box>
  );
}
