import CheckCircleOutline from "@mui/icons-material/CheckCircleOutlineOutlined";
import ReplayOutlined from "@mui/icons-material/ReplayOutlined";
import ChatOutlined from "@mui/icons-material/ChatOutlined";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Link from "next/link";

import type { Ticket, TicketStatus } from "@/types/ticket";
import {
  formatAbsoluteTime,
  formatRelativeTime,
} from "@/utils/tickets";

import TicketContact from "./TicketContact";
import TicketDetails from "./TicketDetails";
import TicketTriage from "./TicketTriage";

interface TicketCardProps {
  ticket: Ticket;
  now: number;
  isPending: boolean;
  onStatusChange: (ticketId: number, status: TicketStatus) => Promise<void>;
}

export default function TicketCard({
  ticket,
  now,
  isPending,
  onStatusChange,
}: TicketCardProps) {
  const isResolved = ticket.status === "resolved";
  const nextStatus: TicketStatus = isResolved ? "open" : "resolved";

  return (
    <Card component="article" sx={{ overflow: "hidden" }}>
      <CardContent>
        <Stack spacing={2.25}>
          <TicketContact ticket={ticket} />

          <Box>
            <Typography variant="overline" color="text.secondary">
              AI issue summary
            </Typography>
            <Typography variant="h6" dir="auto" sx={{ fontSize: { xs: 17, sm: 19 } }}>
              {ticket.summary ?? <Skeleton width="72%" />}
            </Typography>
          </Box>

          <TicketTriage ticket={ticket} />

          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Tooltip title={formatAbsoluteTime(ticket.createdAt)}>
              <Typography variant="caption" color="text.secondary">
                Created {formatRelativeTime(ticket.createdAt, now)}
              </Typography>
            </Tooltip>
            {ticket.resolvedAt && (
              <Tooltip title={formatAbsoluteTime(ticket.resolvedAt)}>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                  Resolved {formatRelativeTime(ticket.resolvedAt, now)}
                </Typography>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>

      <TicketDetails ticket={ticket} />
      <CardActions sx={{ justifyContent: "flex-end", flexWrap: "wrap", px: 2, py: 1.5 }}>
        <Button component={Link} href={`/tickets/${ticket.id}`} startIcon={<ChatOutlined />}>
          Conversation
        </Button>
        <Button
          variant={isResolved ? "outlined" : "contained"}
          color={isResolved ? "primary" : "success"}
          disabled={isPending}
          startIcon={
            isResolved ? (
              <ReplayOutlined />
            ) : (
              <CheckCircleOutline />
            )
          }
          onClick={() => void onStatusChange(ticket.id, nextStatus)}
        >
          {isResolved ? "Reopen" : "Resolve Ticket"}
        </Button>
      </CardActions>
    </Card>
  );
}
