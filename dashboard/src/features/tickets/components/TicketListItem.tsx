import ArchiveOutlined from "@mui/icons-material/ArchiveOutlined";
import { Box, Chip, ListItemButton, Stack, Typography } from "@mui/material";
import { useRef, useState } from "react";

import { formatRelativeTime } from "../helpers/formatRelativeTime";

import ContactAvatar from "./ContactAvatar";
import type { TicketListItemProps } from "./TicketListItemProps";

const SWIPE_THRESHOLD = 80;

export default function TicketListItem({ ticket, selected, now, onSelect, onArchive, onUnarchive }: TicketListItemProps) {
  const touchStart = useRef(0);
  const didSwipe = useRef(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const isArchived = Boolean(ticket.archivedAt);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    const touch = e.touches.item(0);
    if (touch) touchStart.current = touch.clientX;
    didSwipe.current = false;
    setSwipeOffset(0);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    const touch = e.touches.item(0);
    if (!touch) return;
    const delta = touch.clientX - touchStart.current;
    if (Math.abs(delta) > 10) didSwipe.current = true;
    setSwipeOffset(delta);
  }

  function handleTouchEnd(): void {
    if (Math.abs(swipeOffset) >= SWIPE_THRESHOLD) {
      if (swipeOffset < 0 && onArchive && !isArchived) onArchive();
      if (swipeOffset > 0 && onUnarchive && isArchived) onUnarchive();
    }
    setSwipeOffset(0);
  }

  const showArchiveHint = swipeOffset < 0 && !isArchived && Math.abs(swipeOffset) > 10;
  const showUnarchiveHint = swipeOffset > 0 && isArchived && Math.abs(swipeOffset) > 10;

  return (
    <Box
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      sx={{ position: "relative", overflow: "hidden", touchAction: "pan-y" }}
    >
      {/* Archive hint background */}
      {showArchiveHint && (
        <Box
          sx={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "text.secondary",
            zIndex: 0,
          }}
        >
          <ArchiveOutlined fontSize="small" />
          <Typography variant="caption">Archive</Typography>
        </Box>
      )}
      {showUnarchiveHint && (
        <Box
          sx={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "text.secondary",
            zIndex: 0,
          }}
        >
          <ArchiveOutlined fontSize="small" />
          <Typography variant="caption">Unarchive</Typography>
        </Box>
      )}
      <ListItemButton
        selected={selected}
        onClick={() => {
          if (!didSwipe.current) onSelect();
          didSwipe.current = false;
        }}
        sx={{
          alignItems: "flex-start",
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderBottom: 1,
          borderColor: "divider",
          position: "relative",
          zIndex: swipeOffset !== 0 ? 1 : undefined,
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset * 0.3}px)` : undefined,
          transition: swipeOffset === 0 ? "transform 0.15s ease-out" : undefined,
        }}
      >
        <ContactAvatar ticket={ticket} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticket.userName ?? ticket.userPhone}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
              {formatRelativeTime(ticket.updatedAt, now)}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ticket.summary ?? ticket.rawMessage}
          </Typography>
          <Chip
            size="small"
            label={ticket.queue?.name ?? "Unassigned"}
            variant={ticket.queue ? "filled" : "outlined"}
            sx={{
              mt: 0.75,
              maxWidth: "100%",
              alignSelf: "flex-start",
              ...(ticket.queue ? { bgcolor: ticket.queue.color, color: "common.white" } : {}),
            }}
          />
        </Box>
      </ListItemButton>
    </Box>
  );
}
