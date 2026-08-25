import { Box, Chip, Stack, Typography } from "@mui/material";

import type { TicketMessage } from "@/types/ticket";
import { formatAbsoluteTime } from "@/utils/tickets";

export default function MessageBubble({ message }: { message: TicketMessage }) {
  const outbound = message.direction === "OUTBOUND";
  return (
    <Box sx={{ alignSelf: outbound ? "flex-end" : "flex-start", maxWidth: "78%" }}>
      <Box
        dir="auto"
        sx={{
          bgcolor: outbound ? "primary.main" : "grey.100",
          color: outbound ? "primary.contrastText" : "text.primary",
          borderRadius: outbound ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          px: 2,
          py: 1.25,
          overflowWrap: "anywhere",
        }}
      >
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{message.body}</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, justifyContent: outbound ? "flex-end" : "flex-start" }}>
        <Typography variant="caption" color="text.secondary">
          {message.technicianName ?? (outbound ? "Helpdesk" : "Reporter")} · {formatAbsoluteTime(message.sentAt ?? message.createdAt)}
        </Typography>
        {message.deliveryStatus === "FAILED" && <Chip label="Failed" color="error" size="small" />}
        {message.deliveryStatus === "PENDING" && <Chip label="Sending" size="small" />}
      </Stack>
    </Box>
  );
}
