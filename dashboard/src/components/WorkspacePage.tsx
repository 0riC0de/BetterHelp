"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import { Alert, Button, Container, Snackbar, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import {
  ApiError,
  createMachine,
  deleteMachine,
  getMachines,
  updateMachine,
  wakeMachine,
} from "@/services/api";
import type { Machine, MachineInput } from "@/types/machine";

import MachineCard from "./MachineCard";
import MachineFormDialog from "./MachineFormDialog";
import UserManagementSkeleton from "./UserManagementSkeleton";

export default function WorkspacePage() {
  const auth = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wakingId, setWakingId] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    void getMachines()
      .then((data) => { if (isActive) { setMachines(data); setError(null); } })
      .catch((err: unknown) => { if (isActive) setError(err instanceof ApiError ? err.message : "Machines could not be loaded"); })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, []);

  async function save(input: MachineInput): Promise<void> {
    setIsSaving(true);
    try {
      const result = editingMachine
        ? await updateMachine(editingMachine.id, input)
        : await createMachine(input);
      setMachines((current) => editingMachine
        ? current.map((m) => (m.id === result.id ? result : m))
        : [...current, result]);
      setDialogOpen(false);
      setEditingMachine(null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Machine could not be saved");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(machine: Machine): Promise<void> {
    if (!window.confirm(`Delete ${machine.name}?`)) return;
    try {
      await deleteMachine(machine.id);
      setMachines((current) => current.filter((m) => m.id !== machine.id));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Machine could not be deleted");
    }
  }

  async function wake(machine: Machine): Promise<void> {
    setWakingId(machine.id);
    try {
      await wakeMachine(machine.id);
      setSuccess(`Wake packet sent to ${machine.name}`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Wake packet failed");
    } finally {
      setWakingId(null);
    }
  }

  if (auth.technician?.role !== "ADMIN") {
    return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <div>
          <Typography variant="h4">Workspace inventory</Typography>
          <Typography color="text.secondary">Manage machines and Wake-on-LAN.</Typography>
        </div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setEditingMachine(null); setDialogOpen(true); }}>
          Add machine
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? <UserManagementSkeleton /> : (
        <Stack spacing={1.5}>
          {machines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              waking={wakingId === machine.id}
              onWake={() => void wake(machine)}
              onEdit={() => { setEditingMachine(machine); setDialogOpen(true); }}
              onDelete={() => void remove(machine)}
            />
          ))}
          {!machines.length && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
              No machines in inventory yet.
            </Typography>
          )}
        </Stack>
      )}
      <MachineFormDialog
        key={editingMachine ? `edit-${editingMachine.id}` : "create"}
        open={dialogOpen}
        machine={editingMachine}
        error={error}
        isSaving={isSaving}
        onClose={() => { setDialogOpen(false); setEditingMachine(null); }}
        onSave={save}
      />
      <Snackbar open={Boolean(success)} autoHideDuration={4_000} onClose={() => setSuccess(null)} message={success} />
    </Container>
  );
}
