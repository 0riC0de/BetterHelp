import ComputerOutlined from "@mui/icons-material/ComputerOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import WhatsApp from "@mui/icons-material/WhatsApp";
import { Avatar, Box, Chip, Link, Stack, Typography } from "@mui/material";

import type { Ticket } from "@/types/ticket";
import { formatPhoneNumber, getWhatsAppUrl } from "@/utils/tickets";

import StatusChip from "./StatusChip";

export default function TicketContact({ ticket }: { ticket: Ticket }) {
  const whatsAppUrl = getWhatsAppUrl(ticket.userPhone);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Avatar
          component="a"
          href={whatsAppUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open WhatsApp conversation with ${ticket.userName ?? "sender"}`}
          sx={{ bgcolor: "#e8f9ef", color: "#25D366" }}
        >
          <WhatsApp />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {ticket.userName ?? "Unknown Sender"}
          </Typography>
          <Link
            href={whatsAppUrl}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            color="text.secondary"
            variant="body2"
          >
            {formatPhoneNumber(ticket.userPhone)}
          </Link>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        {ticket.pcNumber === null ? (
          <Chip
            size="small"
            icon={<WarningAmberOutlined />}
            label="PC Unassigned"
            sx={{ bgcolor: "#ffedd5", color: "#9a3412" }}
          />
        ) : (
          <Chip
            size="small"
            icon={<ComputerOutlined />}
            label={`PC #${ticket.pcNumber}`}
            sx={{ bgcolor: "#eef2ff", color: "#4338ca" }}
          />
        )}
        <StatusChip status={ticket.status} />
      </Stack>
    </Stack>
  );
}
