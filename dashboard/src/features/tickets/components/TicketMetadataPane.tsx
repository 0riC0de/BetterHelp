import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import { Box, Button, Divider, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import { formatAbsoluteTime } from "../helpers/formatAbsoluteTime";
import { formatPhoneNumber } from "../helpers/formatPhoneNumber";
import type { TicketMetadataPaneProps } from "./TicketMetadataPaneProps";
import { updateTicketQueue } from "../api/ticketApi";

import { useQueues } from "@/features/queues/hooks/useQueues";

import ContactAvatar from "./ContactAvatar";
import StatusChip from "./StatusChip";
import TicketTriage from "./TicketTriage";

export default function TicketMetadataPane(props: TicketMetadataPaneProps) {
  const { ticket } = props;
  const queues = useQueues();
  const [queueValue, setQueueValue] = useState(ticket.queue ? String(ticket.queue.id) : "unassigned");
  const [queuePending, setQueuePending] = useState(false);

  useEffect(() => {
    setQueueValue(ticket.queue ? String(ticket.queue.id) : "unassigned");
  }, [ticket.queue?.id]);

  async function handleQueueChange(value: string): Promise<void> {
    const previousValue = queueValue;
    setQueueValue(value);
    setQueuePending(true);
    try {
      await updateTicketQueue(ticket.id, value === "unassigned" ? null : Number(value));
    } catch {
      setQueueValue(previousValue);
    } finally {
      setQueuePending(false);
      void queues.refresh();
    }
  }
  return (
    <Box sx={{ height: "100%", overflowY: "auto", bgcolor: "background.paper", borderLeft: 1, borderColor: "divider", p: 2.5 }}>
      <Stack spacing={2.25}>
        <Stack sx={{ alignItems: "center", textAlign: "center" }}>
          <ContactAvatar ticket={ticket} size={64} />
          <Typography variant="h6" sx={{ mt: 1 }}>{ticket.userName ?? "Unknown reporter"}</Typography>
          <Typography variant="body2" color="text.secondary">{formatPhoneNumber(ticket.userPhone)}</Typography>
        </Stack>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="overline" color="text.secondary">Status</Typography>
          <StatusChip status={ticket.status} />
        </Stack>
        <Box>
          <Typography variant="overline" color="text.secondary">Queue</Typography>
          <Select
            fullWidth
            size="small"
            value={queueValue}
            disabled={props.pending || queuePending || queues.isLoading}
            onChange={(event) => void handleQueueChange(String(event.target.value))}
            sx={{ mt: 0.75 }}
          >
            <MenuItem value="unassigned">Unassigned</MenuItem>
            {queues.queues.map((queue) => (
              <MenuItem key={queue.id} value={String(queue.id)}>{queue.name}</MenuItem>
            ))}
          </Select>
        </Box>
        <TicketTriage ticket={ticket} />
        <Box><Typography variant="overline" color="text.secondary">Issue</Typography><Typography dir="auto">{ticket.summary ?? ticket.rawMessage}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Workstation</Typography><Typography>{ticket.pcNumber === null ? "Not identified" : `PC #${ticket.pcNumber}`}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Created</Typography><Typography variant="body2">{formatAbsoluteTime(ticket.createdAt)}</Typography></Box>
        <Divider />
        {ticket.archivedAt ? (
          <Button startIcon={<UnarchiveOutlined />} disabled={props.pending} onClick={() => void props.onArchiveChange(false)}>Unarchive ticket</Button>
        ) : ticket.status === "resolved" ? (
          <Stack spacing={1}>
            <Button variant="outlined" onClick={() => void props.onStatusChange("open")} disabled={props.pending}>Reopen</Button>
            <Button startIcon={<ArchiveOutlined />} onClick={() => void props.onArchiveChange(true)} disabled={props.pending}>Archive</Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {ticket.status === "open" && <Button variant="outlined" onClick={() => void props.onStatusChange("in_progress")} disabled={props.pending}>Start work</Button>}
            <Button variant="contained" color="success" onClick={() => void props.onStatusChange("resolved")} disabled={props.pending}>Resolve ticket</Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
