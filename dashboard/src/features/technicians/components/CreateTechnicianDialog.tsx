"use client";

import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { useState, type FormEvent } from "react";

import type { TechnicianRole } from "@/types/auth";
import type { CreateTechnicianDialogProps } from "./CreateTechnicianDialogProps";

export default function CreateTechnicianDialog(props: CreateTechnicianDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TechnicianRole>("TECHNICIAN");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onCreate({ name, email, password, role });
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={(event) => void submit(event)}>
        <DialogTitle>Create user</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {props.error && <Alert severity="error">{props.error}</Alert>}
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="At least 12 characters" required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField select label="Role" value={role} onChange={(e) => setRole(e.target.value as TechnicianRole)} slotProps={{ inputLabel: { shrink: true } }}>
              <MenuItem value="TECHNICIAN">Technician</MenuItem>
              <MenuItem value="ADMIN">Administrator</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={props.isSaving}>
            {props.isSaving ? "Creating..." : "Create user"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
