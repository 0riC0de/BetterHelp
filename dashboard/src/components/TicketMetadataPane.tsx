import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlined from "@mui/icons-material/UnarchiveOutlined";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";

import type { Ticket, TicketStatus } from "@/types/ticket";
import { formatAbsoluteTime, formatPhoneNumber } from "@/utils/tickets";

import ContactAvatar from "./ContactAvatar";
import StatusChip from "./StatusChip";
import TicketTriage from "./TicketTriage";

interface TicketMetadataPaneProps {
  ticket: Ticket;
  pending: boolean;
  onStatusChange: (status: TicketStatus) => Promise<void>;
  onArchiveChange: (archived: boolean) => Promise<void>;
}

export default function TicketMetadataPane(props: TicketMetadataPaneProps) {
  const { ticket } = props;
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
