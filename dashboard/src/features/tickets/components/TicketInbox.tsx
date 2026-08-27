import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { Box, Button, MenuItem, InputAdornment, Select, Stack, TextField, Typography } from "@mui/material";

import TicketListItem from "./TicketListItem";
import type { TicketInboxProps } from "./TicketInboxProps";

export default function TicketInbox(props: TicketInboxProps) {
  return (
    <Box sx={{ minWidth: 0, height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.paper", borderRight: 1, borderColor: "divider" }}>
      <Box sx={{ flexShrink: 0, p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6">Tickets</Typography>
        <TextField
          fullWidth
          size="small"
          label="Search conversations"
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          sx={{ mt: 1.5 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> } }}
        />
        <Select
          fullWidth
          size="small"
          value={props.queueFilter}
          onChange={(event) => props.onQueueFilterChange(String(event.target.value))}
          sx={{ mt: 1.25 }}
        >
          <MenuItem value="all">All queues</MenuItem>
          <MenuItem value="unassigned">Unassigned</MenuItem>
          {props.queues.map((queue) => (
            <MenuItem key={queue.id} value={String(queue.id)}>{queue.name}</MenuItem>
          ))}
        </Select>
      </Box>
      <Stack sx={{ flex: "1 1 0", height: 0, minHeight: 0, overflowX: "hidden", overflowY: "scroll", overscrollBehavior: "contain", scrollbarGutter: "stable", "& > *": { flexShrink: 0 } }}>
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
      <Box sx={{ flexShrink: 0, p: 1, borderTop: 1, borderColor: "divider" }}>
        <Button
          fullWidth
          size="small"
          color="inherit"
          startIcon={props.mode === "inbox" ? <ArchiveOutlined /> : <ForumOutlined />}
          onClick={() => props.onModeChange(props.mode === "inbox" ? "archived" : "inbox")}
        >
          {props.mode === "inbox" ? "Archived chats" : "Back to chats"}
        </Button>
      </Box>
    </Box>
  );
}
