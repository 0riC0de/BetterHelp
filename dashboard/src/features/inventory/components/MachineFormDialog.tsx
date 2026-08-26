"use client";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
} from "@mui/material";
import { useState, type FormEvent } from "react";

import type { MachineInput } from "../model";
import { toMachineInput } from "../helpers/toMachineInput";
import type { MachineFormDialogProps } from "./MachineFormDialogProps";

export default function MachineFormDialog(props: MachineFormDialogProps) {
  const [input, setInput] = useState<MachineInput>(toMachineInput(props.machine));

  function update(field: keyof MachineInput, value: unknown): void {
    setInput((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await props.onSave(input);
  }

  const title = props.machine ? "Edit machine" : "Add machine";

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={(event) => void submit(event)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {props.error && <Alert severity="error">{props.error}</Alert>}
            <TextField label="Asset tag" value={input.assetTag} onChange={(e) => update("assetTag", e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Name" value={input.name} onChange={(e) => update("name", e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Department" value={input.department} onChange={(e) => update("department", e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Location" value={input.location} onChange={(e) => update("location", e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="MAC address" value={input.macAddress} onChange={(e) => update("macAddress", e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" required slotProps={{ inputLabel: { shrink: true } }} />
            <Stack direction="row" spacing={2}>
              <TextField label="Broadcast" value={input.broadcastAddress} onChange={(e) => update("broadcastAddress", e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="WOL port" type="number" value={input.wolPort} onChange={(e) => update("wolPort", Number(e.target.value))} sx={{ width: 120 }} slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              <FormControlLabel control={<Checkbox checked={input.hasProjector} onChange={(e) => update("hasProjector", e.target.checked)} />} label="Projector" />
              <FormControlLabel control={<Checkbox checked={input.hasPrinter} onChange={(e) => update("hasPrinter", e.target.checked)} />} label="Printer" />
              <FormControlLabel control={<Checkbox checked={input.hasMonitor} onChange={(e) => update("hasMonitor", e.target.checked)} />} label="Monitor" />
              <FormControlLabel control={<Checkbox checked={input.hasSpeakers} onChange={(e) => update("hasSpeakers", e.target.checked)} />} label="Speakers" />
            </Stack>
            <TextField label="Notes" value={input.notes} onChange={(e) => update("notes", e.target.value)} multiline minRows={2} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={props.isSaving}>
            {props.isSaving ? "Saving..." : props.machine ? "Save changes" : "Add machine"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
