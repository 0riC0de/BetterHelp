"use client";

import { Alert, Box, Container, Stack, Typography } from "@mui/material";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import MetricsOverview from "@/features/tickets/components/MetricsOverview";
import TicketMetadataPane from "@/features/tickets/components/TicketMetadataPane";
import { useTickets } from "@/features/tickets/hooks/useTickets";
import { useAuth } from "@/providers/AuthProvider";

export default function OverviewPage() {
  const auth = useAuth();
  const tickets = useTickets(auth.invalidate);
  if (tickets.isLoading) return <Container sx={{ py: 4 }}><LoadingSkeleton variant="page" /></Container>;
  const activeTickets = tickets.tickets.filter((ticket) => !ticket.archivedAt);

  return (
    <Container component="main" maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4">Operations overview</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>Ticket health, triage outcomes, and work requiring attention.</Typography>
      <MetricsOverview tickets={activeTickets} />
      {tickets.error && <Alert severity="error" sx={{ mt: 2 }}>{tickets.error}</Alert>}
      <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>Active ticket details</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {activeTickets.map((ticket) => (
          <Box key={ticket.id} sx={{ height: 520, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <TicketMetadataPane ticket={ticket} pending={tickets.pendingTicketIds.has(ticket.id)} onStatusChange={(status) => tickets.changeStatus(ticket.id, status)} onArchiveChange={(archived) => tickets.setArchived(ticket.id, archived)} />
          </Box>
        ))}
      </Box>
      {!activeTickets.length && <Stack sx={{ py: 8, alignItems: "center" }}><Typography color="text.secondary">No active tickets.</Typography></Stack>}
    </Container>
  );
}
