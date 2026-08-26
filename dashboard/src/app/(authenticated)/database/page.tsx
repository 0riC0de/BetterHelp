"use client";

import { Alert, Container, Snackbar, Typography } from "@mui/material";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import DatabaseClearCard from "@/features/database/components/DatabaseClearCard";
import { useDatabaseMaintenance } from "@/features/database/hooks/useDatabaseMaintenance";
import type { ClearTarget } from "@/features/database/model";
import { useAuth } from "@/providers/AuthProvider";

export default function DatabasePage() {
  const auth = useAuth();
  const isAdmin = auth.technician?.role === "ADMIN";
  const database = useDatabaseMaintenance(isAdmin);
  if (!isAdmin) return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;
  if (!database.summary) return <Container sx={{ py: 4 }}><LoadingSkeleton variant="page" /></Container>;

  const operations: Array<{ target: ClearTarget; title: string; description: string; count: number }> = [
    { target: "archived_tickets", title: "Archived tickets", description: "Deletes archived tickets and their messages.", count: database.summary.archivedTickets },
    { target: "all_tickets", title: "All tickets", description: "Deletes every ticket and message while preserving users.", count: database.summary.tickets },
    { target: "message_history", title: "Message history", description: "Deletes messages but keeps ticket records.", count: database.summary.messages },
    { target: "ticket_media", title: "Stored media", description: "Removes attachment bytes while preserving message text.", count: database.summary.messagesWithMedia },
    { target: "profile_pictures", title: "Profile references", description: "Clears cached WhatsApp profile references.", count: database.summary.profilePictures },
    { target: "wake_attempts", title: "Wake-on-LAN logs", description: "Deletes Wake-on-LAN audit entries.", count: database.summary.wakeAttempts },
    { target: "expired_refresh_tokens", title: "Expired sessions", description: "Deletes expired and revoked refresh tokens only.", count: database.summary.expiredOrRevokedRefreshTokens },
    { target: "inventory", title: "Inventory", description: `Deletes ${database.summary.machines} machines and ${database.summary.departments} departments.`, count: database.summary.machines + database.summary.departments },
  ];

  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Database maintenance</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Clear selected operational data without exposing SQL or technician credentials.</Typography>
      {database.error && <Alert severity="error" sx={{ mb: 2 }}>{database.error}</Alert>}
      <Container disableGutters sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {operations.map((operation) => <DatabaseClearCard key={operation.target} {...operation} isPending={database.pendingTarget === operation.target} onClear={(target) => void database.clear(target)} />)}
      </Container>
      <Snackbar open={Boolean(database.notice)} autoHideDuration={4_000} onClose={() => database.setNotice(null)} message={database.notice} />
    </Container>
  );
}
