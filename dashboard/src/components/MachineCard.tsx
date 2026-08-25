import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PowerSettingsNewOutlined from "@mui/icons-material/PowerSettingsNewOutlined";
import { Box, Card, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";

import type { Machine } from "@/types/machine";

interface MachineCardProps {
  machine: Machine;
  waking: boolean;
  onWake: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function MachineCard({ machine, waking, onWake, onEdit, onDelete }: MachineCardProps) {
  return (
    <Card sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{machine.name}</Typography>
            <Chip size="small" label={machine.assetTag} variant="outlined" />
            <Chip size="small" label={machine.department.name} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {machine.location} &middot; {machine.macAddress}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
            {machine.hasProjector && <Chip size="small" label="Projector" variant="outlined" />}
            {machine.hasPrinter && <Chip size="small" label="Printer" variant="outlined" />}
            {machine.hasMonitor && <Chip size="small" label="Monitor" variant="outlined" />}
            {machine.hasSpeakers && <Chip size="small" label="Speakers" variant="outlined" />}
          </Stack>
        </Box>
        <Tooltip title="Wake-on-LAN">
          <span>
            <IconButton color="success" disabled={waking} onClick={onWake} aria-label={`Wake ${machine.name}`}>
              <PowerSettingsNewOutlined />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Edit machine">
          <span>
            <IconButton onClick={onEdit} aria-label={`Edit ${machine.name}`}>
              <EditOutlined />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete machine">
          <span>
            <IconButton color="error" onClick={onDelete} aria-label={`Delete ${machine.name}`}>
              <DeleteOutline />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Card>
  );
}
