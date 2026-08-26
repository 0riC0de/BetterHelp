"use client";

import { Alert, Container, Snackbar, Typography } from "@mui/material";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import DatabaseClearCard from "@/features/database/components/DatabaseClearCard";
import { getDatabaseOperations } from "@/features/database/helpers/getDatabaseOperations";
import { useDatabaseMaintenance } from "@/features/database/hooks/useDatabaseMaintenance";
import { useAuth } from "@/providers/AuthProvider";

export default function DatabasePage() {
  const auth = useAuth();
  const isAdmin = auth.technician?.role === "ADMIN";
  const database = useDatabaseMaintenance(isAdmin);
  if (!isAdmin) return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;
  if (!database.summary) return <Container sx={{ py: 4 }}><LoadingSkeleton variant="page" /></Container>;

  const operations = getDatabaseOperations(database.summary);

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
