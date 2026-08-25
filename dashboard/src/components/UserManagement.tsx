"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import LockResetOutlined from "@mui/icons-material/LockResetOutlined";
import { Alert, Avatar, Button, Card, Chip, Container, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { ApiError, createTechnician, deleteTechnician, getTechnicians } from "@/services/api";
import type { CreateTechnicianInput, ManagedTechnician } from "@/types/technician";

import CreateTechnicianDialog from "./CreateTechnicianDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";
import UserManagementSkeleton from "./UserManagementSkeleton";

export default function UserManagement() {
  const auth = useAuth();
  const [users, setUsers] = useState<ManagedTechnician[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<ManagedTechnician | null>(null);

  useEffect(() => {
    let isActive = true;
    void getTechnicians()
      .then((technicians) => {
        if (!isActive) return;
        setUsers(technicians);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (isActive) setError(requestError instanceof ApiError ? requestError.message : "Users could not be loaded");
      })
      .finally(() => { if (isActive) setIsLoading(false); });
    return () => { isActive = false; };
  }, []);

  async function create(input: CreateTechnicianInput): Promise<void> {
    setIsSaving(true);
    try {
      const user = await createTechnician(input);
      setUsers((current) => [...current, user]);
      setDialogOpen(false);
      setError(null);
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : "User could not be created");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(user: ManagedTechnician): Promise<void> {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try {
      await deleteTechnician(user.id);
      setUsers((current) => current.filter((candidate) => candidate.id !== user.id));
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : "User could not be deleted");
    }
  }

  if (auth.technician?.role !== "ADMIN") {
    return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;
  }

  return (
    <Container component="main" maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <div><Typography variant="h4">User management</Typography><Typography color="text.secondary">Create and remove helpdesk access.</Typography></div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setDialogOpen(true)}>Create user</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? <UserManagementSkeleton /> : (
        <Stack spacing={1.5}>
          {users.map((user) => (
            <Card key={user.id} sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Avatar>{user.name[0]?.toUpperCase()}</Avatar>
                <Stack sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 700 }}>{user.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography></Stack>
                <Chip size="small" label={user.role === "ADMIN" ? "Admin" : "Technician"} />
                <Tooltip title="Reset password">
                  <span>
                    <IconButton color="warning" onClick={() => setResetTarget(user)} aria-label={`Reset password for ${user.name}`}>
                      <LockResetOutlined />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete user"><span><IconButton color="error" disabled={user.id === auth.technician?.id} onClick={() => void remove(user)}><DeleteOutline /></IconButton></span></Tooltip>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      <CreateTechnicianDialog key={dialogOpen ? "open" : "closed"} open={dialogOpen} error={error} isSaving={isSaving} onClose={() => setDialogOpen(false)} onCreate={create} />
      {resetTarget && (
        <ResetPasswordDialog
          open
          technicianId={resetTarget.id}
          technicianName={resetTarget.name}
          onClose={() => setResetTarget(null)}
        />
      )}
    </Container>
  );
}
