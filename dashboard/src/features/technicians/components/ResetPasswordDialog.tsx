"use client";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import type { ResetPasswordDialogProps } from "./ResetPasswordDialogProps";

export default function ResetPasswordDialog({ open, technicianId, technicianName, onClose, onReset }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onReset(technicianId, password);
      setSuccess(true);
      setPassword("");
      setTimeout(() => { onClose(); setSuccess(false); }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password could not be reset");
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose(): void {
    setPassword("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={(event) => void submit(event)}>
        <DialogTitle>Reset password for {technicianName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">Password updated.</Alert>}
            <TextField
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="At least 12 characters"
              required
              autoFocus
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSaving || success}>
            {isSaving ? "Saving..." : "Reset password"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
