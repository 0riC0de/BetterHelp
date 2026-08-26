"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import { Alert, Button, Container, Snackbar, Stack, Typography } from "@mui/material";
import { useState } from "react";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import MachineCard from "@/features/inventory/components/MachineCard";
import MachineFormDialog from "@/features/inventory/components/MachineFormDialog";
import { useMachines } from "@/features/inventory/hooks/useMachines";
import type { Machine } from "@/features/inventory/model";
import { useAuth } from "@/providers/AuthProvider";

export default function WorkspacePage() {
  const auth = useAuth();
  const isAdmin = auth.technician?.role === "ADMIN";
  const inventory = useMachines(isAdmin);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  if (!isAdmin) return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;

  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <div><Typography variant="h4">Workspace inventory</Typography><Typography color="text.secondary">Manage machines and Wake-on-LAN.</Typography></div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setEditingMachine(null); setIsDialogOpen(true); }}>Add machine</Button>
      </Stack>
      {inventory.error && <Alert severity="error" sx={{ mb: 2 }}>{inventory.error}</Alert>}
      {inventory.isLoading ? <LoadingSkeleton variant="list" /> : (
        <Stack spacing={1.5}>
          {inventory.machines.map((machine) => <MachineCard key={machine.id} machine={machine} waking={inventory.wakingId === machine.id} onWake={() => void inventory.wake(machine)} onEdit={() => { setEditingMachine(machine); setIsDialogOpen(true); }} onDelete={() => void inventory.remove(machine)} />)}
          {!inventory.machines.length && <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>No machines in inventory yet.</Typography>}
        </Stack>
      )}
      <MachineFormDialog key={editingMachine ? `edit-${editingMachine.id}` : "create"} open={isDialogOpen} machine={editingMachine} error={inventory.error} isSaving={inventory.isSaving} onClose={() => { setIsDialogOpen(false); setEditingMachine(null); }} onSave={async (input) => { if (await inventory.save(input, editingMachine)) { setIsDialogOpen(false); setEditingMachine(null); } }} />
      <Snackbar open={Boolean(inventory.notice)} autoHideDuration={4_000} onClose={() => inventory.setNotice(null)} message={inventory.notice} />
    </Container>
  );
}
