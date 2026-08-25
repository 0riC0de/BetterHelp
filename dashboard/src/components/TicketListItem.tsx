import { Box, ListItemButton, Stack, Typography } from "@mui/material";

import type { Ticket } from "@/types/ticket";
import { formatRelativeTime } from "@/utils/tickets";

import ContactAvatar from "./ContactAvatar";
import StatusChip from "./StatusChip";

interface TicketListItemProps {
  ticket: Ticket;
  selected: boolean;
  now: number;
  onSelect: () => void;
}

export default function TicketListItem({ ticket, selected, now, onSelect }: TicketListItemProps) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onSelect}
      sx={{ alignItems: "flex-start", gap: 1.5, px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <ContactAvatar ticket={ticket} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.userName ?? ticket.userPhone}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {formatRelativeTime(ticket.updatedAt, now)}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" noWrap>
          {ticket.summary ?? ticket.rawMessage}
        </Typography>
        <Box sx={{ mt: 0.75 }}><StatusChip status={ticket.status} /></Box>
      </Box>
    </ListItemButton>
  );
}
