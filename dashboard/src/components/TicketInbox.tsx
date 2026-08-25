import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { Box, InputAdornment, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

import type { Ticket } from "@/types/ticket";

import TicketListItem from "./TicketListItem";

interface TicketInboxProps {
  tickets: Ticket[];
  selectedId: number | null;
  mode: "inbox" | "archived";
  search: string;
  now: number;
  onModeChange: (mode: "inbox" | "archived") => void;
  onSearchChange: (search: string) => void;
  onSelect: (ticketId: number) => void;
  onArchive?: (ticketId: number) => void;
  onUnarchive?: (ticketId: number) => void;
}

export default function TicketInbox(props: TicketInboxProps) {
  return (
    <Box sx={{ minWidth: 0, height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6">Tickets</Typography>
        <Tabs value={props.mode} onChange={(_event, value) => props.onModeChange(value)} variant="fullWidth" sx={{ mt: 1 }}>
          <Tab value="inbox" label="Inbox" />
          <Tab value="archived" label="Archived" icon={<ArchiveOutlined />} iconPosition="start" />
        </Tabs>
        <TextField
          fullWidth
          size="small"
          label="Search conversations"
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          sx={{ mt: 1.5 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> } }}
        />
      </Box>
      <Stack sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {props.tickets.map((ticket) => (
          <TicketListItem
            key={ticket.id}
            ticket={ticket}
            selected={ticket.id === props.selectedId}
            now={props.now}
            onSelect={() => props.onSelect(ticket.id)}
            {...(props.onArchive && { onArchive: () => props.onArchive!(ticket.id) })}
            {...(props.onUnarchive && { onUnarchive: () => props.onUnarchive!(ticket.id) })}
          />
        ))}
        {!props.tickets.length && (
          <Stack sx={{ flex: 1, alignItems: "center", justifyContent: "center", p: 3, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>No {props.mode} tickets</Typography>
            <Typography variant="body2" color="text.secondary">Try a different search.</Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
