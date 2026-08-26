"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import LockResetOutlined from "@mui/icons-material/LockResetOutlined";
import { Alert, Avatar, Button, Card, Chip, Container, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import CreateTechnicianDialog from "@/features/technicians/components/CreateTechnicianDialog";
import ResetPasswordDialog from "@/features/technicians/components/ResetPasswordDialog";
import { useTechnicians } from "@/features/technicians/hooks/useTechnicians";
import type { ManagedTechnician } from "@/features/technicians/model";
import { useAuth } from "@/providers/AuthProvider";

export default function UsersPage() {
  const auth = useAuth();
  const isAdmin = auth.technician?.role === "ADMIN";
  const users = useTechnicians(isAdmin);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedTechnician | null>(null);
  if (!isAdmin) return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;

  return (
    <Container component="main" maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <div><Typography variant="h4">User management</Typography><Typography color="text.secondary">Create and remove helpdesk access.</Typography></div>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setIsCreateOpen(true)}>Create user</Button>
      </Stack>
      {users.error && <Alert severity="error" sx={{ mb: 2 }}>{users.error}</Alert>}
      {users.isLoading ? <LoadingSkeleton variant="list" /> : (
        <Stack spacing={1.5}>{users.technicians.map((user) => (
          <Card key={user.id} sx={{ p: 2 }}><Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar>{user.name[0]?.toUpperCase()}</Avatar>
            <Stack sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 700 }}>{user.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography></Stack>
            <Chip size="small" label={user.role === "ADMIN" ? "Admin" : "Technician"} />
            <Tooltip title="Reset password"><IconButton color="warning" onClick={() => setResetTarget(user)}><LockResetOutlined /></IconButton></Tooltip>
            <Tooltip title="Delete user"><span><IconButton color="error" disabled={user.id === auth.technician?.id} onClick={() => void users.remove(user)}><DeleteOutline /></IconButton></span></Tooltip>
          </Stack></Card>
        ))}</Stack>
      )}
      <CreateTechnicianDialog key={isCreateOpen ? "open" : "closed"} open={isCreateOpen} error={users.error} isSaving={users.isSaving} onClose={() => setIsCreateOpen(false)} onCreate={async (input) => { if (await users.create(input)) setIsCreateOpen(false); }} />
      {resetTarget && <ResetPasswordDialog open technicianId={resetTarget.id} technicianName={resetTarget.name} onClose={() => setResetTarget(null)} onReset={users.resetPassword} />}
    </Container>
  );
}
