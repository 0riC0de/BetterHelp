import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import HourglassTopOutlined from "@mui/icons-material/HourglassTopOutlined";
import MarkEmailUnreadOutlined from "@mui/icons-material/MarkEmailUnreadOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import { Box, Stack, Typography } from "@mui/material";

import type { Ticket } from "@/types/ticket";
import { getTicketMetrics } from "@/utils/tickets";

export default function MetricsOverview({ tickets }: { tickets: readonly Ticket[] }) {
  const metrics = getTicketMetrics(tickets);
  const items = [
    { label: "Active", value: metrics.active, icon: <AssignmentOutlined />, color: "#0f5e8c" },
    { label: "Open", value: metrics.open, icon: <MarkEmailUnreadOutlined />, color: "#d97706" },
    { label: "In progress", value: metrics.inProgress, icon: <HourglassTopOutlined />, color: "#7c3aed" },
    { label: "Resolved today", value: metrics.resolvedToday, icon: <TaskAltOutlined />, color: "#15803d" },
  ];
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1.5, overflowX: "auto", pb: 0.5 }}>
      {items.map((item) => (
        <Stack
          key={item.label}
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 150, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 2, px: 1.5, py: 1 }}
        >
          <Box sx={{ color: item.color, display: "flex" }}>{item.icon}</Box>
          <Box><Typography variant="caption" color="text.secondary">{item.label}</Typography><Typography sx={{ fontWeight: 800 }}>{item.value}</Typography></Box>
        </Stack>
      ))}
    </Stack>
  );
}
