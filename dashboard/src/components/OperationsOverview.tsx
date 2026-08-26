"use client";

import { Alert, Box, Container, Stack, Typography } from "@mui/material";

import { useTickets } from "@/hooks/useTickets";
import { useAuth } from "@/providers/AuthProvider";

import DashboardSkeleton from "./DashboardSkeleton";
import MetricsOverview from "./MetricsOverview";
import TicketMetadataPane from "./TicketMetadataPane";

export default function OperationsOverview() {
  const auth = useAuth();
  const tickets = useTickets(auth.invalidate);
  if (tickets.isLoading) return <DashboardSkeleton />;

  const active = tickets.tickets.filter((ticket) => !ticket.archivedAt);
  return (
    <Container component="main" maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4">Operations overview</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
        Ticket health, triage outcomes, and work requiring attention.
      </Typography>
      <MetricsOverview tickets={active} />
      {tickets.error && <Alert severity="error" sx={{ mt: 2 }}>{tickets.error}</Alert>}
      <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>Active ticket details</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {active.map((ticket) => (
          <Box key={ticket.id} sx={{ height: 520, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <TicketMetadataPane
              ticket={ticket}
              pending={tickets.pendingTicketIds.has(ticket.id)}
              onStatusChange={(status) => tickets.changeStatus(ticket.id, status)}
              onArchiveChange={(archived) => tickets.setArchived(ticket.id, archived)}
            />
          </Box>
        ))}
      </Box>
      {!active.length && <Stack sx={{ py: 8, alignItems: "center" }}><Typography color="text.secondary">No active tickets.</Typography></Stack>}
    </Container>
  );
}
