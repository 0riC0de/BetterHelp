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

import type { Machine, MachineInput } from "@/types/machine";

interface MachineFormDialogProps {
  open: boolean;
  machine: Machine | null;
  error: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: MachineInput) => Promise<void>;
}

function toInput(machine: Machine | null): MachineInput {
  if (!machine) {
    return {
      assetTag: "",
      name: "",
      location: "",
      department: "",
      macAddress: "",
      broadcastAddress: "255.255.255.255",
      wolPort: 9,
      hasProjector: false,
      hasPrinter: false,
      hasMonitor: false,
      hasSpeakers: false,
      notes: "",
    };
  }
  return {
    assetTag: machine.assetTag,
    name: machine.name,
    location: machine.location,
    department: machine.department.name,
    macAddress: machine.macAddress,
    broadcastAddress: machine.broadcastAddress,
    wolPort: machine.wolPort,
    hasProjector: machine.hasProjector,
    hasPrinter: machine.hasPrinter,
    hasMonitor: machine.hasMonitor,
    hasSpeakers: machine.hasSpeakers,
    notes: machine.notes ?? "",
  };
}

export default function MachineFormDialog(props: MachineFormDialogProps) {
  const [input, setInput] = useState<MachineInput>(toInput(props.machine));

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
